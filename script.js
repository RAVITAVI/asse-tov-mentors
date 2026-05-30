/* ==========================================================================
   מערכת שפיטה למנטורים - כנס עשה טוב תשפ"ו
   מנוע האפליקציה המלא - גרסה 7.0 (כולל פאנל אדמין, אוסקר ודאשבורד שקיפות)
   ========================================================================== */

// 🌐 הגדרת כתובת ה-API של ה-Google Web App שלך
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzV8_9Lz0LhFmx3WpxV6WbM8_x_YOUR_ACTUAL_ID/exec"; 

// 🗂️ מערכי הנתונים הגלובליים באפליקציה
let mentorsList = [];
let projectsList = [];
let rawVotesList = [];
let currentMentorName = "";
let currentProjectObj = null;
let html5QrScanner = null;
let currentSystemStatus = "ON"; // ON, WARN, OFF

// 📋 הגדרת 7 קטגוריות השיפוט הרשמיות לפי סדר החשיבות והמשקלים הקשיח
const CRITERIA_CATEGORIES = [
    { id: "impact", name: "אימפקט ותרומה לקהילה", desc: "מידת ההשפעה המעשית של המיזם על קהל היעד והיקף עשיית הטוב שלו בשטח." },
    { id: "innovation", name: "חדשנות ויצירתיות", desc: "מקוריות הרעיון, חשיבה מחוץ לקופסה ומציאת פתרונות יצירתיים וייחודיים לבעיה." },
    { id: "presentation", name: "פרזנטציה ויכולת שכנוע", desc: "איכות העמידה מול קהל, רמת הרהיטות, כושר הביטוי והצגת המסרים בצורה ברורה וסוחפת." },
    { id: "collaboration", name: "עבודת צוות ושותפות", desc: "חלוקת התפקידים בצוות, מידת הסנכרון והערך המוסף שנוצר מהעבודה המשותפת." },
    { id: "feasibility", name: "היתכנות וישימות המיזם", desc: "עד כמה המיזם ריאלי, בר ביצוע ובעל פוטנציאל להמשך קיום עצמאי בעתיד." },
    { id: "effort", name: "השקעה, תהליך ולמידה", desc: "רמת המאמץ הניכרת, עומק המחקר שנעשה והתפתחות הצוות לאורך שלבי העבודה." },
    { id: "branding", name: "מיתוג, עיצוב ונראות הדוכן", desc: "האסתטיקה הכללית של המיזם, שיווק חזותי ועיצוב עמדת התצוגה בכנס." }
];

// 🚀 אתחול המערכת מיד עם טעינת הדף
document.addEventListener("DOMContentLoaded", () => {
    fetchInitialData();
    setupEventListeners();
    startStatusPolling(); // ניתור סטטוסים בלייב (נעילה והתרעות)
});

// 📥 משיכת הנתונים הראשונית מגוגל שייטס
function fetchInitialData() {
    fetch(`${SCRIPT_URL}?action=getInitialData`)
        .then(res => res.json())
        .then(data => {
            mentorsList = data.mentors || [];
            projectsList = data.projects || [];
            
            // עדכון רשימת המנטורים הנגררת במסך הבית
            const select = document.getElementById("mentor-dropdown");
            select.innerHTML = '<option value="">-- בחר/י שם מהרשימה --</option>';
            mentorsList.forEach(m => {
                let opt = document.createElement("option");
                opt.value = m;
                opt.textContent = m;
                select.appendChild(opt);
            });
        })
        .catch(err => {
            console.error("שגיאה בטעינת נתונים ראשוניים:", err);
            showCustomAlert("חלקה שגיאה בתקשורת עם השרת. אנא רענני את הדף.");
        });
}

// 🔁 ניתור מצב האפליקציה בלייב (מזהה אם המנהלת נעלה את השערים או נתנה 5 דקות)
function startStatusPolling() {
    setInterval(() => {
        fetch(`${SCRIPT_URL}?action=getSystemStatus`)
            .then(res => res.json())
            .then(data => {
                if (data && data.status) {
                    handleSystemStatusChange(data.status);
                }
            }).catch(e => console.log("Status check failed silently"));
    }, 15000); // בדיקה בכל 15 שניות
}

