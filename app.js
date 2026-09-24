/**
 * app.js — Core Data Layer (localStorage) & Global Utilities
 * Grace College Exam Seating ERP
 *
 * Replaces core.php + MySQL with browser localStorage.
 * Provides: DB, Halls, Students, SeatAllocations CRUD, Utility functions
 */

// ═══════════════════════════════════════════════════════════════
// LOCAL STORAGE DATABASE LAYER
// ═══════════════════════════════════════════════════════════════
const DB = {
    get(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    },
    set(key, val) {
        localStorage.setItem(key, JSON.stringify(val));
    },
    remove(key) { localStorage.removeItem(key); }
};

// ═══════════════════════════════════════════════════════════════
// HALLS MODULE
// ═══════════════════════════════════════════════════════════════
const Halls = {
    KEY: 'erp_halls',

    getAll() {
        let halls = DB.get(this.KEY);
        if (!halls || halls.length === 0) {
            halls = this._defaults();
            DB.set(this.KEY, halls);
        }
        return halls;
    },

    getNames() {
        return this.getAll().map(h => h.hall_no).sort();
    },

    getGrouped() {
        const halls = this.getAll();
        const groups = {};
        halls.forEach(h => {
            const cat = h.category || 'Other Venues';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(h);
        });
        return groups;
    },

    add(hall_no, category) {
        const halls = this.getAll();
        if (halls.some(h => h.hall_no === hall_no)) return { ok: false, error: `Hall '${hall_no}' already exists.` };

        let icon = '🏢', badge_label = 'OTHER', badge_bg = '#ede9fe', badge_color = '#4c1d95';
        if (category === 'Exam Halls')    { icon = '🏛️'; badge_label = 'EXAM';  badge_bg = '#e8f0fe'; badge_color = '#3b5bdb'; }
        if (category === 'Reading Halls') { icon = '📖'; badge_label = 'READ';  badge_bg = '#e6f4ea'; badge_color = '#2e7d32'; }
        if (category === 'Lab Halls')     { icon = '🧪'; badge_label = 'LAB';   badge_bg = '#fef9c3'; badge_color = '#854d0e'; }

        const hall = { id: Date.now(), hall_no, category, icon, badge_label, badge_bg, badge_color, created_at: new Date().toISOString() };
        halls.push(hall);
        DB.set(this.KEY, halls);
        return { ok: true, ...hall };
    },

    _defaults() {
        return [
            { id: 1, hall_no: 'Exam Hall-1', category: 'Exam Halls', icon: '🏛️', badge_label: 'EXAM', badge_bg: '#e8f0fe', badge_color: '#3b5bdb' },
            { id: 2, hall_no: 'Exam Hall-2', category: 'Exam Halls', icon: '🏛️', badge_label: 'EXAM', badge_bg: '#e8f0fe', badge_color: '#3b5bdb' },
            { id: 3, hall_no: 'Exam Hall-3', category: 'Exam Halls', icon: '🏛️', badge_label: 'EXAM', badge_bg: '#e8f0fe', badge_color: '#3b5bdb' },
            { id: 4, hall_no: 'Exam Hall-4', category: 'Exam Halls', icon: '🏛️', badge_label: 'EXAM', badge_bg: '#e8f0fe', badge_color: '#3b5bdb' },
            { id: 5, hall_no: 'Exam Hall-5', category: 'Exam Halls', icon: '🏛️', badge_label: 'EXAM', badge_bg: '#e8f0fe', badge_color: '#3b5bdb' },
            { id: 6, hall_no: 'Reading Hall-1', category: 'Reading Halls', icon: '📖', badge_label: 'READ', badge_bg: '#e6f4ea', badge_color: '#2e7d32' },
            { id: 7, hall_no: 'Reading Hall-2', category: 'Reading Halls', icon: '📖', badge_label: 'READ', badge_bg: '#e6f4ea', badge_color: '#2e7d32' },
            { id: 8, hall_no: 'Reading Hall-3', category: 'Reading Halls', icon: '📖', badge_label: 'READ', badge_bg: '#e6f4ea', badge_color: '#2e7d32' },
            { id: 9, hall_no: 'Lab Hall-1', category: 'Lab Halls', icon: '🧪', badge_label: 'LAB', badge_bg: '#fef9c3', badge_color: '#854d0e' },
            { id: 10, hall_no: 'Lab Hall-2', category: 'Lab Halls', icon: '🧪', badge_label: 'LAB', badge_bg: '#fef9c3', badge_color: '#854d0e' },
            { id: 11, hall_no: 'Seminar Hall', category: 'Other Venues', icon: '🎤', badge_label: 'EVENT', badge_bg: '#ede9fe', badge_color: '#4c1d95' },
            { id: 12, hall_no: 'Conference Hall', category: 'Other Venues', icon: '🤝', badge_label: 'EVENT', badge_bg: '#ede9fe', badge_color: '#4c1d95' },
        ];
    }
};

