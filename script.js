document.addEventListener("DOMContentLoaded", () => {
    loadMentorsFromServer();
});

const loginScreen = document.getElementById('login-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const ratingScreen = document.getElementById('rating-screen'); 
const categoriesContainer = document.getElementById('categories-container');

// רכיבי פאנל ניהול אדמין
const adminScreen = document.getElementById('admin-screen');
const adminBackBtn = document.getElementById('admin-back-btn');
const adminStatusOnBtn = document.getElementById('admin-status-on-btn');
const adminStatusLockBtn = document.getElementById('admin-status-lock-btn');
const adminCurrentStatusBadge = document.getElementById('admin-current-status-badge');
const adminCalcOscarBtn = document.getElementById('admin-calc-oscar-btn');
const oscarResultsArea = document.getElementById('oscar-results-area');
const adminVotesTableBody = document.getElementById('admin-votes-table-body');
const lobbyLockWarning = document.getElementById('lobby-lock-warning');

const mentorDropdown = document.getElementById('mentor-dropdown');
const enterBtn = document.getElementById('enterBtn');
const userDisplayName = document.getElementById('user-display-name');
const progressCount = document.getElementById('progress-count');
const progressBarFill = document.getElementById('progress-bar-fill');
const boysProjectsGrid = document.getElementById('boys-projects-grid');
const girlsProjectsGrid = document.getElementById('girls-projects-grid');
const scanQrBtn = document.getElementById('scan-qr-btn');

// רכיבי סיום
const finishContainer = document.getElementById('finish-container');
const finishBtn = document.getElementById('finish-judging-btn');
const thanksModal = document.getElementById('thanks-modal');

const ratingBackBtn = document.getElementById('rating-back-btn');
const modalProjectTitle = document.getElementById('modal-project-title');
const modalProjectCreations = document.getElementById('modal-project-creators');
const modalProjectNo = document.getElementById('modal-project-no');
const modalProjectGender = document.getElementById('modal-project-gender');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

const customAlertModal = document.getElementById('custom-alert-modal');
const customAlertText = document.getElementById('custom-alert-text');
const customAlertCloseBtn = document.getElementById('custom-alert-close-btn');

const scannerModal = document.getElementById('scanner-modal');
const scannerCloseX = document.getElementById('scanner-close-x');
let html5QrcodeScanner = null;

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1RyrAzEhinN8quqqbj6H_gCdK625z1Hjt7DNOANOCnF0/edit?usp=sharing";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzyngk78-25S0ihQLE_zlvBW7rI6Syw_6fzICVULsclXVc1Ruhr9twlCN7SwVjKXJ2-/exec";

let currentMentor = ""; 
let rawProjectsData = []; 
let currentMentorVotesRow = {}; 
let currentSelectedProjectNo = null;
let currentSelectedProjectGender = "";
let allVotesAdminData = []; 

const BACKUP_MENTORS = ["רבית אביטן", "שמואל פרומן", "מיטל כהן", "אייל רוזנברג", "דוד לוי", "ניר ברקוביץ", "דפנה אשכנזי", "גלעד שמר", "אורית חדד"];

const CATEGORIES_DATA = [
    { id: 1, title: "👥 מנהיגות וצוות", desc: "שיתוף פעולה בפיתוח המיזם הכולל ניהול וחלוקת תפקידים ברורה בה הסטודנט תורם את חלקו מתוך חוזקותיו." },
    { id: 2, title: "🔍 הגדרת הבעיה", desc: "ביצוע מחקר מעמיק; הגדרת קהל היעד, הבנת גורמי הבעיה והבאת נתונים תומכים ומהימנים." },
    { id: 3, title: "🛠️ פיתוח מוצר ויישומנות", desc: "עד כמה הדגם ממחיש את הפתרון ועד כמה הוא ישים ומוכן ליציאה להתנסות/שוק." },
    { id: 4, title: "🤖 סיוע בחדשנות", desc: "שימוש בכלים חדשניים (AI, Code) בתהליך הפיתוח וההצגה." },
    { id: 5, title: "💡 חדשנות ומקוריות", desc: "יצירתיות וחשיבה מחוץ לקופסה ביחס למיזמים ואו מוצרים קיימים בשוק." },
    { id: 6, title: "🌍 אימפקט ותרומה", desc: "פוטנציאל השינוי שהמיזם יכול לייצר בעולם (חברתי/סביבתי/לימודי)." },
    { id: 7, title: "📊 פרזנטציה / חוויה", desc: "יכולת שכנוע ושיווק, מבנה הפיץ' ונראות הדוכן/פוסטר." }
];

function showAlert(message) {
    customAlertText.innerText = message;
    customAlertModal.style.display = 'flex';
}
customAlertCloseBtn.onclick = () => customAlertModal.style.display = 'none';

function showScreen(targetScreen) {
    loginScreen.classList.remove('active');
    lobbyScreen.classList.remove('active');
    ratingScreen.classList.remove('active');
    if (adminScreen) adminScreen.classList.remove('active');
    targetScreen.classList.add('active');
}

function parseCSVLine(line) {
    const result = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else { current += char; }
    }
    result.push(current.trim());
    return result.map(col => col.replace(/^"|"$/g, '').trim());
}

