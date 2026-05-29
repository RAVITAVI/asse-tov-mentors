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

const CATEGORIES_DATA = [
    { id: 1, title: "馃懃 诪谞讛讬讙讜转 讜爪讜讜转", desc: "砖讬转讜祝 驻注讜诇讛 讘驻讬转讜讞 讛诪讬讝诐 讛讻讜诇诇 谞讬讛讜诇 讜讞诇讜拽转 转驻拽讬讚讬诐 讘专讜专讛 讘讛 讛住讟讜讚谞讟 转讜专诐 讗转 讞诇拽讜 诪转讜讱 讞讜讝拽讜转讬讜." },
    { id: 2, title: "馃攳 讛讙讚专转 讛讘注讬讛", desc: "讘讬爪讜注 诪讞拽专 诪注诪讬拽; 讛讙讚专转 拽讛诇 讛讬注讚, 讛讘谞转 讙讜专诪讬 讛讘注讬讛 讜讛讘讗转 谞转讜谞讬诐 转讜诪讻讬诐 讜诪讛讬诪谞讬诐." },
    { id: 3, title: "馃洜锔?驻讬转讜讞 诪讜爪专 讜讬讬砖讜诪谞讜转", desc: "注讚 讻诪讛 讛讚讙诐 诪诪讞讬砖 讗转 讛驻转专讜谉 讜注讚 讻诪讛 讛讜讗 讬砖讬诐 讜诪讜讻谉 诇讬爪讬讗讛 诇讛转谞住讜转/砖讜拽." },
    { id: 4, title: "馃 住讬讜注 讘讞讚砖谞讜转", desc: "砖讬诪讜砖 讘讻诇讬诐 讞讚砖谞讬讬诐 (AI, Code) 讘转讛诇讬讱 讛驻讬转讜讞 讜讛讛爪讙讛." },
    { id: 5, title: "馃挕 讞讚砖谞讜转 讜诪拽讜专讬讜转", desc: "讬爪讬专转讬讜转 讜讞砖讬讘讛 诪讞讜抓 诇拽讜驻住讛 讘讬讞住 诇诪讬讝诪讬诐 讜讗讜 诪讜爪专讬诐 拽讬讬诪讬诐 讘砖讜拽." },
    { id: 6, title: "馃實 讗讬诪驻拽讟 讜转专讜诪讛", desc: "驻讜讟谞爪讬讗诇 讛砖讬谞讜讬 砖讛诪讬讝诐 讬讻讜诇 诇讬讬爪专 讘注讜诇诐 (讞讘专转讬/住讘讬讘转讬/诇讬诪讜讚讬)." },
    { id: 7, title: "馃搳 驻专讝谞讟爪讬讛 / 讞讜讜讬讛", desc: "讬讻讜诇转 砖讻谞讜注 讜砖讬讜讜拽, 诪讘谞讛 讛驻讬抓' 讜谞专讗讜转 讛讚讜讻谉/驻讜住讟专." }
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
        mentorDropdown.innerHTML = '<option value="">讘讞专/讬 讗转 砖诪讱 诪讛专砖讬诪讛...</option>';
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

// 馃専 转讬拽讜谉 驻讜谞拽爪讬讬转 讛讛讝专拽讛 诇讙专讬讚讬诐 讛诪转讗讬诪讬诐 (讘谞讬诐 诇讞讜讚 讜讘谞讜转 诇讞讜讚) 馃専
function fetchAndDisplayProjects() {
    const matches = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) return;
    const csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=Projects`;
    
    fetch(csvUrl).then(r => r.text()).then(text => {
        const lines = text.split(/\r?\n/);
        
        // 谞讬拽讜讬 诪诇讗 砖诇 砖谞讬 讛讙专讬讚讬诐 讘诇讜讘讬 诇驻谞讬 讛讝专拽转 讛谞转讜谞讬诐
        boysProjectsGrid.innerHTML = ""; 
        girlsProjectsGrid.innerHTML = "";
        rawProjectsData = [];
        
        let total = 0, voted = 0;
        for (let i = 1; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            const pNo = parseInt(cols[1]); if (!pNo) continue;
            
            let pGender = cols[5] ? cols[5].trim().toLowerCase() : "";
            if (pGender.includes('female') || pGender.includes('讘转') || pGender.includes('讘谞讜转')) pGender = 'female'; else pGender = 'male';
            
            rawProjectsData.push({ no: pNo, title: cols[2], gender: pGender });
            total++;
            
            const done = currentMentorVotesRow[pNo] || false; if (done) voted++;
            
            const btn = document.createElement('div');
            btn.className = `project-grid-button ${done ? 'color-green' : ''}`;
            btn.innerHTML = `<div class="proj-number">${pNo}</div><div class="proj-title">${cols[2]}</div><div class="proj-status-label">${done ? '鉁?讚讜专讙' : '讟专诐 讚讜专讙'}</div>`;
            
            btn.onclick = () => openRatingPage(pNo, cols[2], pGender);
            
            // 馃敺 讛转讬拽讜谉 讛诪专讻讝讬: 讛讝专拽讛 诪讚讜讬拽转 诇讙专讬讚 讛讘谞讬诐 讗讜 诇讙专讬讚 讛讘谞讜转 讘讛转讗诪讛 诪讜讞诇讟转
            if (pGender === 'female') {
                girlsProjectsGrid.appendChild(btn); 
            } else {
                boysProjectsGrid.appendChild(btn); 
            }
        }
        progressCount.innerText = `${voted}/${total}`;
        progressBarFill.style.width = `${total > 0 ? (voted / total) * 100 : 0}%`;
    });
}

function getFeedbackText(val) {
    if (val == 0) return "讟专诐 讚讜专讙";
    if (val >= 1 && val <= 3) return "讟注讜谉 砖讬驻讜专";
    if (val >= 4 && val <= 6) return "讘讬谞讜谞讬 / 讘住讬住讬";
    if (val >= 7 && val <= 8) return "讟讜讘 诪讗讜讚";
    return "诪爪讜讬谉 讜讬讜爪讗 讚讜驻谉";
}

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
                    <span id="feedback-${cat.id}" class="cat-card-feedback unrated">讟专诐 讚讜专讙</span>
                </div>
            </div>
            <div class="slider-control-group">
                <input type="range" min="0" max="10" value="0" class="full-page-slider" id="slider-${cat.id}">
                <div class="manual-controls-row">
                    <button class="step-btn minus" onclick="stepValue(${cat.id}, -1)">鈭?/button>
                    <input type="number" id="input-${cat.id}" class="manual-score-input" min="1" max="10" placeholder="?">
                    <button class="step-btn plus" onclick="stepValue(${cat.id}, 1)">+</button>
                </div>
            </div>
        `;
        categoriesContainer.appendChild(card);
        const slider = card.querySelector(`#slider-${cat.id}`);
        const input = card.querySelector(`#input-${cat.id}`);
        slider.oninput = () => updateSync(cat.id, slider.value, 'slider');
        input.oninput = () => updateSync(cat.id, input.value, 'input');
    });
}

