const loginScreen = document.getElementById('login-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const ratingScreen = document.getElementById('rating-screen'); 
const categoriesContainer = document.getElementById('categories-container');

const mentorDropdown = document.getElementById('mentor-dropdown');
const enterBtn = document.getElementById('enterBtn');
const userDisplayName = document.getElementById('user-display-name');
const progressCount = document.getElementById('progress-count');
const progressBarFill = document.getElementById('progress-bar-fill');
const boysProjectsGrid = document.getElementById('boys-projects-grid');
const girlsProjectsGrid = document.getElementById('girls-projects-grid');
const scanQrBtn = document.getElementById('scan-qr-btn');

const scannerModal = document.getElementById('scanner-modal');
const scannerCloseX = document.getElementById('scanner-close-x');
let html5QrcodeScanner = null;

const ratingBackBtn = document.getElementById('rating-back-btn');
const modalProjectTitle = document.getElementById('modal-project-title');
const modalProjectNo = document.getElementById('modal-project-no');
const modalProjectGender = document.getElementById('modal-project-gender');
const modalSaveBtn = document.getElementById('modal-save-btn');

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1RyrAzEhinN8quqqbj6H_gCdK625z1Hjt7DNOANOCnF0/edit?usp=sharing";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzyngk78-25S0ihQLE_zlvBW7rI6Syw_6fzICVULsclXVc1Ruhr9twlCN7SwVjKXJ2-/exec";

let currentMentor = ""; 
let rawProjectsData = []; 
let currentMentorVotesRow = {}; 
let currentSelectedProjectNo = null;
let currentSelectedProjectGender = "";

// 📜 רשימת הקטגוריות והתיאורים מתוך הפוסטר
const CATEGORIES_DATA = [
    { id: 1, title: "👥 מנהיגות וצוות", desc: "שיתוף פעולה בפיתוח המיזם הכולל ניהול וחלוקת תפקידים ברורה בה הסטודנט תורם את חלקו מתוך חוזקותיו." },
    { id: 2, title: "🔍 הגדרת הבעיה", desc: "ביצוע מחקר מעמיק; הגדרת קהל היעד, הבנת גורמי הבעיה והבאת נתונים תומכים ומהימנים." },
    { id: 3, title: "🛠️ פיתוח מוצר ויישומנות", desc: "עד כמה הדגם ממחיש את הפתרון ועד כמה הוא ישים ומוכן ליציאה להתנסות/שוק." },
    { id: 4, title: "🤖 סיוע בחדשנות", desc: "שימוש בכלים חדשניים (AI, Code) בתהליך הפיתוח וההצגה." },
    { id: 5, title: "💡 חדשנות ומקוריות", desc: "יצירתיות וחשיבה מחוץ לקופסה ביחס למיזמים ואו מוצרים קיימים בשוק." },
    { id: 6, title: "🌍 אימפקט ותרומה", desc: "פוטנציאל השינוי שהמיזם יכול לייצר בעולם (חברתי/סביבתי/לימודי)." },
    { id: 7, title: "📊 פרזנטציה / חוויה", desc: "יכולת שכנוע ושיווק, מבנה הפיץ' ונראות הדוכן/פוסטר." }
];

function showScreen(targetScreen) {
    loginScreen.classList.remove('active');
    lobbyScreen.classList.remove('active');
    ratingScreen.classList.remove('active');
    targetScreen.classList.add('active');
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else { current += char; }
    }
    result.push(current.trim());
    return result.map(col => col.replace(/^"|"$/g, '').trim());
}

