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

// שמירת שינויים ידניים של האדמין בזמן אמת לשמירה על יציבות הלוח
let manualAdminOverrides = {
    projectOfTheYear: null,
    categories: {} // מבנה של catId: { place1: id, place2: id, place3: id }
};

const BACKUP_MENTORS = ["רבית אביטן", "שמואל פרומן", "מיטל כהן", "אייל רוזנברג", "דוד לוי", "ניר ברקוביץ", "דפנה אשכנזי", "גלעד שמר", "אורית חדד"];

// 📐 סולם החשיבות הערכי והרשמי של הכנס כפי שנקבע על ידך
const CATEGORIES_DATA = [
    { id: 5, title: "💡 חדשנות ומקוריות", desc: "יצירתיות וחשיבה מחוץ לקופסה ביחס למיזמים ואו מוצרים קיימים בשוק." },
    { id: 6, title: "🌍 אימפקט ותרומה", desc: "פוטנציאל השינוי שהמיזם יכול לייצר בעולם (חברתי/סביבתי/לימודי)." },
    { id: 3, title: "🛠️ פיתוח מוצר ויישומנות", desc: "עד כמה הדגם ממחיש את הפתרון ועד כמה הוא ישים ומוכן ליציאה להתנסות/שוק." },
    { id: 2, title: "🔍 הגדרת הבעיה", desc: "ביצוע מחקר מעמיק; הגדרת קהל היעד, הבנת גורמי הבעיה והבאת נתונים תומכים ומהימנים." },
    { id: 1, title: "👥 מנהיגות וצוות", desc: "שיתוף פעולה בפיתוח המיזם הכולל ניהול וחלוקת תפקידים ברורה בה הסטודנט תורם את חלקו מתוך חוזקותיו." },
    { id: 4, title: "🤖 סיוע בחדשנות", desc: "שימוש בכלים חדשניים (AI, Code) בתהליך הפיתוח וההצגה." },
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
    
    // הצגת המדדים למנטור בסדר המקורי שלו (1 עד 7)
    const displayOrder = [...CATEGORIES_DATA].sort((a,b) => a.id - b.id);
    displayOrder.forEach((cat, index) => {
        const prefilledValue = savedScores[cat.id - 1] || 0;
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
   🔒 מנגנון ניהול חסוי, מטריצת שקיפות, ואוסקר שכבתי חכם
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

// 📊 טעינת נתוני אדמין וניקוי כפילויות ללוח השקיפות
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
            
            const uniqueVotesMap = {};
            rawVotes.forEach(v => {
                const uniqueKey = `${v.mentor.trim()}_${v.projectId}_${v.gender}`;
                uniqueVotesMap[uniqueKey] = v;
            });
            
            allVotesAdminData = Object.values(uniqueVotesMap).sort((a, b) => a.mentor.localeCompare(b.mentor, 'he'));
            
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
            
            // יצירת והזרקת כפתור "טבלת הממוצעים המלאה" היישר מעל האוסקר
            injectMatrixTableButton();
        }).catch(() => {
            adminVotesTableBody.innerHTML = `<tr><td colspan="4" style="padding:15px; text-align:center; color:#ef4444;">שגיאה בטעינת נתונים גולמיים.</td></tr>`;
        });
}

function injectMatrixTableButton() {
    if (document.getElementById("matrix-toggle-btn")) return;
    const btn = document.createElement("button");
    btn.id = "matrix-toggle-btn";
    btn.className = "orange-login-btn";
    btn.style = "background:#475569; box-shadow:none; margin-bottom:15px; font-size:0.9rem; padding:10px; border-radius:10px;";
    btn.innerHTML = "🔍 הצג מטריצת ממוצעים מלאה לכל המיזמים";
    
    const matrixContainer = document.createElement("div");
    matrixContainer.id = "matrix-table-container";
    matrixContainer.style = "display:none; width:100%; overflow-x:auto; background:#f1f5f9; border-radius:12px; padding:10px; border:1px solid #cbd5e1; margin-bottom:15px; font-size:0.75rem;";
    
    btn.onclick = () => {
        if (matrixContainer.style.display === "none") {
            buildMatrixTable(matrixContainer);
            matrixContainer.style.display = "block";
            btn.innerHTML = "🙈 הסתר מטריצת ממוצעים";
        } else {
            matrixContainer.style.display = "none";
            btn.innerHTML = "🔍 הצג מטריצת ממוצעים מלאה לכל המיזמים";
        }
    };
    
    adminCalcOscarBtn.parentNode.insertBefore(btn, adminCalcOscarBtn);
    adminCalcOscarBtn.parentNode.insertBefore(matrixContainer, adminCalcOscarBtn);
}