function normalizeGender(genderStr) {
    if (!genderStr) return "male";
    const g = genderStr.trim().toLowerCase();
    if (g.includes('female') || g.includes('בת') || g.includes('בנות')) return 'female';
    return 'male';
}

function loadMentorsFromServer() {
    const matches = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) { useBackupMentors(); return; }
    const csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=Mentors`;
    fetch(csvUrl).then(r => r.text()).then(text => {
        const lines = text.split(/\r?\n/);
        let optionsHtml = '<option value="">בחר/י את שמך מהרשימה...</option>';
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const columns = parseCSVLine(lines[i]);
            if (columns[1] && columns[1].trim() !== "") {
                optionsHtml += `<option value="${columns[1].trim()}">${columns[1].trim()}</option>`;
                count++;
            }
        }
        if (count > 0) mentorDropdown.innerHTML = optionsHtml; else useBackupMentors();
    }).catch(err => useBackupMentors())
    .finally(() => {
        if (!document.getElementById("admin-gear-btn")) {
            const gear = document.createElement("div");
            gear.id = "admin-gear-btn";
            gear.innerHTML = "⚙️";
            gear.style = "position: absolute; top: 15px; right: 15px; font-size: 1.4rem; cursor: pointer; opacity: 0.3; user-select: none; z-index: 1000;";
            gear.onclick = () => triggerAdminPasswordPrompt();
            loginScreen.appendChild(gear);
        }
    });
}

function useBackupMentors() {
    let optionsHtml = '<option value="">בחר/י את שמך מהרשימה (מצב גיבוי)...</option>';
    BACKUP_MENTORS.forEach(name => optionsHtml += `<option value="${name}">${name}</option>`);
    mentorDropdown.innerHTML = optionsHtml;
}

function fetchMentorVotesAndRenderLobby() {
    const matches = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) return;
    const csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=Mentors_Votes`;
    fetch(csvUrl).then(r => r.text()).then(text => {
        const lines = text.split(/\r?\n/);
        currentMentorVotesRow = {}; 
        if (lines.length < 2) { fetchAndDisplayProjects(); return; }
        const headers = parseCSVLine(lines[0]);
        const mIdx = headers.findIndex(h => h.toLowerCase().includes('mentor')) !== -1 ? headers.findIndex(h => h.toLowerCase().includes('mentor')) : 1;
        const pIdx = headers.findIndex(h => h.toLowerCase().includes('project')) !== -1 ? headers.findIndex(h => h.toLowerCase().includes('project')) : 2;
        const gIdx = headers.findIndex(h => h.toLowerCase().includes('gender')) !== -1 ? headers.findIndex(h => h.toLowerCase().includes('gender')) : 3;
        const c1Idx = headers.findIndex(h => h.toLowerCase().includes('cat1')) !== -1 ? headers.findIndex(h => h.toLowerCase().includes('cat1')) : 4;
        
        // קריאה מלמטה למעלה כדי לתפוס תמיד רק את הדירוג האחרון (העדכני ביותר) של המנטור
        for (let i = lines.length - 1; i >= 1; i--) {
            if (!lines[i].trim()) continue;
            const columns = parseCSVLine(lines[i]);
            if (columns[mIdx] && columns[mIdx].trim() === currentMentor.trim()) {
                const projectKey = `${parseInt(columns[pIdx])}_${normalizeGender(columns[gIdx])}`;
                if (!currentMentorVotesRow[projectKey]) {
                    currentMentorVotesRow[projectKey] = [parseInt(columns[c1Idx])||0, parseInt(columns[c1Idx+1])||0, parseInt(columns[c1Idx+2])||0, parseInt(columns[c1Idx+3])||0, parseInt(columns[c1Idx+4])||0, parseInt(columns[c1Idx+5])||0, parseInt(columns[c1Idx+6])||0];
                }
            }
        }
        fetchAndDisplayProjects();
    });
}

