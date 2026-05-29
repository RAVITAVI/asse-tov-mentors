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

// 🔹 קישור הגוגל שיטס הייעודי של המנטורים
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1RyrAzEhinN8quqqbj6H_gCdK625z1Hjt7DNOANOCnF0/edit?usp=sharing";

let currentMentor = ""; // משתנה גלובלי לשם המנטור המחובר
let rawProjectsData = []; // רשימת המיזמים הגולמית מהשרת
let currentMentorVotesRow = {}; // זיכרון מקומי של אילו מיזמים השופט כבר ניקד

// פונקציית ניווט מסכים
function showScreen(targetScreen) {
    loginScreen.classList.remove('active');
    lobbyScreen.classList.remove('active');
    targetScreen.classList.add('active');
}

// פונקציה שמפרקת את שורות ה-CSV מהגיליון
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

// 🌟 משיכת רשימת המנטורים דינמית מתוך לשונית Mentors
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

// 🌟 משיכת ההצבעות הקודמות של המנטור המחובר כדי לצבוע בירוק
function fetchMentorVotesAndRenderLobby() {
    const matches = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) return;
    const csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=Mentors_Votes`;

    fetch(csvUrl)
        .then(response => response.text())
        .then(text => {
            const lines = text.split(/\r?\n/);
            currentMentorVotesRow = {}; // איפוס זיכרון
            
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const columns = parseCSVLine(lines[i]);
                const voteMentorName = columns[1];   // עמודה B - Mentor_Name
                const voteProjectNo = parseInt(columns[2]); // עמודה C - Project_Number
                
                // אם השורה שייכת למנטור הנוכחי, נשמור שהמיזם הזה כבר דורג על ידו
                if (voteMentorName && voteMentorName.trim() === currentMentor.trim()) {
                    currentMentorVotesRow[voteProjectNo] = true;
                }
            }
            // לאחר שקראנו את הצבעות העבר, נטען את כפתורי המיזמים
            fetchAndDisplayProjects();
        }).catch(err => {
            console.error("שגיאה בטעינת הצבעות מנטור:", err);
            fetchAndDisplayProjects(); // בכל מקרה נטען את המיזמים
        });
}

// 🌟 משיכת רשימת המיזמים מלשונית Projects וריולם בגריד
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
            
            let totalProjectsCount = 0;
            let votedProjectsCount = 0;

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const columns = parseCSVLine(lines[i]);
                
                const projectNo = parseInt(columns[1]);     // עמודה B - Project_Number
                const projectTitle = columns[2];  // עמודะ C - Project_Title
                const projectCreators = columns[3]; // עמודה D - Project_Creators
                const projectGender = columns[4];   // עמודה E - Gender (Male/Female)
                
                if (projectNo) {
                    totalProjectsCount++;
                    const isVotedByMe = currentMentorVotesRow[projectNo] || false;
                    if (isVotedByMe) votedProjectsCount++;

                    const projectButton = document.createElement('div');
                    
                    // בדיקת סטטוס צבע: ירוק אם דורג, אפור/אדום אם טרם דורג
                    if (isVotedByMe) {
                        projectButton.className = 'project-grid-button color-green';
                        projectButton.innerHTML = `<div class="proj-number">${projectNo}</div><div class="proj-title">${projectTitle}</div><div class="proj-status-label">✓ דורג</div>`;
                    } else {
                        projectButton.className = 'project-grid-button color-neutral';
                        projectButton.innerHTML = `<div class="proj-number">${projectNo}</div><div class="proj-title">${projectTitle}</div><div class="proj-status-label">טרם דורג</div>`;
                    }

                    // הגבלת לחיצה ידנית: מאפשרים רק אם כבר דורג בעבר לצורך עדכון, אחרת דורשים סריקה
                    projectButton.onclick = function() {
                        if (isVotedByMe) {
                            alert("מיזם " + projectNo + " כבר דורג! בשלב הבא נפתח כאן את חלון עדכון הציונים.");
                        } else {
                            alert("כדי לדרג את מיזם מספר " + projectNo + " בפעם הראשונה, עליכם לבקר בדוכן הפיזי שלו ולסרוק את הברקוד שעל השולחן! 📷");
                        }
                    };

                    // מיון אוטומטי למסלול בנים או בנות בלובי
                    if (projectGender && projectGender.trim().toLowerCase() === 'female') {
                        girlsProjectsGrid.appendChild(projectButton);
                    } else {
                        boysProjectsGrid.appendChild(projectButton);
                    }
                }
            }

            // עדכון שורת הסטטוס ומד ההתקדמות הויזואלי
            progressCount.innerText = `${votedProjectsCount}/${totalProjectsCount}`;
            const percentage = totalProjectsCount > 0 ? (votedProjectsCount / totalProjectsCount) * 100 : 0;
            progressBarFill.style.width = `${percentage}%`;

        }).catch(err => console.error("שגיאה בטעינת מיזמים:", err));
}

// הפעלת טעינת שמות המנטורים במסך הבית
loadMentorsFromServer();

// לוגיקת לחיצה על כפתור כניסה
enterBtn.onclick = function() {
    const selectedMentor = mentorDropdown.value;
    if (selectedMentor === "") {
        alert("אנא בחר/י את שמך מתוך הרשימה לפני ההמשך!");
        return;
    }
    
    currentMentor = selectedMentor; 
    userDisplayName.innerText = currentMentor; // עדכון שם השופט בשורת הסטטוס
    
    // מעבר למסך הלובי וטעינת הנתונים הייעודיים
    showScreen(lobbyScreen);
    fetchMentorVotesAndRenderLobby();
};

// כפתור סריקה ראשי בלובי
scanQrBtn.onclick = function() {
    alert("בשלב הבא נחבר לכאן את המצלמה של הסורק שיזהה את הברקודים של השולחנות וייפתח אוטומטית את 7 הקטגוריות!");
};
