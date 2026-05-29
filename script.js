const loginScreen = document.getElementById('login-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const ratingScreen = document.getElementById('rating-screen'); // מסך הדירוג המלא החדש

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

// רכיבי מסך הדירוג המלא
const ratingBackBtn = document.getElementById('rating-back-btn');
const modalProjectTitle = document.getElementById('modal-project-title');
const modalProjectNo = document.getElementById('modal-project-no');
const modalProjectGender = document.getElementById('modal-project-gender');
const modalSaveBtn = document.getElementById('modal-save-btn');

// 🔹 קישורי המערכת המעודכנים של המנטורים
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1RyrAzEhinN8quqqbj6H_gCdK625z1Hjt7DNOANOCnF0/edit?usp=sharing";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwyTj6OuSvDvgfru8VN-9SCwxmciiBZ59Y-aCZeWZLzXV1AgZvTwMdKM2jVgnIG3OSI/exec";

let currentMentor = ""; 
let rawProjectsData = []; 
let currentMentorVotesRow = {}; 
let currentSelectedProjectNo = null;
let currentSelectedProjectGender = "";

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

// משיכת המיזמים וחלוקה
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

            let totalProjectsCount = 0;
            let votedProjectsCount = 0;

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const columns = parseCSVLine(lines[i]);
                
                const projectNo = parseInt(columns[1]); 
                const projectTitle = columns[2];       
                let projectGender = columns[5] ? columns[5].trim().toLowerCase() : ""; 
                
                if (projectGender.includes('female') || projectGender.includes('בת') || projectGender.includes('בנות')) {
                    projectGender = 'female';
                } else {
                    projectGender = 'male';
                }

                if (projectNo) {
                    rawProjectsData.push({ no: projectNo, title: projectTitle, gender: projectGender });

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
                        openRatingPage(projectNo, projectTitle, projectGender);
                    };

                    if (projectGender === 'female') {
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

// 🌟 מעבר למסך הדירוג המלא החדש 🌟
function openRatingPage(projectNo, projectTitle, projectGender) {
    currentSelectedProjectNo = projectNo;
    currentSelectedProjectGender = projectGender;
    modalProjectNo.innerText = "מיזם מספר " + projectNo;
    modalProjectTitle.innerText = projectTitle;

    if (projectGender === 'female') {
        modalProjectGender.innerText = "מיזם בנות";
        modalProjectGender.className = "gender-badge female";
    } else {
        modalProjectGender.innerText = "מיזם בנים";
        modalProjectGender.className = "gender-badge male";
    }

    // איפוס סליידרים
    for (let i = 1; i <= 7; i++) {
        const slider = document.getElementById(`slider-${i}`);
        const preview = document.getElementById(`val-preview-${i}`);
        slider.value = 0;
        preview.innerText = "טרם דורג";
        preview.className = "cat-card-score unrated";
    }

    showScreen(ratingScreen); // ניווט למסך המלא
}

// עדכון סליידרים בלייב במסך המלא
for (let i = 1; i <= 7; i++) {
    const slider = document.getElementById(`slider-${i}`);
    const preview = document.getElementById(`val-preview-${i}`);
    
    slider.oninput = function(e) {
        const val = parseInt(e.target.value);
        if (val === 0) {
            preview.innerText = "טרם דורג";
            preview.className = "cat-card-score unrated";
        } else {
            preview.innerText = val;
            preview.className = "cat-card-score rated";
        }
    };
}

// ➔ חזרה ללובי (מתפקד ככפתור בטל)
ratingBackBtn.onclick = function() {
    showScreen(lobbyScreen);
    currentSelectedProjectNo = null;
    currentSelectedProjectGender = "";
};

// כפתור שמור - שליחת הנתונים ל-Apps Script
modalSaveBtn.onclick = function() {
    const scores = [];
    let sum = 0;

    for (let i = 1; i <= 7; i++) {
        const val = parseInt(document.getElementById(`slider-${i}`).value);
        if (val === 0) {
            alert("חובה להעניק ציון לכל 7 הקטגוריות לפני השמירה!");
            return;
        }
        scores.push(val);
        sum += val;
    }

    modalSaveBtn.innerText = "שומר דירוג... ⏳";
    modalSaveBtn.disabled = true;

    const voteData = {
        mentorName: currentMentor,
        projectNumber: currentSelectedProjectNo,
        gender: currentSelectedProjectGender, 
        cat1: scores[0],
        cat2: scores[1],
        cat3: scores[2],
        cat4: scores[3],
        cat5: scores[4],
        cat6: scores[5],
        cat7: scores[6],
        totalScore: sum 
    };

    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        cache: "no-cache",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voteData)
    })
    .then(() => {
        alert(`הדירוג למיזם ${currentSelectedProjectNo} נשמר בהצלחה! 🎉`);
        modalSaveBtn.innerText = "💾 שמור דירוג והמשך";
        modalSaveBtn.disabled = false;
        showScreen(lobbyScreen);
        fetchMentorVotesAndRenderLobby(); 
    })
    .catch(err => {
        console.error(err);
        alert("תקלה בתקשורת עם השרת, הנתונים לא נשמרו.");
        modalSaveBtn.innerText = "💾 שמור דירוג והמשך";
        modalSaveBtn.disabled = false;
    });
};

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
            
            let scannedGender = "male";
            if (rawText.startsWith('G')) { scannedGender = "female"; }

            stopScanner();
            
            const foundProj = rawProjectsData.find(p => parseInt(p.no) === scannedProjNo && p.gender === scannedGender);
            
            if (foundProj) {
                openRatingPage(foundProj.no, foundProj.title, foundProj.gender);
            } else {
                openRatingPage(scannedProjNo, `מיזם מספר ${scannedProjNo}`, scannedGender);
            }
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