function fetchAndDisplayProjects() {
    fetch(`${APPS_SCRIPT_URL}?action=getSystemStatus`)
        .then(res => res.json())
        .then(sys => {
            if (sys.status === "LOCK") {
                if (lobbyLockWarning) lobbyLockWarning.style.display = "block";
            } else {
                if (lobbyLockWarning) lobbyLockWarning.style.display = "none";
            }
            renderLobbyGridData();
        }).catch(() => renderLobbyGridData());
}

function renderLobbyGridData() {
    const matches = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) return;
    const csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=Projects`;
    fetch(csvUrl).then(r => r.text()).then(text => {
        const lines = text.split(/\r?\n/);
        boysProjectsGrid.innerHTML = ""; girlsProjectsGrid.innerHTML = ""; rawProjectsData = [];
        const headers = parseCSVLine(lines[0]);
        let nameIdx = headers.findIndex(h => h.toLowerCase() === 'name') !== -1 ? headers.findIndex(h => h.toLowerCase() === 'name') : 3;
        let total = 0, voted = 0;
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const cols = parseCSVLine(lines[i]);
            const pNo = parseInt(cols[1]); if (!pNo) continue;
            const pCreators = cols[nameIdx] || "יזמים לא ידועים";
            const pGender = normalizeGender(cols[5]);
            rawProjectsData.push({ no: pNo, title: cols[2], creators: pCreators, gender: pGender });
            total++;
            const currentProjectKey = `${pNo}_${pGender}`;
            const done = currentMentorVotesRow[currentProjectKey] ? true : false; 
            if (done) voted++;
            const btn = document.createElement('div');
            btn.className = `project-grid-button ${done ? 'color-green' : ''}`;
            btn.innerHTML = `<div class="proj-number">${pNo}</div><div class="proj-title">${cols[2]}</div><div class="proj-status-label">${done ? '✓ דורג' : 'טרם דורג'}</div>`;
            btn.onclick = () => openRatingPage(pNo, cols[2], pCreators, pGender);
            if (pGender === 'female') girlsProjectsGrid.appendChild(btn); else boysProjectsGrid.appendChild(btn);
        }
        progressCount.innerText = `${voted}/${total}`;
        progressBarFill.style.width = `${total > 0 ? (voted / total) * 100 : 0}%`;
        finishContainer.style.display = 'block';
    });
}

function getFeedbackText(val) {
    if (val == 0) return "טרם דורג"; if (val <= 3) return "טעון שיפור"; if (val <= 6) return "בינוני / בסיסי"; if (val <= 8) return "טוב מאוד"; return "מצוין ויוצא דופן";
}

function renderRatingCategories() {
    categoriesContainer.innerHTML = "";
    const projectKey = `${currentSelectedProjectNo}_${currentSelectedProjectGender}`;
    const savedScores = currentMentorVotesRow[projectKey] || [0, 0, 0, 0, 0, 0, 0];
    CATEGORIES_DATA.forEach((cat, index) => {
        const prefilledValue = savedScores[index];
        const card = document.createElement('div');
        card.className = "category-card-row";
        card.innerHTML = `<div class="cat-card-title">${cat.title}</div><div class="cat-card-desc">${cat.desc}</div><div class="score-badge-wrapper"><span id="feedback-${cat.id}" class="cat-card-feedback unrated">טרם דורג</span></div><button id="lock-btn-${cat.id}" class="unlock-trigger-btn" onclick="toggleSliderLock(${cat.id})">🔒 לחץ לגרירה</button><input type="range" min="0" max="10" value="${prefilledValue}" class="full-page-slider" id="slider-${cat.id}" disabled style="pointer-events: none;"><div class="manual-controls-row"><button class="step-btn minus" onclick="stepValue(${cat.id}, -1)">−</button><input type="number" id="input-${cat.id}" class="manual-score-input" min="1" max="10" placeholder="?"><button class="step-btn plus" onclick="stepValue(${cat.id}, 1)">+</button></div>`;
        categoriesContainer.appendChild(card);
        const slider = card.querySelector(`#slider-${cat.id}`);
        const input = card.querySelector(`#input-${cat.id}`);
        slider.oninput = () => updateSync(cat.id, slider.value, 'slider');
        slider.addEventListener('touchend', () => lockSliderBack(cat.id));
        slider.addEventListener('mouseup', () => lockSliderBack(cat.id));
        input.oninput = () => updateSync(cat.id, input.value, 'input');
        if (prefilledValue > 0) updateSync(cat.id, prefilledValue, 'init');
    });
}

