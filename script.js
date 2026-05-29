const loginScreen = document.getElementById('login-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const mentorDropdown = document.getElementById('mentor-dropdown');
const enterBtn = document.getElementById('enterBtn');
const userDisplayName = document.getElementById('user-display-name');
const progressCount = document.getElementById('progress-count');
const progressBarFill = document.getElementById('progress-bar-fill');
const boysProjectsGrid = document.getElementById('boys-projects-grid');
const girlsProjectsGrid = document.getElementById('girls-projects-grid');
const scanQrBtn = document.getElementById('scan-qr-btn');

// רכיבי חלון קופץ מצלמה
const scannerModal = document.getElementById('scanner-modal');
const scannerCloseX = document.getElementById('scanner-close-x');
let html5QrcodeScanner = null;

// 🔹 קישור הגוגל שיטס הייעודי של המנטורים
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1RyrAzEhinN8quqqbj6H_gCdK625z1Hjt7DNOANOCnF0/edit?usp=sharing";

let currentMentor = ""; 
let rawProjectsData = []; 
let currentMentorVotesRow = {}; 

function showScreen(targetScreen) {
    loginScreen.classList.remove('active');
    lobbyScreen.classList.remove('active');
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

// משיכת רשימת המנטורים
function loadMentorsFromServer() {
    const matches = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) return;
    const csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=Mentors`;
    
    fetch(csvUrl)
        .then(response => response.text())
        .then(text => {
            const lines = text.split(/\r?\n/);
            mentorDropdown.innerHTML = '<option value="">בחר שופט/ת...</option>';
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const columns = parseCSVLine(lines[i]);
                const mentorName = columns[1];
                if (mentorName) {
                    const option = document.createElement('option');
                    option.value = mentorName;
                    option.innerText = mentorName;
                    mentorDropdown.appendChild(option);
                }
            }
        }).catch(err => console.error("שגיאה בטעינת מנטורים:", err));
}

// משיכת הצבעות קודמות
function fetchMentorVotesAndRenderLobby() {
    const matches = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) return;
    const csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=Mentors_Votes`;

    fetch(csvUrl)
        .then(response => response.text())
        .then(text => {
            const lines = text.split(/\r?\n/);
            currentMentorVotesRow = {}; 
            
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const columns = parseCSVLine(lines[i]);
                const voteMentorName = columns[1];   
                const voteProjectNo = parseInt(columns[2]); 
                
                if (voteMentorName && voteMentorName.trim() === currentMentor.trim()) {
                    currentMentorVotesRow[voteProjectNo] = true;
                }
            }
            fetchAndDisplayProjects();
        }).catch(err => {
            console.error("שגיאה בטעינת הצבעות מנטור:", err);
            fetchAndDisplayProjects(); 
        });
}