// ═══════════════════════════════════════════════════════════════
// STUDENTS MODULE
// ═══════════════════════════════════════════════════════════════
const Students = {
    KEY: 'erp_students',

    getAll() {
        let list = DB.get(this.KEY);
        if (!list || list.length === 0) {
            list = this._defaults();
            DB.set(this.KEY, list);
        }
        return list.filter(s => {
            const st = (s.stu_status || '').toLowerCase();
            return !st.includes('discontinu') && !st.includes('complete');
        });
    },

    find(reg_no) {
        if (!reg_no) return null;
        const all = this.getAll();
        return all.find(s => s.stu_regno === reg_no || (s.stu_regno && s.stu_regno.endsWith(reg_no))) || null;
    },

    findBatch(reg_nos) {
        const all = this.getAll();
        const map = {};
        reg_nos.forEach(r => {
            if (!r) return;
            let s = all.find(st => st.stu_regno === r);
            if (!s && r.length < 12) {
                s = all.find(st => st.stu_regno && st.stu_regno.endsWith(r));
            }
            if (s) {
                map[r] = s;
            }
        });
        return map;
    },

    search(filters = {}) {
        let students = this.getAll();
        if (filters.name) {
            const q = filters.name.toLowerCase();
            students = students.filter(s => {
                const full = getStudentFullName(s).toLowerCase();
                return full.includes(q);
            });
        }
        if (filters.regno) {
            students = students.filter(s => (s.stu_regno || '').includes(filters.regno));
        }
        if (filters.dept) {
            const code = DEPT_TO_CODE[filters.dept];
            students = students.filter(s => {
                const d = s.stu_dept || getStudentDept(s.stu_regno);
                if (code) return d === filters.dept || (s.stu_regno || '').substring(6, 9) === code;
                return d === filters.dept;
            });
        }
        return students.sort((a, b) => (a.stu_regno || '').localeCompare(b.stu_regno || ''));
    },

    add(reg_no, fname, lname, dept) {
        const students = DB.get(this.KEY) || this._defaults();
        if (students.some(s => s.stu_regno === reg_no)) return { ok: false, error: `Student ${reg_no} already exists!` };
        students.push({
            stu_id: 'stu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            stu_regno: reg_no, stu_fname: fname, stu_lname: lname, stu_dept: dept, stu_status: 'Active'
        });
        DB.set(this.KEY, students);
        return { ok: true };
    },

    update(reg_no, fname, lname, dept) {
        const students = DB.get(this.KEY) || this._defaults();
        const idx = students.findIndex(s => s.stu_regno === reg_no);
        if (idx === -1) return { ok: false, error: 'Student not found.' };
        students[idx] = { ...students[idx], stu_fname: fname, stu_lname: lname, stu_dept: dept, stu_status: 'Active' };
        DB.set(this.KEY, students);
        return { ok: true };
    },

    count() { return this.getAll().length; },

    _defaults() {
        return getComprehensiveDefaultStudents();
    }
};