window.toggleSliderLock = function(id) {
    const s = document.getElementById(`slider-${id}`); const b = document.getElementById(`lock-btn-${id}`);
    s.disabled = false; s.style.pointerEvents = "auto"; s.classList.add("unlocked-slider");
    b.innerHTML = "🔸 גרוֹר כעת..."; b.classList.add("active-unlocked");
}

function lockSliderBack(id) {
    const s = document.getElementById(`slider-${id}`); const b = document.getElementById(`lock-btn-${id}`);
    s.disabled = true; s.style.pointerEvents = "none"; s.classList.remove("unlocked-slider");
    b.innerHTML = "🔒 לחץ לגרירה"; b.classList.remove("active-unlocked");
}

function updateSync(id, val, source) {
    const s = document.getElementById(`slider-${id}`); const i = document.getElementById(`input-${id}`); const f = document.getElementById(`feedback-${id}`);
    let v = parseInt(val) || 0; if (v > 10) v = 10;
    s.value = v; if (source !== 'input') i.value = (v === 0) ? "" : v;
    if (v === 0) { f.innerText = "טרם דורג"; f.className = "cat-card-feedback unrated"; }
    else { f.innerText = `${v} | ${getFeedbackText(v)}`; f.className = "cat-card-feedback rated"; if (v <= 3) f.className += " low"; else if (v <= 6) f.className += " mid"; else if (v <= 8) f.className += " high"; else f.className += " perfect"; }
}

window.stepValue = function(id, d) {
    const s = document.getElementById(`slider-${id}`);
    let n = (parseInt(s.value) || 0) + d; if (n > 10) n = 10; if (n < 1) n = 1;
    updateSync(id, n, 'manual');
}

function openRatingPage(pNo, pTitle, pCreators, pGender) {
    fetch(`${APPS_SCRIPT_URL}?action=getSystemStatus`)
        .then(res => res.json())
        .then(sys => {
            if (sys.status === "LOCK") {
                showAlert("🔒 מערכת השיפוט ננעלה סופית על ידי הנהלת הכנס. לא ניתן לפתוח מיזמים חדשים לדירוג.");
                if (lobbyLockWarning) lobbyLockWarning.style.display = "block";
                showScreen(loginScreen);
                return;
            }
            currentSelectedProjectNo = pNo; currentSelectedProjectGender = pGender;
            modalProjectTitle.innerText = pTitle; modalProjectCreations.innerText = "יזמים: " + pCreators;
            modalProjectNo.innerText = "מיזם מספר " + pNo; modalProjectGender.innerText = pGender === 'female' ? "מיזם בנות" : "מיזם בנים";
            modalProjectGender.className = `gender-badge ${pGender}`;
            renderRatingCategories(); showScreen(ratingScreen); ratingScreen.scrollTop = 0;
        });
}