function loadMentorsFromServer() {
    const matches = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) return;
    const csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=Mentors`;
    fetch(csvUrl).then(r => r.text()).then(text => {
        const lines = text.split(/\r?\n/);
        mentorDropdown.innerHTML = '<option value="">בחר שופט/ת...</option>';
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const columns = parseCSVLine(lines[i]);
            if (columns[1]) {
                const opt = document.createElement('option');
                opt.value = columns[1]; opt.innerText = columns[1];
                mentorDropdown.appendChild(opt);
            }
        }
    });
}

function fetchMentorVotesAndRenderLobby() {
    const matches = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) return;
    const csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=Mentors_Votes`;
    fetch(csvUrl).then(r => r.text()).then(text => {
        const lines = text.split(/\r?\n/);
        currentMentorVotesRow = {}; 
        for (let i = 1; i < lines.length; i++) {
            const columns = parseCSVLine(lines[i]);
            if (columns[1] && columns[1].trim() === currentMentor.trim()) {
                currentMentorVotesRow[parseInt(columns[2])] = true;
            }
        }
        fetchAndDisplayProjects();
    });
}

function fetchAndDisplayProjects() {
    const matches = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) return;
    const csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=Projects`;
    fetch(csvUrl).then(r => r.text()).then(text => {
        const lines = text.split(/\r?\n/);
        boysProjectsGrid.innerHTML = ""; girlsProjectsGrid.innerHTML = "";
        rawProjectsData = [];
        let total = 0, voted = 0;
        for (let i = 1; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            const pNo = parseInt(cols[1]); if (!pNo) continue;
            let pGender = cols[5] ? cols[5].trim().toLowerCase() : "";
            if (pGender.includes('female') || pGender.includes('בת')) pGender = 'female'; else pGender = 'male';
            rawProjectsData.push({ no: pNo, title: cols[2], gender: pGender });
            total++;
            const done = currentMentorVotesRow[pNo] || false; if (done) voted++;
            const btn = document.createElement('div');
            btn.className = `project-grid-button ${done ? 'color-green' : 'color-neutral'}`;
            btn.innerHTML = `<div class="proj-number">${pNo}</div><div class="proj-title">${cols[2]}</div><div class="proj-status-label">${done ? '✓ דורג' : 'טרם דורג'}</div>`;
            btn.onclick = () => openRatingPage(pNo, cols[2], pGender);
            if (pGender === 'female') girlsProjectsGrid.appendChild(btn); else boysProjectsGrid.appendChild(btn);
        }
        progressCount.innerText = `${voted}/${total}`;
        progressBarFill.style.width = `${total > 0 ? (voted / total) * 100 : 0}%`;
    });
}

// 🌟 פונקציה לעדכון טקסט משוב מילולי דינמי 🌟
function getFeedbackText(val) {
    if (val == 0) return "טרם דורג";
    if (val >= 1 && val <= 3) return "🔴 טעון שיפור";
    if (val >= 4 && val <= 6) return "🟡 בינוני / בסיסי";
    if (val >= 7 && val <= 8) return "🟢 טוב מאוד";
    return "✨ מצוין ויוצא דופן";
}

// 🔨 יצירת הקטגוריות במסך הדירוג המלא
function renderRatingCategories() {
    categoriesContainer.innerHTML = "";
    CATEGORIES_DATA.forEach(cat => {
        const card = document.createElement('div');
        card.className = "category-card-row";
        card.innerHTML = `
            <div class="cat-card-header">
                <div class="title-block">
                    <span class="cat-card-title">${cat.title}</span>
                    <span class="cat-card-desc">${cat.desc}</span>
                </div>
                <div class="score-badge-wrapper">
                    <span id="feedback-${cat.id}" class="cat-card-feedback unrated">טרם דורג</span>
                </div>
            </div>
            
            <div class="slider-control-group">
                <input type="range" min="0" max="10" value="0" class="full-page-slider" id="slider-${cat.id}">
                
                <div class="manual-controls-row">
                    <button class="step-btn minus" onclick="stepValue(${cat.id}, -1)">−</button>
                    <input type="number" id="input-${cat.id}" class="manual-score-input" min="1" max="10" placeholder="?">
                    <button class="step-btn plus" onclick="stepValue(${cat.id}, 1)">+</button>
                </div>
            </div>
        `;
        categoriesContainer.appendChild(card);

        // חיבור אירועי עדכון הדדיים
        const slider = card.querySelector(`#slider-${cat.id}`);
        const input = card.querySelector(`#input-${cat.id}`);
        const feedback = card.querySelector(`#feedback-${cat.id}`);

        slider.oninput = () => updateSync(cat.id, slider.value, 'slider');
        input.oninput = () => {
            let v = parseInt(input.value);
            if (v > 10) v = 10; if (v < 1) v = 1;
            updateSync(cat.id, v, 'input');
        };
    });
}

