const loginScreen = document.getElementById('login-screen');
const mentorDropdown = document.getElementById('mentor-dropdown');
const enterBtn = document.getElementById('enterBtn');

// 🔹 קישורי בסיס הנתונים החדש של המנטורים
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1-FSsI60tnB40x1p-9S1qAJLdFW8cdAYoc_NjYdGgANs/edit#gid=0";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwyTj6OuSvDvgfru8VN-9SCwxmciiBZ59Y-aCZeWZLzXV1AgZvTwMdKM2jVgnIG3OSI/exec";

let currentMentor = ""; // משתנה גלובלי שישמור את שם המנטור המחובר

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
    
    // פנייה ישירה ללשונית Mentors בפורמט CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/gviz/tq?tqx=out:csv&sheet=Mentors`;
    
    fetch(csvUrl)
        .then(response => response.text())
        .then(text => {
            const lines = text.split(/\r?\n/);
            mentorDropdown.innerHTML = '<option value="">בחר שופט/ת...</option>';
            
            // רצים משורה 1 (מדלגים על שורת הכותרת)
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const columns = parseCSVLine(lines[i]);
                const mentorName = columns[1]; // עמודה B בגיליון
                
                if (mentorName) {
                    const option = document.createElement('option');
                    option.value = mentorName;
                    option.innerText = mentorName;
                    mentorDropdown.appendChild(option);
                }
            }
        })
        .catch(error => {
            console.error("שגיאה בטעינת מנטורים:", error);
            mentorDropdown.innerHTML = '<option value="">תקלה בטעינת הרשימה</option>';
        });
}

// הפעלת טעינת השמות מיד עם עליית הדף
loadMentorsFromServer();

// לוגיקת לחיצה על כפתור כניסה
enterBtn.onclick = function() {
    const selectedMentor = mentorDropdown.value;
    
    if (selectedMentor === "") {
        alert("אנא בחר/י את שמך מתוך הרשימה לפני ההמשך!");
        return;
    }
    
    currentMentor = selectedMentor; // שמירת השם בזיכרון האפליקציה
    alert("ברוך הבא " + currentMentor + "! בשלב הבא נעבור למסך הלובי.");
    // כאן נכתוב בהמשך את הפקודה שתעביר אותו למסך הבא
};