modalCancelBtn.onclick = () => showScreen(lobbyScreen);
ratingBackBtn.onclick = () => showScreen(lobbyScreen);

enterBtn.onclick = () => {
    if (!mentorDropdown.value) { showAlert("אנא בחר/י שם מתוך הרשימה!"); return; }
    fetch(`${APPS_SCRIPT_URL}?action=getSystemStatus`)
        .then(res => res.json())
        .then(sys => {
            if (sys.status === "LOCK") {
                showAlert("🔒 המערכת נעולה כרגע. לא ניתן להיכנס ללובי הדירוגים.");
                return;
            }
            currentMentor = mentorDropdown.value; userDisplayName.innerText = currentMentor;
            showScreen(lobbyScreen); fetchMentorVotesAndRenderLobby();
        }).catch(() => {
            currentMentor = mentorDropdown.value; userDisplayName.innerText = currentMentor;
            showScreen(lobbyScreen); fetchMentorVotesAndRenderLobby();
        });
};

modalSaveBtn.onclick = function() {
    const scores = []; let sum = 0;
    for (let i = 1; i <= 7; i++) {
        const val = parseInt(document.getElementById(`slider-${i}`).value);
        if (val === 0) { showAlert("חובה לדרג את כל הקטגוריות!"); return; }
        scores.push(val); sum += val;
    }
    modalSaveBtn.innerText = "שומר... ⏳"; modalSaveBtn.disabled = true;
    fetch(APPS_SCRIPT_URL, {
        method: "POST", mode: "no-cors", cache: "no-cache",
        body: JSON.stringify({ mentorName: currentMentor, projectNumber: currentSelectedProjectNo, gender: currentSelectedProjectGender, cat1: scores[0], cat2: scores[1], cat3: scores[2], cat4: scores[3], cat5: scores[4], cat6: scores[5], cat7: scores[6], totalScore: sum })
    }).then(() => {
        showAlert(`נשמר בהצלחה!`);
        modalSaveBtn.innerText = "💾 שמור דירוג והמשך"; modalSaveBtn.disabled = false;
        showScreen(lobbyScreen); fetchMentorVotesAndRenderLobby();
    });
};

finishBtn.onclick = () => {
    thanksModal.style.display = 'flex';
};

scanQrBtn.onclick = () => {
    fetch(`${APPS_SCRIPT_URL}?action=getSystemStatus`)
        .then(res => res.json())
        .then(sys => {
            if (sys.status === "LOCK") {
                showAlert("🔒 מערכת השיפוט נעולה. סורק הברקודים מושבת.");
                return;
            }
            scannerModal.style.display = 'flex';
            html5QrcodeScanner = new Html5Qrcode("qr-reader");
            html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (text) => {
                const raw = text.trim().toUpperCase(); const num = parseInt(raw.replace(/[^\d]/g, '')); const gen = raw.startsWith('G') ? 'female' : 'male';
                stopScanner();
                const p = rawProjectsData.find(x => x.no === num && x.gender === gen);
                if (p) openRatingPage(p.no, p.title, p.creators, p.gender); else openRatingPage(num, `מיזם ${num}`, "לא ידוע", gen);
            });
        });
};

function stopScanner() { if (html5QrcodeScanner) html5QrcodeScanner.stop().then(() => scannerModal.style.display = 'none'); else scannerModal.style.display = 'none'; }
scannerCloseX.onclick = stopScanner;


/* ==========================================================================
   🔒 מנגנון ניהול חסוי ואוסקר חכם (אדמין וסיסמה)
   ========================================================================== */

function triggerAdminPasswordPrompt() {
    const pass = prompt("אנא הזן סיסמת מנהל:");
    if (pass === "02062026") {
        loginScreen.classList.remove('active');
        lobbyScreen.classList.remove('active');
        ratingScreen.classList.remove('active');
        if (adminScreen) adminScreen.classList.add('active');
        updateAdminStatusVisuals();
        fetchAdminDashboardData();
    } else if (pass !== null) {
        showAlert("❌ סיסמה שגויה! הגישה נדחתה.");
    }
}