// ⚠️ טיפול בשינוי מצב המערכת מהחמ"ל
function handleSystemStatusChange(newStatus) {
    if (newStatus === currentSystemStatus) return;
    currentSystemStatus = newStatus;

    if (currentSystemStatus === "WARN") {
        showCustomAlert("⚠️ שים/י לב! השפיטה והדירוג יינעלו בעוד כ-5 דקות בדיוק. אנא סיימו לשמור את המיזמים הנוכחיים שלכם!");
    } else if (currentSystemStatus === "OFF") {
        showCustomAlert("🛑 זמן השיפוט הסתיים הרמטית! המערכת ננעלה ולא ניתן להזין או לעדכן דירוגים נוספים. תודה על השתתפותך.");
        // אם המנטור באמצע מסך דירוג, נזרוק אותו ללובי החסום
        if (document.getElementById("rating-screen").classList.contains("active")) {
            switchScreen("lobby-screen");
        }
    }
}

// 🔔 הגדרת מאזיני כפתורים כלליים במערכת
function setupEventListeners() {
    // כפתור כניסה מהבית ללובי
    document.getElementById("enterBtn").addEventListener("click", () => {
        const val = document.getElementById("mentor-dropdown").value;
        if (!val) {
            showCustomAlert("אנא בחר/י את שמך מהרשימה כדי להמשיך.");
            return;
        }
        currentMentorName = val;
        document.getElementById("user-display-name").textContent = currentMentorName;
        
        // משיכת היסטוריית ההצבעות הספציפית של המנטור הזה
        refreshMentorLobby();
    });

    // כפתור חזרה ממסך הדירוג ללובי
    document.getElementById("rating-back-btn").addEventListener("click", () => {
        switchScreen("lobby-screen");
    });
    document.getElementById("modal-cancel-btn").addEventListener("click", () => {
        switchScreen("lobby-screen");
    });

    // כפתור שמירת הדירוג המלא מהמסך השלישי
    document.getElementById("modal-save-btn").addEventListener("click", saveCurrentProjectRatings);

    // כפתור הפעלת מצלמה לסריקה
    document.getElementById("scan-qr-btn").addEventListener("click", openBarcodeScanner);
    document.getElementById("scanner-close-x").addEventListener("click", closeBarcodeScanner);
    
    // סגירת אלרט מותאם
    document.getElementById("custom-alert-close-btn").addEventListener("click", () => {
        document.getElementById("custom-alert-modal").classList.remove("active");
    });

    // כפתור סיום שיפוט סופי
    document.getElementById("finish-judging-btn").addEventListener("click", () => {
        document.getElementById("thanks-modal").classList.add("active");
    });
}

// 🔄 רענון ובניית לוח המיזמים האישי של המנטור בלובי
function refreshMentorLobby() {
    fetch(`${SCRIPT_URL}?action=getMentorVotes&mentor=${encodeURIComponent(currentMentorName)}`)
        .then(res => res.json())
        .then(votedProjectIds => {
            buildProjectsGrid(votedProjectIds);
            switchScreen("lobby-screen");
        })
        .catch(err => {
            console.error(err);
            // הגנת רשת - אם נכשל, נבנה רשת נקייה
            buildProjectsGrid([]);
            switchScreen("lobby-screen");
        });
}

// 🧱 בנייה דינמית של גריד המיזמים (מופרד לבנים ובנות)
function buildProjectsGrid(votedIds) {
    const boysGrid = document.getElementById("boys-projects-grid");
    const girlsGrid = document.getElementById("girls-projects-grid");
    
    boysGrid.innerHTML = "";
    girlsGrid.innerHTML = "";
    
    let countVoted = 0;

    projectsList.forEach(p => {
        const isVoted = votedIds.includes(String(p.id));
        if (isVoted) countVoted++;

        // יצירת הכרטיסייה
        const card = document.createElement("div");
        card.className = `project-lobby-card ${p.gender === 'בנות' ? 'girl-theme' : 'boy-theme'} ${isVoted ? 'voted' : ''}`;
        card.onclick = () => openRatingScreenForProject(p);

        card.innerHTML = `
            <div class="p-card-num">${p.id}</div>
            <div class="p-card-name">${p.title}</div>
            ${isVoted ? '<div class="voted-badge">✓ דורג</div>' : ''}
        `;

        if (p.gender === 'בנות') {
            girlsGrid.appendChild(card);
        } else {
            boysGrid.appendChild(card);
        }
    });

    // עדכון מד ההתקדמות למנטור
    const total = projectsList.length;
    document.getElementById("progress-count").textContent = `${countVoted}/${total}`;
    const percent = total > 0 ? (countVoted / total) * 100 : 0;
    document.getElementById("progress-bar-fill").style.width = `${percent}%`;

    // הצגת כפתור הסיום אם דירג לפחות מיזם אחד
    if (countVoted > 0) {
        document.getElementById("finish-container").style.display = "block";
    } else {
        document.getElementById("finish-container").style.display = "none";
    }
}