// 🌟 משיכת המיזמים עם מנגנון איתור עמודות דינמי לפי כותרת
function fetchAndDisplayProjects() {
    const matches = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) return;
    const csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=Projects`;

    fetch(csvUrl)
        .then(response => response.text())
        .then(text => {
            const lines = text.split(/\r?\n/);
            boysProjectsGrid.innerHTML = "";
            girlsProjectsGrid.innerHTML = "";
            rawProjectsData = [];
            
            if (lines.length < 2) return;

            // 🔍 מוצאים את מיקומי העמודות לפי שורת הכותרת (שורה 0)
            const headers = parseCSVLine(lines[0]);
            const idxProjectNo = headers.findIndex(h => h.toLowerCase().includes('number') || h.includes('מספר') || h.includes('מיזם'));
            const idxTitle = headers.findIndex(h => h.toLowerCase().includes('title') || h.includes('שם') || h.includes('יוזמה'));
            const idxGender = headers.findIndex(h => h.toLowerCase().includes('gender') || h.includes('מגדר') || h.includes('בנים'));

            // הגדרת ברירות מחדל אם משהו לא נמצא במאה אחוז
            const pNoId = idxProjectNo !== -1 ? idxProjectNo : 1;
            const pTitleId = idxTitle !== -1 ? idxTitle : 2;
            const pGenderId = idxGender !== -1 ? idxGender : 4;

            let totalProjectsCount = 0;
            let votedProjectsCount = 0;

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const columns = parseCSVLine(lines[i]);
                
                const projectNo = parseInt(columns[pNoId]);     
                const projectTitle = columns[pTitleId];            
                const projectGender = columns[pGenderId] ? columns[pGenderId].trim() : ""; 
                
                if (projectNo) {
                    totalProjectsCount++;
                    const isVotedByMe = currentMentorVotesRow[projectNo] || false;
                    if (isVotedByMe) votedProjectsCount++;

                    const projectButton = document.createElement('div');
                    
                    if (isVotedByMe) {
                        projectButton.className = 'project-grid-button color-green';
                        projectButton.innerHTML = `<div class="proj-number">${projectNo}</div><div class="proj-title">${projectTitle}</div><div class="proj-status-label">✓ דורג</div>`;
                    } else {
                        projectButton.className = 'project-grid-button color-neutral';
                        projectButton.innerHTML = `<div class="proj-number">${projectNo}</div><div class="proj-title">${projectTitle}</div><div class="proj-status-label">טרם דורג</div>`;
                    }

                    projectButton.onclick = function() {
                        if (isVotedByMe) {
                            alert("מיזם " + projectNo + " כבר דורג! בשלב הבא נפתח כאן את חלון עדכון הציונים.");
                        } else {
                            alert("כדי לדרג את מיזם מספר " + projectNo + " בפעם הראשונה, עליכם לבקר בדוכן הפיזי שלו ולסרוק את הברקוד שעל השולחן! 📷");
                        }
                    };

                    // 🔷 סינון מדויק לחלוטין: בודק אם הערך בעמודת המגדר שווה ל-"בנות"
                    if (projectGender === 'בנות') {
                        girlsProjectsGrid.appendChild(projectButton);
                    } else {
                        boysProjectsGrid.appendChild(projectButton);
                    }
                }
            }

            progressCount.innerText = `${votedProjectsCount}/${totalProjectsCount}`;
            const percentage = totalProjectsCount > 0 ? (votedProjectsCount / totalProjectsCount) * 100 : 0;
            progressBarFill.style.width = `${percentage}%`;

        }).catch(err => console.error("שגיאה בטעינת מיזמים:", err));
}

loadMentorsFromServer();

enterBtn.onclick = function() {
    const selectedMentor = mentorDropdown.value;
    if (selectedMentor === "") {
        alert("אנא בחר/י את שמך מתוך הרשימה לפני ההמשך!");
        return;
    }
    currentMentor = selectedMentor; 
    userDisplayName.innerText = currentMentor; 
    showScreen(lobbyScreen);
    fetchMentorVotesAndRenderLobby();
};

// הפעלת מצלמת הסורק
scanQrBtn.onclick = function() {
    scannerModal.style.display = 'flex';
    html5QrcodeScanner = new Html5Qrcode("qr-reader");
    html5QrcodeScanner.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { 
            const rawText = decodedText.trim().toUpperCase();
            const scannedProjNo = parseInt(rawText.replace(/[^\d]/g, '')); 

            stopScanner();
            alert("סרקת בהצלחה את מיזם מספר: " + scannedProjNo + "! בשלב הבא נפתח כאן את מסך 7 הקטגוריות.");
        },
        (errorMessage) => { }
    ).catch(err => {
        console.error(err);
        alert("לא ניתן לגשת למצלמה. ודאו שאישרתם הרשאת מצלמה בדפדפן.");
        scannerModal.style.display = 'none';
    });
};

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => { scannerModal.style.display = 'none'; }).catch(err => console.error(err));
    } else { scannerModal.style.display = 'none'; }
}
scannerCloseX.onclick = stopScanner;