function updateSync(id, val, source) {
    const slider = document.getElementById(`slider-${id}`);
    const input = document.getElementById(`input-${id}`);
    const feedback = document.getElementById(`feedback-${id}`);
    const v = parseInt(val) || 0;

    if (source !== 'slider') slider.value = v;
    if (source !== 'input') input.value = (v === 0) ? "" : v;

    feedback.innerText = (v === 0) ? "טרם דורג" : `${v} | ${getFeedbackText(v)}`;
    feedback.className = `cat-card-feedback ${v === 0 ? 'unrated' : 'rated'}`;
}

window.stepValue = function(id, delta) {
    const slider = document.getElementById(`slider-${id}`);
    let newVal = parseInt(slider.value) + delta;
    if (newVal > 10) newVal = 10; if (newVal < 1) newVal = 1;
    updateSync(id, newVal, 'manual');
}

function openRatingPage(pNo, pTitle, pGender) {
    currentSelectedProjectNo = pNo; currentSelectedProjectGender = pGender;
    modalProjectTitle.innerText = pTitle; modalProjectNo.innerText = "מיזם מספר " + pNo;
    modalProjectGender.innerText = pGender === 'female' ? "מיזם בנות" : "מיזם בנים";
    modalProjectGender.className = `gender-badge ${pGender}`;
    renderRatingCategories();
    showScreen(ratingScreen);
}

modalSaveBtn.onclick = function() {
    const scores = []; let sum = 0;
    for (let i = 1; i <= 7; i++) {
        const val = parseInt(document.getElementById(`slider-${i}`).value);
        if (val === 0) { alert("חובה לדרג את כל הקטגוריות!"); return; }
        scores.push(val); sum += val;
    }
    modalSaveBtn.innerText = "שומר... ⏳"; modalSaveBtn.disabled = true;
    fetch(APPS_SCRIPT_URL, {
        method: "POST", mode: "no-cors", cache: "no-cache",
        body: JSON.stringify({ mentorName: currentMentor, projectNumber: currentSelectedProjectNo, gender: currentSelectedProjectGender, cat1: scores[0], cat2: scores[1], cat3: scores[2], cat4: scores[3], cat5: scores[4], cat6: scores[5], cat7: scores[6], totalScore: sum })
    }).then(() => {
        alert("נשמר בהצלחה!"); modalSaveBtn.innerText = "💾 שמור דירוג והמשך";
        modalSaveBtn.disabled = false; showScreen(lobbyScreen); fetchMentorVotesAndRenderLobby();
    });
};

enterBtn.onclick = () => {
    if (!mentorDropdown.value) return alert("בחר שם!");
    currentMentor = mentorDropdown.value; userDisplayName.innerText = currentMentor;
    showScreen(lobbyScreen); fetchMentorVotesAndRenderLobby();
};

ratingBackBtn.onclick = () => showScreen(lobbyScreen);

scanQrBtn.onclick = () => {
    scannerModal.style.display = 'flex';
    html5QrcodeScanner = new Html5Qrcode("qr-reader");
    html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (text) => {
        const raw = text.trim().toUpperCase();
        const num = parseInt(raw.replace(/[^\d]/g, ''));
        const gen = raw.startsWith('G') ? 'female' : 'male';
        stopScanner();
        const p = rawProjectsData.find(x => x.no === num && x.gender === gen);
        if (p) openRatingPage(p.no, p.title, p.gender); else openRatingPage(num, `מיזם ${num}`, gen);
    });
};

function stopScanner() {
    if (html5QrcodeScanner) html5QrcodeScanner.stop().then(() => scannerModal.style.display = 'none');
}
scannerCloseX.onclick = stopScanner;
loadMentorsFromServer();