// 📝 פתיחת מסך הדירוג עבור מיזם נבחר
function openRatingScreenForProject(project) {
    if (currentSystemStatus === "OFF") {
        showCustomAlert("🛑 המערכת נעולה על ידי מנהלת הכנס. לא ניתן לדרג או לעדכן מיזמים בשעה זו.");
        return;
    }

    currentProjectObj = project;
    
    // מילוי כותרות
    document.getElementById("modal-project-title").textContent = project.title;
    document.getElementById("modal-project-creators").textContent = project.creators || "";
    document.getElementById("modal-project-no").textContent = `מיזם מספר ${project.id}`;
    
    const badge = document.getElementById("modal-project-gender");
    badge.textContent = project.gender;
    badge.className = `gender-badge ${project.gender === 'בנות' ? 'girl' : 'boy'}`;

    // משיכת ציונים קודמים אם קיימים, כדי להציג אותם (עריכה חלקה)
    fetch(`${SCRIPT_URL}?action=getSingleVote&mentor=${encodeURIComponent(currentMentorName)}&projectId=${project.id}`)
        .then(res => res.json())
        .then(existingScores => {
            renderCategoriesForm(existingScores || {});
            switchScreen("rating-screen");
        })
        .catch(() => {
            renderCategoriesForm({});
            switchScreen("rating-screen");
        });
}