adminBackBtn.onclick = () => {
    showScreen(loginScreen);
};

if (adminStatusOnBtn && adminStatusLockBtn) {
    adminStatusOnBtn.onclick = () => setSystemStatusOnServer("ON");
    adminStatusLockBtn.onclick = () => setSystemStatusOnServer("LOCK");
}

function updateAdminStatusVisuals() {
    if (!adminCurrentStatusBadge) return;
    fetch(`${APPS_SCRIPT_URL}?action=getSystemStatus`)
        .then(res => res.json())
        .then(sys => {
            if (sys.status === "LOCK") {
                adminCurrentStatusBadge.innerHTML = "🔴 נעול";
                adminCurrentStatusBadge.style.background = "#fef2f2";
                adminCurrentStatusBadge.style.color = "#ef4444";
                adminStatusLockBtn.style.opacity = "1";
                adminStatusOnBtn.style.opacity = "0.4";
            } else {
                adminCurrentStatusBadge.innerHTML = "🟢 פעיל";
                adminCurrentStatusBadge.style.background = "#f0fdf4";
                adminCurrentStatusBadge.style.color = "#10b981";
                adminStatusOnBtn.style.opacity = "1";
                adminStatusLockBtn.style.opacity = "0.4";
            }
        }).catch(() => {
            adminCurrentStatusBadge.innerHTML = "שגיאה בחיבור";
        });
}

function setSystemStatusOnServer(statusState) {
    const btnText = statusState === "ON" ? "פתיחה..." : "נעילה...";
    showAlert(`מבצע ${btnText} אנא המתן ⏳`);
    fetch(APPS_SCRIPT_URL, {
        method: "POST", mode: "no-cors", cache: "no-cache",
        body: JSON.stringify({ action: "toggleSystemStatus", status: statusState })
    }).then(() => {
        setTimeout(() => {
            customAlertModal.style.display = 'none';
            updateAdminStatusVisuals();
            showAlert(statusState === "ON" ? "🟢 המערכת נפתחה לדירוג מנטורים!" : "🔴 המערכת ננעלה בבטחה ופס התרעה הופעל בשטח!");
        }, 800);
    });
}

// 📊 טעינת נתוני אדמין וניקוי כפילויות מוחלט מטבלת השקיפות
function fetchAdminDashboardData() {
    if (!adminVotesTableBody) return;
    adminVotesTableBody.innerHTML = `<tr><td colspan="4" style="padding:15px; text-align:center; color:#64748b;">טוען נתונים מהשרת... ⏳</td></tr>`;
    if (oscarResultsArea) oscarResultsArea.style.display = 'none';
    
    fetch(`${APPS_SCRIPT_URL}?action=getAdminVotesData`)
        .then(res => res.json())
        .then(votes => {
            const rawVotes = votes || [];
            if (rawVotes.length === 0) {
                adminVotesTableBody.innerHTML = `<tr><td colspan="4" style="padding:15px; text-align:center; color:#64748b;">טרם נקלטו הצבעות במערכת.</td></tr>`;
                return;
            }
            
            // 🎯 סינון כפילויות חכם - שומר רק את הדירוג האחרון (הכי מעודכן) של כל מנטור לכל מיזם
            const uniqueVotesMap = {};
            rawVotes.forEach(v => {
                const uniqueKey = `${v.mentor.trim()}_${v.projectId}_${v.gender}`;
                // מכיוון שהנתונים מגיעים לפי סדר כרונולוגי, דריסה מתמדת תשאיר לנו את השורה הכי עדכנית
                uniqueVotesMap[uniqueKey] = v;
            });
            
            // הפיכה חזרה למערך ומיון אלפביתי נקי לפי שם המנטור
            allVotesAdminData = Object.values(uniqueVotesMap).sort((a, b) => a.mentor.localeCompare(b.mentor, 'he'));
            
            // רינדור הטבלה המסוננת והממוינת
            let html = "";
            allVotesAdminData.forEach(v => {
                const gLabel = v.gender === "female" ? "🚺 בנות" : "🚹 בנים";
                html += `<tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding:10px; font-weight:bold; color:#1e293b;">${v.mentor}</td>
                    <td style="padding:10px; color:#475569;">מיזם ${v.projectId}</td>
                    <td style="padding:10px; color:#64748b;">${gLabel}</td>
                    <td style="padding:10px; text-align:center; font-weight:800; color:#0f172a;">${v.totalScore} נק'</td>
                </tr>`;
            });
            adminVotesTableBody.innerHTML = html;
        }).catch(() => {
            adminVotesTableBody.innerHTML = `<tr><td colspan="4" style="padding:15px; text-align:center; color:#ef4444;">שגיאה בטעינת נתונים גולמיים.</td></tr>`;
        });
}

