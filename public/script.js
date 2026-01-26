const API = "http://localhost:5000/api";
let token = localStorage.getItem("token");
let weeklyChartInstance = null;

function el(id) { return document.getElementById(id); }

/* ===================== NAVBAR ===================== */
function setNavbarVisible(show) {
    const nav = el("topNav");
    if (!nav) return;
    nav.style.display = show ? "block" : "none";
}

/* ===================== VIEW HELPERS ===================== */
function hideAll() {
    [
      "introPage",
      "loginPage",
      "signupPage",
      "forgotPage",
      "dashboardPage",
      "screeningPage",
      "profilePage"
    ].forEach(id => el(id)?.classList.add("d-none"));
}

function requireAuth() {
    if (!token) {
        showLogin();
        return false;
    }
    return true;
}

/* ===================== NAVIGATION ===================== */
function showLogin() {
    hideAll();
    setNavbarVisible(false);
    el("loginPage")?.classList.remove("d-none");
}

function showSignup() {
    hideAll();
    setNavbarVisible(false);
    el("signupPage")?.classList.remove("d-none");
}

function showForgot() {
    hideAll();
    setNavbarVisible(false);
    el("forgotPage")?.classList.remove("d-none");
}

function showDashboard() {
    if (!requireAuth()) return;

    hideAll();
    setNavbarVisible(true);
    el("dashboardPage")?.classList.remove("d-none");

    checkToday();
    loadTodayValues();
    loadWeeklyChart();
}

function showScreening() {
    if (!requireAuth()) return;
    hideAll();
    setNavbarVisible(true);
    el("screeningPage")?.classList.remove("d-none");
}

function showProfile() {
    if (!requireAuth()) return;
    hideAll();
    setNavbarVisible(true);
    el("profilePage")?.classList.remove("d-none");
    loadProfile();
}

/* ===================== PASSWORD TOGGLE ===================== */
function togglePassword(inputId, iconSpan) {
    const input = el(inputId);
    if (!input) return;
    const icon = iconSpan?.querySelector("i");
    if (!icon) return;

    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("bi-eye", "bi-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("bi-eye-slash", "bi-eye");
    }
}

/* ===================== AUTH ===================== */
async function login() {
    const email = el("loginEmail")?.value?.trim();
    const password = el("loginPassword")?.value;

    const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!data.token) {
        alert(data.message || "Invalid credentials");
        return;
    }

    localStorage.setItem("token", data.token);
    token = data.token;
    showDashboard();
}

async function signup() {
    const name = el("signupName")?.value?.trim();
    const email = el("signupEmail")?.value?.trim();
    const password = el("signupPassword")?.value;

    const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    alert(data.message || "Account created");
    showLogin();
}

async function resetPassword() {
    const email = el("forgotEmail")?.value?.trim();
    const newPassword = el("newPassword")?.value;

    const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword })
    });

    const data = await res.json();
    alert(data.message || "Password updated");
    showLogin();
}

function logout() {
    localStorage.removeItem("token");
    token = null;

    hideAll();
    setNavbarVisible(false);
    el("introPage")?.classList.remove("d-none");
}


/* ===================== DAILY CHECK-IN ===================== */
async function checkToday() {
    const todayStatus = el("todayStatus");
    if (!todayStatus) return;

    const res = await fetch(`${API}/checkin/today`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
        logout();
        return;
    }

    const data = await res.json();

    if (!data.exists) {
        todayStatus.innerText = "Please complete today's check-in";
        new bootstrap.Modal(el("dailyCheckinModal")).show();
    } else {
        todayStatus.innerText = "Check-in completed for today";
    }
}

async function submitCheckin() {
    const body = {
        mood: el("mood")?.value,
        stress: el("stress")?.value,
        energy: el("energy")?.value,
        sleep: el("sleep")?.value
    };

    const res = await fetch(`${API}/checkin`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Check-in failed");
        return;
    }

    bootstrap.Modal.getInstance(el("dailyCheckinModal")).hide();
    el("todayStatus").innerText = "Check-in completed for today";

    await loadTodayValues();
    await loadWeeklyChart();
}

/* ===================== DASHBOARD VALUES ===================== */
async function loadTodayValues() {
    const res = await fetch(`${API}/checkin/latest`, {
        headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) return;

    const latest = await res.json();
    if (!latest) return;

    el("moodValue").innerText = latest.mood ?? "–";
    el("energyValue").innerText = latest.energy ?? "–";
    el("sleepValue").innerText = latest.sleep ?? "–";
}

/* ===================== CHART ===================== */
async function loadWeeklyChart() {
    const res = await fetch(`${API}/checkin`, {
        headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) return;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return;

    const last7 = data.slice(-7);

    const labels = last7.map(d => {
        const dt = new Date(d.date);
        return dt.toLocaleDateString("en-IN", { weekday: "short" });
    });

    const moods = last7.map(d => d.mood);
    const stresses = last7.map(d => d.stress);
    const energies = last7.map(d => d.energy);
    const sleeps = last7.map(d => d.sleep);

    const canvas = el("weeklyChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (weeklyChartInstance) weeklyChartInstance.destroy();

    weeklyChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                { label: "Mood", data: moods, borderColor: "#2f7f7b", tension: 0.3 },
                { label: "Stress", data: stresses, borderColor: "#e76f51", tension: 0.3 },
                { label: "Energy", data: energies, borderColor: "#264653", tension: 0.3 },
                { label: "Sleep", data: sleeps, borderColor: "#457b9d", tension: 0.3 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } },
            scales: { y: { min: 0, max: 10, ticks: { stepSize: 1 } } }
        }
    });
}

/* ===================== PROFILE (PLACEHOLDER) ===================== */
function loadProfile() {
    el("profileName").innerText = "User";
    el("profileEmail").innerText = "—";
}

/* ===================== INIT ===================== */
function initApp() {
    hideAll();
    setNavbarVisible(false);

    if (!token) {
        el("introPage")?.classList.remove("d-none");
    } else {
        showDashboard();
    }
}

initApp();

/* Ensure inline onclick works */
window.showLogin = showLogin;
window.showSignup = showSignup;
window.showForgot = showForgot;
window.showDashboard = showDashboard;
window.showScreening = showScreening;
window.showProfile = showProfile;
window.login = login;
window.signup = signup;
window.resetPassword = resetPassword;
window.logout = logout;
window.togglePassword = togglePassword;
window.submitCheckin = submitCheckin;

/* ===================== SCREENING ===================== */

function submitScreening() {
    const form = document.getElementById("screeningForm");
    const resultBox = document.getElementById("screeningResult");

    let score = 0;

    for (let i = 1; i <= 7; i++) {
        const q = form.querySelector(`input[name="q${i}"]:checked`);
        if (!q) {
            alert("Please answer all questions.");
            return;
        }
        score += parseInt(q.value);
    }

    let message = "";

    if (score <= 6) {
        message = "🌱 Your responses suggest low distress levels. Keep maintaining healthy habits.";
    } else if (score <= 13) {
        message = "💛 You may be experiencing moderate stress. Small self-care steps could help.";
    } else {
        message = "🧠 Your responses suggest higher stress levels. Reaching out for support may be beneficial.";
    }

    resultBox.innerText = message;
    resultBox.classList.remove("d-none");
}