// 🛠️ רינדור טופס 7 הקטגוריות עם כפתורי הרדיו 1-10
function renderCategoriesForm(existingScores) {
    const container = document.getElementById("categories-container");
    container.innerHTML = "";

    CRITERIA_CATEGORIES.forEach(cat => {
        const card = document.createElement("div");
        card.className = "category-card";

        let radioRowsHTML = "";
        for (let i = 1; i <= 10; i++) {
            const isChecked = existingScores[cat.id] == i ? "checked" : "";
            radioRowsHTML += `
                <div class="score-cell">
                    <input type="radio" name="cat_${cat.id}" id="radio_${cat.id}_${i}" value="${i}" ${isChecked}>
                    <label for="radio_${cat.id}_${i}" class="score-label">${i}</label>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="category-title">${cat.name}</div>
            <div class="category-desc">${cat.desc}</div>
            <div class="radio-row-container">
                ${radioRowsHTML}
            </div>
        `;
        container.appendChild(card);
    });
}

// 💾 שמירת הנתונים ושליחתם לגוגל שייטס
function saveCurrentProjectRatings() {
    if (currentSystemStatus === "OFF") {
        showCustomAlert("🛑 המערכת ננעלה כעת! השינויים לא נשמרו.");
        switchScreen("lobby-screen");
        return;
    }

    let payload = {
        action: "saveVote",
        mentor: currentMentorName,
        projectId: currentProjectObj.id
    };

    // איסוף ווידוא שכל 7 הקטגוריות סומנו
    for (let cat of CRITERIA_CATEGORIES) {
        const selected = document.querySelector(`input[name="cat_${cat.id}"]:checked`);
        if (!selected) {
            showCustomAlert(`אנא דרג/י את הקטגוריה: "${cat.name}" לפני השמירה.`);
            return;
        }
        payload[cat.id] = selected.value;
    }

    // הצגת מצב רוחב פס/טעינה קל
    document.getElementById("modal-save-btn").disabled = true;
    document.getElementById("modal-save-btn").textContent = "שומר ומסנכרן...";

    // שליחה ב-POST אל ה-Google Web App
    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", // למניעת בעיות CORS במובייל
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(() => {
        // מאחר ומשתמשים ב-no-cors, הדפדפן לא מחזיר תשובה קריאה, אך השליחה מתבצעת. נניח הצלחה.
        setTimeout(() => {
            document.getElementById("modal-save-btn").disabled = false;
            document.getElementById("modal-save-btn").textContent = "💾 שמור דירוג והמשך";
            refreshMentorLobby();
        }, 800);
    })
    .catch(err => {
        console.error(err);
        document.getElementById("modal-save-btn").disabled = false;
        document.getElementById("modal-save-btn").textContent = "💾 שמור דירוג והמשך";
        showCustomAlert("תקלת רשת קלה, נסה שנית.");
    });
}

// 📷 הפעלת סורק הברקודים הרשמי מהנייד
function openBarcodeScanner() {
    document.getElementById("scanner-modal").classList.add("active");
    
    // יצירת השירות של הברקוד
    html5QrScanner = new Html5Qrcode("qr-reader");
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrScanner.start(
        { facingMode: "environment" }, // מצלמה אחורית
        config,
        onQrCodeSuccess,
        onQrCodeError
    ).catch(err => {
        console.error("לא ניתן לפתוח מצלמה:", err);
        showCustomAlert("לא ניתן לגשת למצלמה. אנא חפש/י את המיזם ידנית בלוח.");
        closeBarcodeScanner();
    });
}

// פונקציית הצלחה בסריקת ברקוד
function onQrCodeSuccess(decodedText) {
    // נניח שהברקוד מכיל רק את מספר המיזם (למשל: "14")
    const projectId = String(decodedText).trim();
    const foundProject = projectsList.find(p => String(p.id) === projectId);
    
    closeBarcodeScanner();
    
    if (foundProject) {
        openRatingScreenForProject(foundProject);
    } else {
        showCustomAlert(`ברקוד נסרק בהצלחה (${projectId}), אך לא נמצא מיזם מספר כזה במערכת.`);
    }
}

function onQrCodeError(err) {
    // שגיאות סריקה קטנות קורות בכל פריים, נתעלם כדי לא להציף
}

function closeBarcodeScanner() {
    document.getElementById("scanner-modal").classList.remove("active");
    if (html5QrScanner) {
        html5QrScanner.stop().then(() => {
            html5QrScanner = null;
        }).catch(e => console.log(e));
    }
}

// 🚪 ניווט חלקה בין מסכים
function switchScreen(screenId) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(screenId).classList.add("active");
    window.scrollTo(0,0);
}

// 🔔 פונקציית אלרט חלופית ונקייה
function showCustomAlert(text) {
    document.getElementById("custom-alert-text").innerHTML = text.replace(/\n/g, "<br>");
    document.getElementById("custom-alert-modal").classList.add("active");
}

/* ==========================================================================
   🔐 פונקציות חמ"ל הניהול והאדמין (מצב מנהלת)
   ========================================================================== */

function openAdminPasswordModal() {
    document.getElementById("admin-pass-input").value = "";
    document.getElementById("admin-password-modal").classList.add("active");
    document.getElementById("admin-pass-input").focus();
}

function closeAdminPasswordModal() {
    document.getElementById("admin-password-modal").classList.remove("active");
}

function submitAdminPassword() {
    const pass = document.getElementById("admin-pass-input").value;
    if (pass === "02062026") {
        closeAdminPasswordModal();
        loadAdminPanelData();
    } else {
        alert("סיסמת מנהל שגויה!");
    }
}

// טעינת נתוני האדמין האקטיביים בלייב מהשטח
function loadAdminPanelData() {
    fetch(`${SCRIPT_URL}?action=getAdminDashboardData`)
        .then(res => res.json())
        .then(data => {
            rawVotesList = data.allVotes || [];
            currentSystemStatus = data.systemStatus || "ON";
            
            // עדכון כפתורי ה-Toggle של הנעילה
            updateToggleButtonsUI();

            // עדכון נתונים מספריים
            document.getElementById("admin-total-votes").textContent = rawVotesList.length;
            
            // חישוב כמות שופטים פעילים ייחודיים
            const uniqueJudges = [...new Set(rawVotesList.map(v => v.mentor))];
            document.getElementById("admin-active-judges").textContent = uniqueJudges.length;

            // בניית רשימת ההספק של המנטורים
            renderJudgesProgressList(uniqueJudges);

            switchScreen("admin-screen");
        })
        .catch(err => {
            showCustomAlert("שגיאה במשיכת נתוני אדמין.");
        });
}