// ═══════════════════════════════════════════════════════════════
// SEAT ALLOCATIONS MODULE
// ═══════════════════════════════════════════════════════════════
const SeatAllocations = {
    KEY: 'erp_seat_allocations',

    getAll() { return DB.get(this.KEY) || []; },

    /**
     * Get grouped plans (unique hall+date+type+session+time combos)
     */
    getPlans(filters = {}) {
        let allocs = this.getAll();

        if (filters.exam_date) allocs = allocs.filter(a => a.exam_date === filters.exam_date);
        if (filters.exam_type) allocs = allocs.filter(a => a.exam_type === filters.exam_type);
        if (filters.session) allocs = allocs.filter(a => a.session === filters.session);
        if (filters.hall_no) allocs = allocs.filter(a => a.hall_no === filters.hall_no);

        const planMap = {};
        allocs.forEach(a => {
            const key = `${a.hall_no}|${a.exam_date}|${a.exam_type}|${a.session}|${a.from_time||''}|${a.to_time||''}`;
            if (!planMap[key]) {
                planMap[key] = {
                    hall_no: a.hall_no, exam_date: a.exam_date, exam_type: a.exam_type,
                    session: a.session, from_time: a.from_time || '', to_time: a.to_time || '',
                    left_count: 0, right_count: 0
                };
            }
            if (a.section === 'LEFT' && a.reg_no) planMap[key].left_count++;
            if (a.section === 'RIGHT' && a.reg_no) planMap[key].right_count++;
        });

        return Object.values(planMap).sort((a, b) => {
            if (a.exam_date !== b.exam_date) return b.exam_date.localeCompare(a.exam_date);
            return a.hall_no.localeCompare(b.hall_no);
        });
    },

    /**
     * Get seat details for a specific plan
     */
    getSeats(hall_no, exam_date, exam_type, session, from_time, to_time) {
        return this.getAll().filter(a =>
            a.hall_no === hall_no && a.exam_date === exam_date && a.exam_type === exam_type &&
            (exam_type === 'University' ? a.session === session : (a.from_time === from_time && a.to_time === to_time))
        );
    },

    /**
     * Save a plan (delete old if editing, insert new seats)
     */
    savePlan(seats, origPlan = null) {
        let allocs = this.getAll();

        // Remove old plan if editing
        if (origPlan) {
            allocs = allocs.filter(a => !this._matchesPlan(a, origPlan));
        }

        allocs.push(...seats);
        DB.set(this.KEY, allocs);
        return { ok: true, saved: seats.length };
    },

    /**
     * Delete a plan
     */
    deletePlan(plan) {
        let allocs = this.getAll();
        allocs = allocs.filter(a => !this._matchesPlan(a, plan));
        DB.set(this.KEY, allocs);
        return { ok: true };
    },

    /**
     * Check for duplicate/conflicts
     */
    checkConflicts(hall_no, exam_date, exam_type, session, from_time, to_time, left_nos, right_nos, origPlan) {
        const conflicts = [];
        const allocs = this.getAll().filter(a => {
            if (origPlan && this._matchesPlan(a, origPlan)) return false;
            return true;
        });

        // Hall conflict check
        if (hall_no && exam_date) {
            if (exam_type === 'University' && session) {
                const dup = allocs.some(a => a.hall_no === hall_no && a.exam_date === exam_date && a.exam_type === 'University' && a.session === session);
                if (dup) conflicts.push(`Hall <strong>${escapeHtml(hall_no)}</strong> is already allocated for <strong>${formatDate(exam_date)}</strong> (${session} session).`);
            } else if (exam_type === 'Internal' && from_time && to_time) {
                const overlapping = allocs.filter(a => a.hall_no === hall_no && a.exam_date === exam_date && a.exam_type === 'Internal' && a.from_time && a.to_time);
                const seen = new Set();
                for (const a of overlapping) {
                    const key = `${a.from_time}-${a.to_time}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    if (timeOverlap(from_time, to_time, a.from_time, a.to_time)) {
                        conflicts.push(`Hall <strong>${escapeHtml(hall_no)}</strong> has an overlapping Internal Exam allocation (Existing: <strong>${escapeHtml(a.from_time)} – ${escapeHtml(a.to_time)}</strong>) on <strong>${formatDate(exam_date)}</strong>.`);
                        break;
                    }
                }
            }
        }

        // Student duplicate check
        const all_nos = [...new Set([...left_nos, ...right_nos])];
        const combined = [...left_nos, ...right_nos];
        const seenInInput = {};
        combined.forEach(r => {
            if (seenInInput[r]) conflicts.push(`Student <strong>${r}</strong> is entered multiple times in this allocation.`);
            else seenInInput[r] = true;
        });

        if (all_nos.length > 0 && exam_date) {
            all_nos.forEach(reg => {
                const existing = allocs.filter(a => a.reg_no === reg && a.exam_date === exam_date);
                existing.forEach(a => {
                    if (exam_type === 'University' && a.session === session) {
                        conflicts.push(`Student <strong>${reg}</strong> is already allocated in <strong>${a.hall_no}</strong> for <strong>${formatDate(exam_date)}</strong> (${session} session).`);
                    } else if (exam_type === 'Internal' && from_time && to_time && a.from_time && a.to_time) {
                        if (timeOverlap(from_time, to_time, a.from_time, a.to_time)) {
                            conflicts.push(`Student <strong>${reg}</strong> is already allocated in <strong>${a.hall_no}</strong> for overlapping time (${a.from_time} – ${a.to_time}) on <strong>${formatDate(exam_date)}</strong>.`);
                        }
                    }
                });
            });
        }

        return [...new Set(conflicts)];
    },

    getDistinctDates() {
        const dates = new Set();
        this.getAll().forEach(a => dates.add(a.exam_date));
        return [...dates].sort().reverse();
    },

    _matchesPlan(a, plan) {
        if (a.hall_no !== plan.hall_no || a.exam_date !== plan.exam_date || a.exam_type !== plan.exam_type) return false;
        if (plan.exam_type === 'University') return a.session === plan.session;
        return a.from_time === plan.from_time && a.to_time === plan.to_time;
    }
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const DEPT_TO_CODE = {
    'AI&DS': '243', 'CSE': '104', 'EEE': '105', 'ECE': '106', 'MECH': '114',
    'CIVIL': '103', 'MBA': '631', 'M.E. Computer Engineering': '405',
    'M.E. Applied Electronic Engineering': '401', 'M.E. Power System and Engineering': '411'
};

const CODE_TO_DEPT = {};
Object.entries(DEPT_TO_CODE).forEach(([k, v]) => CODE_TO_DEPT[v] = k);

function getStudentDept(regno) {
    if (!regno || regno.length < 9) return '';
    const code = regno.substring(6, 9);
    return CODE_TO_DEPT[code] || '';
}

function getStudentFullName(stu) {
    if (!stu) return '';
    if (stu.full_name) return stu.full_name.trim();
    if (stu.name) return stu.name.trim();
    if (stu.stu_name) return stu.stu_name.trim();
    const fn = (stu.stu_fname || '').trim();
    const ln = (stu.stu_lname || '').trim();
    const combined = (fn + ' ' + ln).trim();
    if (combined) return combined;
    return 'Student ' + (stu.stu_regno || '').slice(-3);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

function formatDateDMY(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${String(d.getDate()).padStart(2,'0')} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
}

function timeToMinutes(t) {
    if (!t) return null;
    const parts = t.match(/(\d+):(\d+)/);
    if (!parts) return null;
    return parseInt(parts[1]) * 60 + parseInt(parts[2]);
}

function timeOverlap(fromA, toA, fromB, toB) {
    const sA = timeToMinutes(fromA), eA = timeToMinutes(toA);
    const sB = timeToMinutes(fromB), eB = timeToMinutes(toB);
    if (sA === null || eA === null || sB === null || eB === null) return false;
    return sA < eB && eA > sB;
}

function expandRegRange(raw, limit = 999) {
    if (!raw || !raw.trim()) return [];
    const results = [];
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);

    for (const part of parts) {
        if (results.length >= limit) break;
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-', 2).map(s => s.trim());
            if (/^\d+$/.test(startStr) && /^\d+$/.test(endStr)) {
                const len = startStr.length;
                const start = parseInt(startStr);
                let end;
                if (endStr.length < len) {
                    const prefix = startStr.substring(0, len - endStr.length);
                    end = parseInt(prefix + endStr);
                } else {
                    end = parseInt(endStr);
                }
                if (start <= end) {
                    for (let n = start; n <= end && results.length < limit; n++) {
                        results.push(String(n).padStart(len, '0'));
                    }
                }
            }
        } else if (/^\d+$/.test(part)) {
            results.push(part);
        }
    }
    return [...new Set(results)];
}

function compressRegNumbers(regNos) {
    if (!regNos || regNos.length === 0) return '';
    const sorted = [...new Set(regNos.map(r => r.trim()).filter(Boolean))].sort();
    if (sorted.length === 0) return '';

    const groups = [];
    let start = sorted[0], prev = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const curr = sorted[i];
        if (parseInt(curr) - parseInt(prev) === 1) {
            prev = curr;
        } else {
            groups.push(start === prev ? start : `${start}-${prev}`);
            start = curr;
            prev = curr;
        }
    }
    groups.push(start === prev ? start : `${start}-${prev}`);
    return groups.join(', ');
}

function formatSessionDisplay(plan) {
    if ((plan.exam_type || 'University') === 'Internal' && plan.from_time && plan.to_time) {
        return `${plan.from_time} – ${plan.to_time}`;
    }
    return plan.session || '';
}

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ═══════════════════════════════════════════════════════════════
// SEAT LAYOUT UTILITIES
// ═══════════════════════════════════════════════════════════════
const LAYOUT_OPTIONS = {
    '1': { label: 'Option 1 (A1–E5)', rows: [1,2,3,4,5] },
    '2': { label: 'Option 2 (A6–E10)', rows: [6,7,8,9,10] },
    '3': { label: 'Option 3 (A11–E15)', rows: [11,12,13,14,15] },
    '4': { label: 'Option 4 (A16–E20)', rows: [16,17,18,19,20] },
};
const COLS = ['A','B','C','D','E'];

function getSeatSets(layoutId) {
    const rows = LAYOUT_OPTIONS[layoutId || '1']?.rows || [1,2,3,4,5];
    const odd = [], even = [];
    COLS.forEach((c, ci) => {
        rows.forEach((r, ri) => {
            if ((ci % 2) === (ri % 2)) odd.push(c + r);
            else even.push(c + r);
        });
    });
    return { rows, odd, even, all: [...new Set([...odd, ...even])].sort() };
}

// ═══════════════════════════════════════════════════════════════
// SAMPLE DATA SEEDER
// ═══════════════════════════════════════════════════════════════
function getComprehensiveDefaultStudents() {
    const rawData = [
        // AI&DS
        ['950322243001', 'Alex', 'Matthew', 'AI&DS'],
        ['950322243002', 'Balamurugan', 'M', 'AI&DS'],
        ['950322243003', 'Daniel', 'Raja M', 'AI&DS'],
        ['950322243005', 'FELIX', 'SILVAN J', 'AI&DS'],
        ['950322243006', 'GURUROHITH', 'J', 'AI&DS'],
        ['950322243009', 'HARISH', 'BABU S', 'AI&DS'],
        ['950322243010', 'HARISH', 'MAHARAJAN M', 'AI&DS'],
        ['950322243011', 'HINDUJA', 'M', 'AI&DS'],
        ['950322243012', 'JEFFRIN', 'S', 'AI&DS'],
        ['950322243014', 'JOHN', 'ALLSON M', 'AI&DS'],
        ['950322243015', 'MUTHUSELVI', 'S', 'AI&DS'],
        ['950322243016', 'MUTHU', 'VIVEK S L', 'AI&DS'],
        ['950322243017', 'NARMATHA', 'SRI S', 'AI&DS'],
        ['950322243018', 'OSHAN', 'ABDUL HAQUE', 'AI&DS'],
        ['950322243020', 'RENUGA', 'SREE S', 'AI&DS'],
        ['950322243021', 'ROGER', 'SAMUEL J', 'AI&DS'],
        ['950322243022', 'RUBY', 'ESTHER Y', 'AI&DS'],
        ['950322243023', 'SAM', 'DAVI R S', 'AI&DS'],
        ['950322243024', 'SARVESH', 'S', 'AI&DS'],
        ['950322243025', 'SIVAKUMAR', 'A', 'AI&DS'],
        ['950322243026', 'SRI', 'DEVI BALAGAN M', 'AI&DS'],
        ['950322243027', 'SRIMURUGAN', 'A', 'AI&DS'],
        ['950322243028', 'SWARNA', 'T', 'AI&DS'],

        ['950323243001', 'AASHIK', 'RAYEN P', 'AI&DS'],
        ['950323243002', 'ANA', 'BALAN B', 'AI&DS'],
        ['950323243003', 'ANTONY', 'D', 'AI&DS'],
        ['950323243004', 'ARIHARASUTHAN', 'S', 'AI&DS'],
        ['950323243005', 'ASMITHA', 'S', 'AI&DS'],
        ['950323243006', 'BLINDA', 'DOMNIC GOLDA I', 'AI&DS'],
        ['950323243008', 'FATHIMA', 'BEEVI R', 'AI&DS'],
        ['950323243009', 'FRANCIS', 'STARWIN M', 'AI&DS'],
        ['950323243010', 'GRASON', 'MAHILRAJ S', 'AI&DS'],
        ['950323243011', 'HARISH', 'KUMAR M', 'AI&DS'],
        ['950323243012', 'KIRUBA', 'SHERLIN A', 'AI&DS'],
        ['950323243013', 'MATHESH', 'R', 'AI&DS'],
        ['950323243014', 'MOHANPRASHAD', 'R', 'AI&DS'],

        // CSE
        ['950322104001', 'ABDUL', 'RAHIM S', 'CSE'],
        ['950322104002', 'ABISHEK', 'V', 'CSE'],
        ['950322104003', 'ABRAHAM', 'RAJASINGH P', 'CSE'],
        ['950322104005', 'AJIN', 'STEPHEN A', 'CSE'],
        ['950322104006', 'AKASH', 'A', 'CSE'],
        ['950322104007', 'AKASH', 'KUMAR', 'CSE'],
        ['950322104008', 'AKSHAYA', 'J', 'CSE'],
        ['950322104009', 'AMBIHA', 'V', 'CSE'],
        ['950322104010', 'ANANTHA', 'KUMAR G', 'CSE'],
        ['950322104011', 'ANANTHA', 'SARAVANAN B', 'CSE'],
        ['950322104012', 'ANBU', 'D', 'CSE'],
        ['950322104013', 'ANITHA', 'A', 'CSE'],
        ['950322104014', 'ANITHA', 'M', 'CSE'],
        ['950322104015', 'ANTONY', 'JEBA AASHIKA A', 'CSE'],

        ['950323104001', 'Aaditya', 'Roy', 'CSE'],
        ['950323104002', 'Aarav', 'Sharma', 'CSE'],
        ['950323104003', 'Abhinav', 'Patel', 'CSE'],
        ['950323104004', 'Aditi', 'Singh', 'CSE'],
        ['950323104005', 'Ananya', 'Rao', 'CSE'],
        ['950323104006', 'Anish', 'Kumar', 'CSE'],
        ['950323104007', 'Bhavya', 'Reddy', 'CSE'],
        ['950323104008', 'Deepak', 'Verma', 'CSE'],
        ['950323104009', 'Devansh', 'Joshi', 'CSE'],
        ['950323104010', 'Divya', 'Nair', 'CSE'],
        ['950323104011', 'Esha', 'Gupta', 'CSE'],
        ['950323104012', 'Gautam', 'Iyer', 'CSE'],
        ['950323104013', 'Harsh', 'Vardhan', 'CSE'],
        ['950323104014', 'Isha', 'Menon', 'CSE'],
        ['950323104015', 'Kavya', 'Pillai', 'CSE'],

        // EEE
        ['950322105001', 'Akash', 'M', 'EEE'],
        ['950322105002', 'Bala', 'Subramanian R', 'EEE'],
        ['950322105003', 'Chandran', 'S', 'EEE'],
        ['950322105004', 'Dinesh', 'K', 'EEE'],
        ['950322105005', 'Ganesh', 'P', 'EEE'],
        ['950322105006', 'Hari', 'Haran A', 'EEE'],
        ['950322105007', 'Karthik', 'S', 'EEE'],
        ['950322105008', 'Manikandan', 'V', 'EEE'],
        ['950322105009', 'Naveen', 'Kumar R', 'EEE'],
        ['950322105010', 'Praveen', 'S', 'EEE'],

        ['950323105001', 'Abhishek', 'Kumar', 'EEE'],
        ['950323105002', 'Ankit', 'Raj', 'EEE'],
        ['950323105003', 'Bharat', 'K', 'EEE'],
        ['950323105004', 'Dhiraj', 'S', 'EEE'],
        ['950323105005', 'Gokul', 'R', 'EEE'],
        ['950323105006', 'Jagan', 'M', 'EEE'],
        ['950323105007', 'Kiran', 'V', 'EEE'],
        ['950323105008', 'Manoj', 'P', 'EEE'],
        ['950323105009', 'Nitin', 'S', 'EEE'],
        ['950323105010', 'Rahul', 'G', 'EEE'],

        // ECE
        ['950322106001', 'Aarthi', 'S', 'ECE'],
        ['950322106002', 'Bhavani', 'M', 'ECE'],
        ['950322106003', 'Deepika', 'R', 'ECE'],
        ['950322106004', 'Gaya3', 'K', 'ECE'],
        ['950322106005', 'Janani', 'V', 'ECE'],
        ['950322106006', 'Kavitha', 'P', 'ECE'],
        ['950322106007', 'Lavanya', 'A', 'ECE'],
        ['950322106008', 'Meena', 'S', 'ECE'],
        ['950322106009', 'Nivetha', 'M', 'ECE'],
        ['950322106010', 'Priya', 'Dharshini R', 'ECE'],

        ['950323106001', 'Amrita', 'Sen', 'ECE'],
        ['950323106002', 'Anjali', 'Sharma', 'ECE'],
        ['950323106003', 'Archana', 'N', 'ECE'],
        ['950323106004', 'Dhanush', 'R', 'ECE'],
        ['950323106005', 'Indhu', 'M', 'ECE'],
        ['950323106006', 'Keerthana', 'V', 'ECE'],
        ['950323106007', 'Malini', 'K', 'ECE'],
        ['950323106008', 'Pooja', 'S', 'ECE'],
        ['950323106009', 'Radha', 'P', 'ECE'],
        ['950323106010', 'Swetha', 'A', 'ECE'],

        // MECH
        ['950322114001', 'Ajith', 'Kumar S', 'MECH'],
        ['950322114002', 'Bharath', 'V', 'MECH'],
        ['950322114003', 'Dhanush', 'M', 'MECH'],
        ['950322114004', 'Gokul', 'K', 'MECH'],
        ['950322114005', 'Harish', 'R', 'MECH'],
        ['950322114006', 'Karthikeyan', 'P', 'MECH'],
        ['950322114007', 'Lokesh', 'A', 'MECH'],
        ['950322114008', 'Muthu', 'Kumar N', 'MECH'],
        ['950322114009', 'Nivas', 'S', 'MECH'],
        ['950322114010', 'Prashanth', 'M', 'MECH'],

        ['950323114001', 'Arun', 'Prakash', 'MECH'],
        ['950323114002', 'Bala', 'Murugan', 'MECH'],
        ['950323114003', 'Deepak', 'Raj', 'MECH'],
        ['950323114004', 'Elango', 'S', 'MECH'],
        ['950323114005', 'Giri', 'Dharan', 'MECH'],
        ['950323114006', 'Hari', 'Prasad', 'MECH'],
        ['950323114007', 'Jayaram', 'K', 'MECH'],
        ['950323114008', 'Kishore', 'V', 'MECH'],
        ['950323114009', 'Loganathan', 'M', 'MECH'],
        ['950323114010', 'Manish', 'R', 'MECH'],

        // CIVIL
        ['950322103001', 'Bharath', 'Kumar S', 'CIVIL'],
        ['950322103003', 'Sankara', 'Narayanan S', 'CIVIL'],
        ['950322103004', 'Subash', 'Chandra Bose K', 'CIVIL'],
        ['950323103001', 'MARIA', 'JENCY S', 'CIVIL'],
        ['950323103002', 'NISHA', 'T', 'CIVIL'],
        ['950323103003', 'SRIRAM', '', 'CIVIL'],

        // MBA
        ['950323631001', 'Abinaya', 'R', 'MBA'],
        ['950323631002', 'Babu', 'S', 'MBA'],
        ['950323631003', 'Divya', 'P', 'MBA'],
        ['950323631004', 'Hari', 'K', 'MBA'],
        ['950323631005', 'Kavitha', 'M', 'MBA']
    ];

    const list = rawData.map(([reg, fn, ln, dept]) => ({
        stu_id: 'stu_' + reg,
        stu_regno: reg,
        stu_fname: fn,
        stu_lname: ln,
        stu_dept: dept,
        stu_status: 'Active'
    }));

    // Auto-generate additional sequential students for full coverage 001..030 for all years/depts
    const depts = [
        { code: '243', name: 'AI&DS' },
        { code: '104', name: 'CSE' },
        { code: '105', name: 'EEE' },
        { code: '106', name: 'ECE' },
        { code: '114', name: 'MECH' },
        { code: '103', name: 'CIVIL' },
        { code: '631', name: 'MBA' }
    ];
    const years = ['22', '23', '24', '25'];
    const namesList = ['Aarav','Aditi','Amit','Ananya','Arjun','Deepa','Dev','Dhruv','Esha','Ishaan','Kavya','Lakshmi','Meera','Neha','Pranav','Priya','Rahul','Riya','Rohan','Shreya','Siddharth','Sneha','Suresh','Tanvi','Varun','Vikram','Zara','Arun','Bharathi','Chandru'];
    const surnamesList = ['Kumar','Sharma','Patel','Singh','Raj','Bai','Reddy','Naidu','Das','Gupta','Verma','Iyer','Nair','Menon','Pillai'];

    years.forEach(y => {
        depts.forEach(d => {
            for (let i = 1; i <= 30; i++) {
                const reg = '9503' + y + d.code + String(i).padStart(3, '0');
                if (!list.some(s => s.stu_regno === reg)) {
                    const fn = namesList[(parseInt(reg.slice(-3)) + parseInt(d.code)) % namesList.length];
                    const ln = surnamesList[(parseInt(reg.slice(-3)) * 3) % surnamesList.length];
                    list.push({
                        stu_id: 'stu_' + reg,
                        stu_regno: reg,
                        stu_fname: fn,
                        stu_lname: ln,
                        stu_dept: d.name,
                        stu_status: 'Active'
                    });
                }
            }
        });
    });

    return list;
}

function seedSampleData() {
    let list = DB.get(Students.KEY);
    if (!list || list.length === 0) {
        list = getComprehensiveDefaultStudents();
        DB.set(Students.KEY, list);
    }
}

// Auto-seed on load
seedSampleData();