function updateSync(id, val, source) {
    const slider = document.getElementById(`slider-${id}`);
    const input = document.getElementById(`input-${id}`);
    const feedback = document.getElementById(`feedback-${id}`);
    let v = parseInt(val) || 0;
    if (v > 10) v = 10;
    if (source !== 'slider') slider.value = v;
    if (source !== 'input') input.value = (v === 0) ? "" : v;

    if (v === 0) {
        feedback.innerText = "讟专诐 讚讜专讙";
        feedback.className = "cat-card-feedback unrated";
    } else {
        feedback.innerText = `${v} | ${getFeedbackText(v)}`;
        feedback.className = "cat-card-feedback rated";
        if (v <= 3) feedback.className += " low";
        else if (v <= 6) feedback.className += " mid";
        else if (v <= 8) feedback.className += " high";
        else feedback.className += " perfect";
    }
}

window.stepValue = function(id, delta) {
    const slider = document.getElementById(`slider-${id}`);
    let newVal = parseInt(slider.value) + delta;
    if (newVal > 10) newVal = 10; if (newVal < 1) newVal = 1;
    updateSync(id, newVal, 'manual');
}

function openRatingPage(pNo, pTitle, pGender) {
    currentSelectedProjectNo = pNo; currentSelectedProjectGender = pGender;
    modalProjectTitle.innerText = pTitle; modalProjectNo.innerText = "诪讬讝诐 诪住驻专 " + pNo;
    modalProjectGender.innerText = pGender === 'female' ? "诪讬讝诐 讘谞讜转" : "诪讬讝诐 讘谞讬诐";
    modalProjectGender.className = `gender-badge ${pGender}`;
    renderRatingCategories();
    showScreen(ratingScreen);
}

modalSaveBtn.onclick = function() {
    const scores = []; let sum = 0;
    for (let i = 1; i <= 7; i++) {
        const val = parseInt(document.getElementById(`slider-${i}`).value);
        if (val === 0) { alert("讞讜讘讛 诇讚专讙 讗转 讻诇 讛拽讟讙讜专讬讜转!"); return; }
        scores.push(val); sum += val;
    }
    modalSaveBtn.innerText = "砖讜诪专... 鈴?; modalSaveBtn.disabled = true;
    fetch(APPS_SCRIPT_URL, {
        method: "POST", mode: "no-cors", cache: "no-cache",
        body: JSON.stringify({ mentorName: currentMentor, projectNumber: currentSelectedProjectNo, gender: currentSelectedProjectGender, cat1: scores[0], cat2: scores[1], cat3: scores[2], cat4: scores[3], cat5: scores[4], cat6: scores[5], cat7: scores[6], totalScore: sum })
    }).then(() => {
        alert("谞砖诪专 讘讛爪诇讞讛!"); modalSaveBtn.innerText = "馃捑 砖诪讜专 讚讬专讜讙 讜讛诪砖讱";
        modalSaveBtn.disabled = false; showScreen(lobbyScreen); fetchMentorVotesAndRenderLobby();
    });
};

enterBtn.onclick = () => {
    if (!mentorDropdown.value) return alert("讗谞讗 讘讞专/讬 砖诐 诪转讜讱 讛专砖讬诪讛!");
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
        if (p) openRatingPage(p.no, p.title, p.gender); else openRatingPage(num, `诪讬讝诐 ${num}`, gen);
    });
};

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => scannerModal.style.display = 'none');
    } else {
        scannerModal.style.display = 'none';
    }
}
scannerCloseX.onclick = stopScanner;
loadMentorsFromServer();