function closeAdminScreen() {
    switchScreen("login-screen");
}

// עדכון נראות כפתורי הנעילה בחמ"ל
function updateToggleButtonsUI() {
    document.getElementById("status-on-btn").className = "status-toggle-btn" + (currentSystemStatus === "ON" ? " active-on" : "");
    document.getElementById("status-warn-btn").className = "status-toggle-btn" + (currentSystemStatus === "WARN" ? " active-warn" : "");
    document.getElementById("status-off-btn").className = "status-toggle-btn" + (currentSystemStatus === "OFF" ? " active-off" : "");
}

// שינוי סטטוס מערכת ושמירתו בגוגל שייטס
function setSystemStatus(status) {
    currentSystemStatus = status;
    updateToggleButtonsUI();
    
    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setSystemStatus", status: status })
    });
}

// רינדור רשימת המנטורים וההספק שלהם
function renderJudgesProgressList(uniqueJudges) {
    const container = document.getElementById("admin-judges-list");
    container.innerHTML = "";
    
    if (uniqueJudges.length === 0) {
        container.innerHTML = `<p style="color:#64748b; padding:5px;">אף מנטור לא הזין קולות עדיין בשטח.</p>`;
        return;
    }

    // ספירת קולות לכל שופט
    let judgeCounts = {};
    uniqueJudges.forEach(j => judgeCounts[j] = 0);
    rawVotesList.forEach(v => { if(judgeCounts[v.mentor] !== undefined) judgeCounts[v.mentor]++; });

    uniqueJudges.forEach(judge => {
        const row = document.createElement("div");
        row.className = "judge-row-stat";
        row.innerHTML = `
            <strong>👤 ${judge}</strong>
            <span style="color:#1e305b; font-weight:bold;">דירג/ה ${judgeCounts[judge]} מיזמים</span>
        `;
        container.appendChild(row);
    });
}


/* ==========================================================================
   🏆 מנוע האוסקר המתמטי המלא וחוקי חסימת כפל זכיות
   ========================================================================== */

let processedProjectsSummary = []; // ישמש גם לטבלת השקיפות המלאה

function calculateOscarResults() {
    if (rawVotesList.length === 0) {
        showCustomAlert("⚠️ לא ניתן לחשב תוצאות: לא נקלטו טפסי דירוג במערכת בשטח!");
        return;
    }

    // שלב 1: עיבוד ראשוני וחישוב ממוצעים לכל מיזם בכל קטגוריה וכללי
    processedProjectsSummary = projectsList.map(project => {
        const projectVotes = rawVotesList.filter(v => String(v.projectId) === String(project.id));
        const numJudges = projectVotes.length;
        
        let averages = {};
        let sumOfAllAverages = 0;

        CRITERIA_CATEGORIES.forEach(cat => {
            if (numJudges > 0) {
                const sum = projectVotes.reduce((acc, curr) => acc + Number(curr[cat.id] || 0), 0);
                averages[cat.id] = sum / numJudges;
            } else {
                averages[cat.id] = 0;
            }
            sumOfAllAverages += averages[cat.id];
        });

        // ממוצע כללי משוקלל (Total Score)
        const totalScore = CRITERIA_CATEGORIES.length > 0 ? (sumOfAllAverages / CRITERIA_CATEGORIES.length) : 0;

        return {
            id: project.id,
            title: project.title,
            gender: project.gender,
            creators: project.creators,
            numJudges: numJudges,
            averages: averages,
            totalScore: totalScore,
            awardsWon: [] // רשימת הזכיות שייקלטו כאן
        };
    });

    // שלב 2: הגדרת מערכי חסימה נפרדים לבנים ולבנות
    let blockedBoysIds = [];
    let blockedGirlsIds = [];

    // שלב 3: מציאת "מיזם השנה - האלוף הכללי" (פתוח לחלוטין, ללא הפרדת מגדר וללא חסימות)
    // מי שיש לו את ה-Total Score הגבוה ביותר באולם
    let grandChampion = null;
    let maxGrandScore = -1;
    let grandTieList = [];

    processedProjectsSummary.forEach(p => {
        if (p.numJudges === 0) return; // לא נשפוט מי שלא דורג
        if (p.totalScore > maxGrandScore) {
            maxGrandScore = p.totalScore;
            grandTieList = [p];
        } else if (p.totalScore === maxGrandScore) {
            grandTieList.push(p);
        }
    });

    // פונקציית המשך ריצה לאחר הכרעת האלוף הכללי
    if (grandTieList.length > 1) {
        triggerManualTieBreaker("👑 אלוף האולם הכללי (מיזם השנה)", grandTieList, (chosen) => {
            executeOscarCategoriesAllocation(chosen, blockedBoysIds, blockedGirlsIds);
        });
    } else {
        grandChampion = grandTieList[0] || null;
        executeOscarCategoriesAllocation(grandChampion, blockedBoysIds, blockedGirlsIds);
    }
}

