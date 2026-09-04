const email = document.getElementById("email");
const password = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");

const authStatus = document.getElementById("authStatus");

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");

const userInfo = document.getElementById("userInfo");

const replyMode = document.getElementById("replyMode");
const saveMode = document.getElementById("saveMode");

const sendMode = document.getElementById("sendMode");
const saveSendMode = document.getElementById("saveSendMode");

const logoutBtn = document.getElementById("logoutBtn");

const status = document.getElementById("status");


// ============================================================
// LOGIN
// ============================================================

loginBtn.addEventListener("click", async () => {

    const userEmail = email.value.trim();
    const userPassword = password.value;

    if (!userEmail || !userPassword) {

        authStatus.textContent =
            "Please enter email and password";

        return;
    }

    try {

        const response = await fetch(
            "http://localhost:3000/auth/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: userEmail,
                    password: userPassword
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            authStatus.textContent =
                data.error || "Login failed";

            return;
        }

        await chrome.storage.local.set({
            token: data.token,
            user: data.user
        });

        authStatus.textContent =
            "Login successful";

        showApp(data.user);

        await loadReplySettings();

    } catch (error) {

        console.error(
            "❌ Login error:",
            error
        );

        authStatus.textContent =
            "Server connection failed";
    }

});


// ============================================================
// REGISTER
// ============================================================

registerBtn.addEventListener("click", async () => {

    const userEmail = email.value.trim();
    const userPassword = password.value;

    if (!userEmail || !userPassword) {

        authStatus.textContent =
            "Please enter email and password";

        return;
    }

    try {

        const response = await fetch(
            "http://localhost:3000/auth/register",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: userEmail.split("@")[0],
                    email: userEmail,
                    password: userPassword
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            authStatus.textContent =
                data.error || "Registration failed";

            return;
        }

        authStatus.textContent =
            "Registration successful. Please login.";

    } catch (error) {

        console.error(
            "❌ Registration error:",
            error
        );

        authStatus.textContent =
            "Server connection failed";
    }

});


// ============================================================
// SHOW APP
// ============================================================

function showApp(user) {

    authSection.style.display = "none";

    appSection.style.display = "block";

    userInfo.textContent =
        `Logged in as: ${user.email}`;
}


// ============================================================
// CHECK EXISTING LOGIN
// ============================================================

async function checkLogin() {

    try {

        const result =
            await chrome.storage.local.get([
                "token",
                "user"
            ]);

        if (result.token && result.user) {

            showApp(result.user);

            await loadReplySettings();

        }

    } catch (error) {

        console.error(
            "❌ Login check error:",
            error
        );

    }

}


// ============================================================
// SAVE REPLY STYLE
// ============================================================

saveMode.addEventListener("click", async () => {

    try {

        const result =
            await chrome.storage.local.get("token");

        const token =
            result.token;

        if (!token) {

            status.textContent =
                "Please login first.";

            return;
        }

        const selectedReplyMode =
            replyMode.value;

        console.log(
            "🎯 Selected reply mode:",
            selectedReplyMode
        );

        const response =
            await fetch(
                "http://localhost:3000/update-reply-mode",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        mode: selectedReplyMode
                    })
                }
            );

        const data =
            await response.json();

        console.log(
            "📥 Reply mode response:",
            data
        );

        if (!response.ok) {

            throw new Error(
                data.error ||
                `Server returned HTTP ${response.status}`
            );

        }

        status.textContent =
            `Reply style saved: ${data.mode}`;

        console.log(
            "✅ Reply mode saved:",
            data.mode
        );

    } catch (error) {

        console.error(
            "❌ Save reply style error:",
            error
        );

        status.textContent =
            "Failed to save reply style.";

    }

});


// ============================================================
// SAVE AUTO / MANUAL SEND MODE
// ============================================================

saveSendMode.addEventListener("click", async () => {

    try {

        const result =
            await chrome.storage.local.get("token");

        const token =
            result.token;

        if (!token) {

            status.textContent =
                "Please login first.";

            console.log(
                "❌ No login token found."
            );

            return;
        }

        const selectedSendMode =
            sendMode.value;

        console.log(
            "⚙️ Selected send mode:",
            selectedSendMode
        );

        const response =
            await fetch(
                "http://localhost:3000/update-send-mode",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        sendMode: selectedSendMode
                    })
                }
            );

        const data =
            await response.json();

        console.log(
            "📥 Send mode response:",
            data
        );

        if (!response.ok) {

            throw new Error(
                data.error ||
                `Server returned HTTP ${response.status}`
            );

        }

        await chrome.storage.local.set({
            sendMode: data.sendMode
        });

        status.textContent =
            `Sending mode saved: ${data.sendMode}`;

        console.log(
            "💾 Send mode saved locally:",
            data.sendMode
        );

    } catch (error) {

        console.error(
            "❌ Save sending mode error:",
            error
        );

        status.textContent =
            "Failed to save sending mode.";

    }

});


// ============================================================
// LOAD USER REPLY SETTINGS
// ============================================================

async function loadReplySettings() {

    try {

        const result =
            await chrome.storage.local.get("token");

        const token =
            result.token;

        if (!token) {

            console.log(
                "🔐 No token. Cannot load settings."
            );

            return;
        }

        const response =
            await fetch(
                "http://localhost:3000/reply-settings",
                {
                    method: "GET",

                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                `Server returned HTTP ${response.status}`
            );

        }

        // Load saved reply style.
        replyMode.value =
            data.replyMode || "normal";

        // Load saved sending mode.
        sendMode.value =
            data.sendMode || "manual";

        // Keep content.js synchronized.
        await chrome.storage.local.set({
            sendMode:
                data.sendMode || "manual"
        });

        console.log(
            "⚙️ Settings loaded:",
            data
        );

    } catch (error) {

        console.error(
            "❌ Failed to load reply settings:",
            error
        );

    }

}


// ============================================================
// LOGOUT
// ============================================================

logoutBtn.addEventListener("click", async () => {

    await chrome.storage.local.remove([
        "token",
        "user",
        "sendMode"
    ]);

    appSection.style.display = "none";

    authSection.style.display = "block";

    email.value = "";
    password.value = "";

    authStatus.textContent =
        "Logged out";

    status.textContent =
        "Ready";

});


// ============================================================
// START
// ============================================================

checkLogin();