// בניית מטריצת השקיפות המלאה (כל מיזם וכל 7 הממוצעים שלו)
function buildMatrixTable(container) {
    if (allVotesAdminData.length === 0) return;
    
    const summary = calculateProjectAverages();
    let html = `<table style="width:100%; border-collapse:collapse; text-align:right;"><thead style="background:#cbd5e1;"><tr><th style="padding:6px;">מיזם</th><th style="padding:6px;">כללי</th>`;
    for(let i=1; i<=7; i++) html += `<th style="padding:6px;">מ ${i}</th>`;
    html += `</tr></thead><tbody>`;
    
    Object.values(summary).sort((a,b) => b.avgTotal - a.avgTotal).forEach(p => {
        const gColor = p.gender === "female" ? "#fce7f3" : "#dbeafe";
        html += `<tr style="border-bottom:1px solid #cbd5e1;">
            <td style="padding:6px; font-weight:bold; background:${gColor};">${p.id}</td>
            <td style="padding:6px; font-weight:800; color:#1e40af;">${p.avgTotal.toFixed(2)}</td>`;
        for(let i=0; i<7; i++) html += `<td style="padding:6px;">${p.catAvgs[i].toFixed(1)}</td>`;
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// פונקציית עזר לחישוב ממוצעים ואינדקס יציבות לכל מיזם
function calculateProjectAverages() {
    const projectSummary = {};
    allVotesAdminData.forEach(v => {
        const key = `${v.projectId}_${v.gender}`;
        if (!projectSummary[key]) {
            projectSummary[key] = { 
                id: v.projectId, gender: v.gender, sumTotal: 0, count: 0,
                catSums: [0,0,0,0,0,0,0], catCounts: [0,0,0,0,0,0,0]
            };
        }
        projectSummary[key].sumTotal += v.totalScore;
        projectSummary[key].count += 1;
        
        // שליפת הנתונים הגולמיים של 7 הקטגוריות
        for(let i=1; i<=7; i++) {
            let score = v[`cat${i}`] || 0;
            if(score === 0 && v.totalScore > 0) { 
                // מנגנון הגנה למקרה שהדאטה שטוחה - מפרקים את הסכום באופן יחסי
                score = Math.round(v.totalScore / 7);
            }
            projectSummary[key].catSums[i-1] += score;
            projectSummary[key].catCounts[i-1] += 1;
        }
    });
    
    const results = {};
    Object.keys(projectSummary).forEach(key => {
        const p = projectSummary[key];
        const catAvgs = p.catSums.map((sum, idx) => p.catCounts[idx] > 0 ? sum / p.catCounts[idx] : 0);
        const minCatScore = Math.min(...catAvgs.filter(x => x > 0)); // מדד היציבות (הציון הכי נמוך שלו)
        
        results[key] = {
            id: p.id,
            gender: p.gender,
            key: key,
            avgTotal: p.sumTotal / p.count,
            catAvgs: catAvgs,
            stability: minCatScore || 0
        };
    });
    return results;
}

// 🏆 מנוע האוסקר השכבתי המלא והסופי (עם שבירת שוויון יציבות וכפתורי התערבות הנהלה)
if (adminCalcOscarBtn) {
    adminCalcOscarBtn.onclick = () => {
        runOscarEngine();
    };
}

function runOscarEngine() {
    if (!allVotesAdminData || allVotesAdminData.length === 0) {
        showAlert("אין מספיק נתונים לחישוב אוסקר כרגע.");
        return;
    }
    
    const projectsMap = calculateProjectAverages();
    let allProjects = Object.values(projectsMap);
    
    let busyProjects = new Set(); // שומר את המיזמים שכבר שובצו לפרס
    let finalStandings = { projectOfTheYear: null, categories: {} };
    
    // 👑 שלב 1: בחירת מיזם השנה (ציון כללי -> יציבות -> חדשנות -> אימפקט -> הכרעה ידנית)
    if (manualAdminOverrides.projectOfTheYear) {
        finalStandings.projectOfTheYear = projectsMap[manualAdminOverrides.projectOfTheYear];
    } else {
        allProjects.sort((a, b) => {
            if (Math.abs(b.avgTotal - a.avgTotal) < 0.01) {
                if (Math.abs(b.stability - a.stability) < 0.01) {
                    if (Math.abs(b.catAvgs[4] - a.catAvgs[4]) < 0.01) { // קטגוריה 5: חדשנות
                        return b.catAvgs[5] - a.catAvgs[5]; // קטגוריה 6: אימפקט
                    }
                    return b.catAvgs[4] - a.catAvgs[4];
                }
                return b.stability - a.stability;
            }
            return b.avgTotal - a.avgTotal;
        });
        
        // בדיקה האם יש תיקו מוחלט בשלב האחרון שדורש התערבות ידנית ראשונית
        let first = allProjects[0];
        let second = allProjects[1];
        if (second && Math.abs(first.avgTotal - second.avgTotal) < 0.01 && 
            Math.abs(first.stability - second.stability) < 0.01 && 
            Math.abs(first.catAvgs[4] - second.catAvgs[4]) < 0.01 && 
            Math.abs(first.catAvgs[5] - second.catAvgs[5]) < 0.01) {
            
            // עצירה והקפצת חלונית ההשוואה הידנית שלך!
            triggerManualDecisionModal(first, second, "projectOfTheYear", null, null);
            return;
        }
        finalStandings.projectOfTheYear = first;
    }
    
    if (finalStandings.projectOfTheYear) {
        busyProjects.add(finalStandings.projectOfTheYear.key);
    }
    
    // פונקציית עזר למציאת המיזם המוביל הפנוי לקטגוריה מסוימת
    const getTopProjectForCategory = (catId) => {
        let pool = allProjects.filter(p => !busyProjects.has(p.key));
        pool.sort((a, b) => {
            if (Math.abs(b.catAvgs[catId - 1] - a.catAvgs[catId - 1]) < 0.01) {
                if (Math.abs(b.avgTotal - a.avgTotal) < 0.01) {
                    return b.stability - a.stability;
                }
                return b.avgTotal - a.avgTotal;
            }
            return b.catAvgs[catId - 1] - a.catAvgs[catId - 1];
        });
        return pool;
    };
    
    // 🥇 סבב 1: שיבוץ מקומות ראשונים לכל 7 הקטגוריות לפי סדר החשיבות
    CATEGORIES_DATA.forEach(cat => {
        finalStandings.categories[cat.id] = { place1: null, place2: null, place3: null };
        
        if (manualAdminOverrides.categories[cat.id] && manualAdminOverrides.categories[cat.id].place1) {
            finalStandings.categories[cat.id].place1 = projectsMap[manualAdminOverrides.categories[cat.id].place1];
            busyProjects.add(manualAdminOverrides.categories[cat.id].place1);
        } else {
            let pool = getTopProjectForCategory(cat.id);
            if (pool.length > 0) {
                // בדיקת תיקו מוחלט במקום הראשון בקטגוריה
                if (pool[1] && Math.abs(pool[0].catAvgs[cat.id-1] - pool[1].catAvgs[cat.id-1]) < 0.01 && Math.abs(pool[0].avgTotal - pool[1].avgTotal) < 0.01 && Math.abs(pool[0].stability - pool[1].stability) < 0.01) {
                    triggerManualDecisionModal(pool[0], pool[1], "place1", cat.id, cat.title);
                    throw "Manual Break Required"; // עצירת המנוע זמנית להכרעה
                }
                finalStandings.categories[cat.id].place1 = pool[0];
                busyProjects.add(pool[0].key);
            }
        }
    });
    
    // 🥈 סבב 2: שיבוץ מקומות שניים לכל הקטגוריות
    CATEGORIES_DATA.forEach(cat => {
        if (manualAdminOverrides.categories[cat.id] && manualAdminOverrides.categories[cat.id].place2) {
            finalStandings.categories[cat.id].place2 = projectsMap[manualAdminOverrides.categories[cat.id].place2];
            busyProjects.add(manualAdminOverrides.categories[cat.id].place2);
        } else {
            let pool = getTopProjectForCategory(cat.id);
            if (pool.length > 0) {
                if (pool[1] && Math.abs(pool[0].catAvgs[cat.id-1] - pool[1].catAvgs[cat.id-1]) < 0.01 && Math.abs(pool[0].avgTotal - pool[1].avgTotal) < 0.01 && Math.abs(pool[0].stability - pool[1].stability) < 0.01) {
                    triggerManualDecisionModal(pool[0], pool[1], "place2", cat.id, cat.title);
                    throw "Manual Break Required";
                }
                finalStandings.categories[cat.id].place2 = pool[0];
                busyProjects.add(pool[0].key);
            }
        }
    });
    
    // 🥉 סבב 3: שיבוץ מקומות שלישיים לכל הקטגוריות
    CATEGORIES_DATA.forEach(cat => {
        if (manualAdminOverrides.categories[cat.id] && manualAdminOverrides.categories[cat.id].place3) {
            finalStandings.categories[cat.id].place3 = projectsMap[manualAdminOverrides.categories[cat.id].place3];
            busyProjects.add(manualAdminOverrides.categories[cat.id].place3);
        } else {
            let pool = getTopProjectForCategory(cat.id);
            if (pool.length > 0) {
                if (pool[1] && Math.abs(pool[0].catAvgs[cat.id-1] - pool[1].catAvgs[cat.id-1]) < 0.01 && Math.abs(pool[0].avgTotal - pool[1].avgTotal) < 0.01 && Math.abs(pool[0].stability - pool[1].stability) < 0.01) {
                    triggerManualDecisionModal(pool[0], pool[1], "place3", cat.id, cat.title);
                    throw "Manual Break Required";
                }
                finalStandings.categories[cat.id].place3 = pool[0];
                busyProjects.add(pool[0].key);
            }
        }
    });
    
    renderFinalOscarStandingsHTML(finalStandings);
}

// חלונית השוואה Side-by-Side חכמה למנהלת הכנס לקבלת החלטה ידנית
function triggerManualDecisionModal(p1, p2, fieldType, catId, catTitle) {
    const modal = document.createElement("div");
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center; padding:15px; direction:rtl;";
    
    let titleText = fieldType === "projectOfTheYear" ? "👑 תיקו מוחלט בפרס מיזם השנה!" : `🏆 תיקו מוחלט ב-${catTitle} (${fieldType === 'place1' ? 'מקום 1' : fieldType === 'place2' ? 'מקום 2' : 'מקום 3'})`;
    
    let cardHTML = (p) => `
        <div style="flex:1; background:white; border-radius:12px; padding:15px; border:2px solid #cbd5e1; text-align:center;">
            <h4 style="font-size:1.2rem; margin-bottom:2px; color:#1e3a8a;">מיזם מספר ${p.id}</h4>
            <div style="font-size:0.8rem; color:#64748b; margin-bottom:8px;">${p.gender === 'female' ? '🚺 בנות' : '🚹 בנים'}</div>
            <div style="font-size:1.4rem; font-weight:900; color:#16a34a; margin-bottom:10px;">${p.avgTotal.toFixed(2)} <span style="font-size:0.75rem; font-weight:normal; color:#475569;">ציון כללי</span></div>
            <div style="text-align:right; font-size:0.8rem; background:#f8fafc; padding:8px; border-radius:8px; display:flex; flex-direction:column; gap:4px;">
                <div>💡 חדשנות: <strong>${p.catAvgs[4].toFixed(1)}</strong></div>
                <div>🌍 אימפקט: <strong>${p.catAvgs[5].toFixed(1)}</strong></div>
                <div>🛠️ מוצר: <strong>${p.catAvgs[2].toFixed(1)}</strong></div>
                <div>📉 יציבות (מינימום): <strong>${p.stability.toFixed(1)}</strong></div>
            </div>
            <button id="select-btn-${p.key}" style="margin-top:12px; width:100%; background:#2563eb; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;">🥇 קבע כזוכה</button>
        </div>
    `;
    
    modal.innerHTML = `
        <div style="background:#f1f5f9; width:100%; max-width:550px; border-radius:16px; padding:20px; box-shadow:0 10px 25px rgba(0,0,0,0.3);">
            <h3 style="text-align:center; color:#0f172a; margin-bottom:5px;">${titleText}</h3>
            <p style="text-align:center; font-size:0.85rem; color:#475569; margin-bottom:15px;">הנתונים שווים לחלוטין. בחרי ידנית מי הצוות שיעלה לבמה:</p>
            <div style="display:flex; gap:15px; margin-bottom:15px;">
                ${cardHTML(p1)}
                ${cardHTML(p2)}
            </div>
            <button id="close-manual-modal" style="width:100%; background:#64748b; color:white; border:none; padding:8px; border-radius:8px; cursor:pointer;">בטל חישוב</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const applySelection = (selectedKey) => {
        if (fieldType === "projectOfTheYear") {
            manualAdminOverrides.projectOfTheYear = selectedKey;
        } else {
            if (!manualAdminOverrides.categories[catId]) manualAdminOverrides.categories[catId] = {};
            manualAdminOverrides.categories[catId][fieldType] = selectedKey;
        }
        document.body.removeChild(modal);
        // הרצה מחדש חלקה של המנוע עם הבחירה החדשה שלך
        setTimeout(() => { runOscarEngine(); }, 100);
    };
    
    modal.querySelector(`#select-btn-${p1.key}`).onclick = () => applySelection(p1.key);
    modal.querySelector(`#select-btn-${p2.key}`).onclick = () => applySelection(p2.key);
    modal.querySelector("#close-manual-modal").onclick = () => document.body.removeChild(modal);
}

// רינדור חזותי מפואר של כספת האוסקר על המסך
function renderFinalOscarStandingsHTML(standings) {
    let resHTML = `<h3 style="font-size:1.15rem; color:#1e3a8a; border-bottom:2px solid #fbbf24; padding-bottom:4px; margin-bottom:12px;">🏆 תוצאות האוסקר הסופיות והרשמיות:</h3>`;
    
    // 👑 כרטיסיית מיזם השנה המפוארת
    if (standings.projectOfTheYear) {
        const p = standings.projectOfTheYear;
        resHTML += `
            <div style="padding:16px; background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius:16px; border:2px solid #f59e0b; box-shadow:0 4px 10px rgba(245,158,11,0.1); margin-bottom:15px; direction:rtl;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:900; font-size:1.2rem; color:#78350f;">👑 מיזם השנה של הכנס!</span>
                    <span style="font-size:1.3rem; color:#d97706; font-weight:900;">${p.avgTotal.toFixed(2)}</span>
                </div>
                <div style="font-size:1.1rem; color:#1e3a8a; font-weight:bold; margin-top:4px;">מיזם מספר ${p.id} <span style="font-size:0.8rem; font-weight:normal; color:#475569;">(${p.gender === 'female' ? '🚺 בנות' : '🚹 בנים'})</span></div>
            </div>
        `;
    }
    
    // 7 כרטיסיות הקטגוריות
    CATEGORIES_DATA.forEach(cat => {
        const cData = standings.categories[cat.id] || { place1: null, place2: null, place3: null };
        
        let rowHTML = (placeLabel, icon, proj) => {
            if (!proj) return `<div style="font-size:0.85rem; color:#94a3b8; padding:3px 0;">${icon} ${placeLabel}: טרם שובץ</div>`;
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; padding:4px 0; border-bottom:1px dashed #e2e8f0;">
                    <span style="font-weight:bold; color:#334155;">${icon} ${placeLabel}: <span style="color:#2563eb;">מיזם ${proj.id}</span> <span style="font-size:0.75rem; font-weight:normal; color:#64748b;">(${proj.gender==='female'?'בנות':'בנים'})</span></span>
                    <span style="font-weight:bold; color:#475569; font-size:0.85rem;">${proj.catAvgs[cat.id-1].toFixed(1)} נק'</span>
                </div>
            `;
        };
        
        resHTML += `
            <div style="padding:12px; background:white; border-radius:14px; border:1px solid #e2e8f0; margin-bottom:10px; box-shadow:0 2px 4px rgba(0,0,0,0.01); direction:rtl;">
                <div style="font-weight:800; font-size:0.95rem; color:#1e3a8a; margin-bottom:6px; border-right:3px solid #fbbf24; padding-right:6px;">${cat.title}</div>
                <div style="display:flex; flex-direction:column; gap:2px;">
                    ${rowHTML("מקום ראשון", "🥇", cData.place1)}
                    ${rowHTML("מקום שני", "🥈", cData.place2)}
                    ${rowHTML("מקום שלישי", "🥉", cData.place3)}
                </div>
            </div>
        `;
    });
    
    if (oscarResultsArea) {
        oscarResultsArea.innerHTML = resHTML;
        oscarResultsArea.style.display = 'block';
    }
    
    showAlert("✨ תוצאות האוסקר השכבתיות חושבו בדיוק מקסימלי וללא כפל זכיות!");
}
try { window.runOscarEngine = runOscarEngine; } catch(e){}