// שלב 4: חלוקת 21 הפרסים ב-7 הקטגוריות הקשיחות בסבב משולש
function executeOscarCategoriesAllocation(grandChampion, blockedBoysIds, blockedGirlsIds) {
    
    // הצגת האלוף הכללי בלוח
    if (grandChampion) {
        document.getElementById("res-grand-champion").innerHTML = `
            <strong>מיזם מספר ${grandChampion.id} – ${grandChampion.title}</strong><br>
            <span style="font-size:0.95rem; color:#475569;">יזמים: ${grandChampion.creators} (${grandChampion.gender}) | ציון משוקלל: ${grandChampion.totalScore.toFixed(2)}</span>
        `;
        grandChampion.awardsWon.push("👑 מיזם השנה (אלוף כללי)");
        
        // החלת חוק החסימה הקשיח: האלוף הכללי נחסם אוטומטית מלקבל גביע באף קטגוריה אחרת!
        if (grandChampion.gender === "בנות") {
            blockedGirlsIds.push(String(grandChampion.id));
        } else {
            blockedBoysIds.push(String(grandChampion.id));
        }
    } else {
        document.getElementById("res-grand-champion").textContent = "אין נתוני דירוג מספקים באולם.";
    }

    // מבנה שיחזיק את רשימת מקומות 1,2,3 לכל קטגוריה
    let categoryResults = {}; 
    CRITERIA_CATEGORIES.forEach(c => { categoryResults[c.id] = { first: null, second: null, third: null }; });

    // תור משימות לביצוע סדרתי של הקטגוריות והפודיומים
    let allocationQueue = [];

    CRITERIA_CATEGORIES.forEach(cat => {
        // עבור כל קטגוריה, מחלקים מקום ראשון, אז שני, אז שלישי
        allocationQueue.push({ catId: cat.id, catName: cat.name, place: "first", label: "🥇 מקום ראשון" });
        allocationQueue.push({ catId: cat.id, catName: cat.name, place: "second", label: "🥈 מקום שני" });
        allocationQueue.push({ catId: cat.id, catName: cat.name, place: "third", label: "🥉 מקום שלישי" });
    });

    function processQueueStep(index) {
        if (index >= allocationQueue.length) {
            // סיום חלוקת כל הקטגוריות! מציגים את התוצאות ללייב
            renderFinalOscarUI(categoryResults);
            return;
        }

        const task = allocationQueue[index];
        
        // מציאת המועמדים לבנים ובנות שאינם חסומים
        let eligibleBoys = processedProjectsSummary.filter(p => p.gender !== "בנות" && !blockedBoysIds.includes(String(p.id)) && p.numJudges > 0);
        let eligibleGirls = processedProjectsSummary.filter(p => p.gender === "בנות" && !blockedGirlsIds.includes(String(p.id)) && p.numJudges > 0);

        // א) מציאת המנצח/ים אצל הבנים בקטגוריה הזו
        let maxBoyScore = -1; let boyCandidates = [];
        eligibleBoys.forEach(p => {
            const score = p.averages[task.catId] || 0;
            if (score > maxBoyScore) { maxBoyScore = score; boyCandidates = [p]; }
            else if (score === maxBoyScore) { boyCandidates.push(p); }
        });

        // ב) מציאת המנצח/ים אצל הבנות בקטגוריה הזו
        let maxGirlScore = -1; let girlCandidates = [];
        eligibleGirls.forEach(p => {
            const score = p.averages[task.catId] || 0;
            if (score > maxGirlScore) { maxGirlScore = score; girlCandidates = [p]; }
            else if (score === maxGirlScore) { girlCandidates.push(p); }
        });

        // שוברי שוויון פנימיים אוטומטיים לפי סדר עדיפויות (ממוצע משוקלל כללי)
        function solveTieIfAny(candidates, catId, callback) {
            if (candidates.length <= 1) { callback(candidates[0] || null); return; }
            
            // בדיקת שובר שוויון 1: מי בעל ממוצע משוקלל כללי גבוה יותר?
            let highestTotalScore = -1; let finalTieList = [];
            candidates.forEach(c => {
                if (c.totalScore > highestTotalScore) { highestTotalScore = c.totalScore; finalTieList = [c]; }
                else if (c.totalScore === highestTotalScore) { finalTieList.push(c); }
            });

            if (finalTieList.length === 1) {
                callback(finalTieList[0]);
            } else {
                // שובר שוויון 2 מוחלט: עצירה והקפצת חלון שבירה ידני למנהלת
                triggerManualTieBreaker(`${task.label} בקטגוריית [${task.catName}] עבור מיזמי ${candidates[0].gender}`, finalTieList, (selectedProject) => {
                    callback(selectedProject);
                });
            }
        }

        // פתרון לבנים
        solveTieIfAny(boyCandidates, task.catId, (winningBoy) => {
            // פתרון לבנות
            solveTieIfAny(girlCandidates, task.catId, (winningGirl) => {
                
                // רישום התוצאה לצמד הנוכחי
                categoryResults[task.catId][task.place] = { boy: winningBoy, girl: winningGirl };

                // החלת חוק החסימה הדרמטי: הזוכים ננעלים ונחסמים להמשך התחרות לחלוטין!
                if (winningBoy) {
                    blockedBoysIds.push(String(winningBoy.id));
                    winningBoy.awardsWon.push(`${task.label} – ${task.catName}`);
                }
                if (winningGirl) {
                    blockedGirlsIds.push(String(winningGirl.id));
                    winningGirl.awardsWon.push(`${task.label} – ${task.catName}`);
                }

                // מעבר לשלב הבא בתור המשימות
                processQueueStep(index + 1);
            });
        });
    }

    // הפעלת הריצה הטורית של התור
    processQueueStep(0);
}