// 🏆 מנוע האוסקר המאוחד (מקשה אחת ללא הפרדת מגדר + מניעת כפל זכיות)
if (adminCalcOscarBtn) {
    adminCalcOscarBtn.onclick = () => {
        if (!allVotesAdminData || allVotesAdminData.length === 0) {
            showAlert("אין מספיק נתונים לחישוב אוסקר כרגע. ודאי שטבלת השקיפות טעונה.");
            return;
        }
        
        // 1. קיבוץ הצבעות וחישוב ממוצעים לכל מיזם (הבנים והבנות יחד במערך אחד!)
        const projectSummary = {};
        allVotesAdminData.forEach(v => {
            const key = `${v.projectId}_${v.gender}`;
            if (!projectSummary[key]) {
                projectSummary[key] = { id: v.projectId, gender: v.gender, sum: 0, count: 0 };
            }
            projectSummary[key].sum += v.totalScore;
            projectSummary[key].count += 1;
        });
        
        // מיון כל המיזמים של הכנס יחד מהממוצע הגבוה ביותר לנמוך ביותר
        const allRanked = Object.values(projectSummary).map(p => ({
            id: p.id,
            gender: p.gender,
            avg: p.sum / p.count
        })).sort((a, b) => b.avg - a.avg);
        
        // 2. חלוקת המקומות (כיוון שהם ממוינים, מניעת כפל זכיות קורה אוטומטית לפי המיקומים 0, 1, 2)
        const places = {
            gold: allRanked[0] || null,
            silver: allRanked[1] || null,
            bronze: allRanked[2] || null
        };
        
        // 3. רינדור חזותי מפואר ומאוחד
        let resHTML = `<h3 style="font-size:1.15rem; color:#1e3a8a; border-bottom:2px solid #fbbf24; padding-bottom:4px; margin-bottom:12px;">🏆 תוצאות האוסקר הסופיות (כלל המיזמים):</h3>`;
        
        const makeCard = (title, icon, data) => {
            if (!data) return `<div style="padding:8px; background:#f1f5f9; border-radius:8px; font-size:0.9rem; color:#94a3b8; margin-bottom: 8px;">${icon} ${title}: אין מידע</div>`;
            const gBadge = data.gender === "female" ? "🚺 מיזם בנות" : "🚹 מיזם בנים";
            return `<div style="padding:12px; background:white; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 5px rgba(0,0,0,0.02); margin-bottom: 8px;">
                <div style="font-weight:800; font-size:1rem; color:#0f172a;">${icon} ${title}</div>
                <div style="font-size:1.05rem; color:#2563eb; font-weight:bold; margin-top:2px;">מיזם מספר ${data.id} <span style="font-size:0.8rem; font-weight:normal; color:#64748b;">(${gBadge})</span></div>
                <div style="font-size:0.8rem; color:#64748b;">ציון משוקלל סופי: ${data.avg.toFixed(2)} נק'</div>
            </div>`;
        };
        
        resHTML += makeCard("מקום ראשון (זהב)", "🥇", places.gold);
        resHTML += makeCard("מקום שני (כסף)", "🥈", places.silver);
        resHTML += makeCard("מקום שלישי (ארד)", "🥉", places.bronze);
        
        if (oscarResultsArea) {
            oscarResultsArea.innerHTML = resHTML;
            oscarResultsArea.style.display = 'block';
        }
        
        showAlert("✨ תוצאות האוסקר המאוחדות חושבו בהצלחה ללא כפילויות זכייה!");
    };
}