// 🛑 הפעלת חלון שובר שוויון ידני צף על המסך עבור המנהלת
function triggerManualTieBreaker(title, candidatesList, onResolvedCallback) {
    document.getElementById("tie-breaker-text").textContent = `נמצא שוויון מתמטי מוחלט בפרס: ${title}. אנא בחרי ידנית את המיזם המנצח להמשך דירוג השרשרת:`;
    
    const btnContainer = document.getElementById("tie-breaker-buttons-container");
    btnContainer.innerHTML = "";

    candidatesList.forEach(p => {
        const btn = document.createElement("button");
        btn.className = "orange-login-btn";
        btn.style.margin = "5px 0";
        btn.style.background = p.gender === 'בנות' ? '#c74d80' : '#2b5c8f';
        btn.textContent = `מיזם ${p.id} – ${p.title} (${p.creators})`;
        
        btn.onclick = () => {
            document.getElementById("tie-breaker-modal").classList.remove("active");
            onResolvedCallback(p); // החזרת המיזם הנבחר להמשך המנוע
        };
        btnContainer.appendChild(btn);
    });

    document.getElementById("tie-breaker-modal").classList.add("active");
}

// 🖥️ רינדור ויזואלי של לוח הזכיות הסופי באדמין ובניית טבלת השקיפות המלאה
function renderFinalOscarUI(results) {
    const gridContainer = document.getElementById("oscar-categories-results-grid");
    gridContainer.innerHTML = "";

    CRITERIA_CATEGORIES.forEach(cat => {
        const res = results[cat.id];
        const card = document.createElement("div");
        card.className = "oscar-cat-card-res";

        card.innerHTML = `
            <h4>🎬 קטגוריה: ${cat.name}</h4>
            
            <div class="podium-line" style="color:#4a76a8;">
                <strong>🥇 מקום 1 (בנים):</strong> ${res.first.boy ? `מיזם ${res.first.boy.id} (${res.first.boy.title})` : 'אין'}
            </div>
            <div class="podium-line" style="color:#e0629b;">
                <strong>🥇 מקום 1 (בנות):</strong> ${res.first.girl ? `מיזם ${res.first.girl.id} (${res.first.girl.title})` : 'אין'}
            </div>
            
            <div class="podium-line" style="color:#4a76a8; opacity:0.85;">
                <strong>🥈 מקום 2 (בנים):</strong> ${res.second.boy ? `מיזם ${res.second.boy.id} (${res.second.boy.title})` : 'אין'}
            </div>
            <div class="podium-line" style="color:#e0629b; opacity:0.85;">
                <strong>🥈 מקום 2 (בנות):</strong> ${res.second.girl ? `מיזם ${res.second.girl.id} (${res.second.girl.title})` : 'אין'}
            </div>
            
            <div class="podium-line" style="color:#4a76a8; opacity:0.75;">
                <strong>🥉 מקום 3 (בנים):</strong> ${res.third.boy ? `מיזם ${res.third.boy.id} (${res.third.boy.title})` : 'אין'}
            </div>
            <div class="podium-line" style="color:#e0629b; opacity:0.75;">
                <strong>🥉 מקום 3 (בנות):</strong> ${res.third.girl ? `מיזם ${res.third.girl.id} (${res.third.girl.title})` : 'אין'}
            </div>
        `;
        gridContainer.appendChild(card);
    });

    // הצגת הפאנל
    document.getElementById("oscar-results-panel").style.display = "block";

    // 🔍 בניית דאשבורד השקיפות והניתוח המלא למנהל 🔍
    buildTransparencyDashboardTable();
}

// 🔍 מילוי נתוני טבלת השקיפות המלאה מסודרת מהציון הגבוה לנמוך
function buildTransparencyDashboardTable() {
    const tbody = document.getElementById("transparency-table-body");
    tbody.innerHTML = "";

    // מיון המערך מהציון המשוקלל הכללי הגבוה ביותר לנמוך ביותר
    let sortedSummary = [...processedProjectsSummary].sort((a, b) => b.totalScore - a.totalScore);

    sortedSummary.forEach(p => {
        const row = document.createElement("tr");
        row.className = p.gender === "בנות" ? "row-girl-trans" : "row-boy-trans";

        // עיבוד סטטוס הזכייה באוסקר
        let awardsBadgeHTML = `<span style="color:#64748b;">❌ לא זכה בפרס</span>`;
        if (p.awardsWon && p.awardsWon.length > 0) {
            awardsBadgeHTML = p.awardsWon.map(award => `<div class="status-badge-won">${award}</div>`).join(" ");
        }

        row.innerHTML = `
            <td style="font-weight:900; text-align:center;">${p.id}</td>
            <td style="font-weight:700;">${p.title} <br><span style="font-size:0.75rem; font-weight:normal; color:#64748b;">יזמים: ${p.creators}</span></td>
            <td style="font-weight:bold; color:#1e305b; text-align:center;">${p.numJudges > 0 ? p.totalScore.toFixed(2) : '0.00'}</td>
            <td style="text-align:center; font-weight:bold; color:#4b6584;">${p.numJudges} שופטים</td>
            <td>${awardsBadgeHTML}</td>
        `;
        tbody.appendChild(row);
    });

    // הצגת הפאנל של הטבלה
    document.getElementById("admin-transparency-panel").style.display = "block";
    
    // גלילה חלקה לראש תוצאות האוסקר בשטח
    document.getElementById("oscar-results-panel").scrollIntoView({ behavior: "smooth" });
}
