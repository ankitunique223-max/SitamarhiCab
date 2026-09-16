// ==========================
// PROFILE PAGE
// ==========================

// Edit Profile
const editBtn = document.getElementById("editBtn");

if (editBtn) {
    editBtn.addEventListener("click", () => {
        alert("✏️ Edit Profile feature will be available soon.");
    });
}

// Change Password
const passwordBtn = document.getElementById("passwordBtn");

if (passwordBtn) {
    passwordBtn.addEventListener("click", () => {
        alert("🔒 Change Password feature coming soon.");
    });
}

// Ride History
const historyBtn = document.getElementById("historyBtn");

if (historyBtn) {
    historyBtn.addEventListener("click", () => {
        window.location.href = "ride-history.html";
    });
}

// Logout
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {

        const confirmLogout = confirm("Are you sure you want to logout?");

        if (confirmLogout) {
            alert("✅ Logged Out Successfully");
            window.location.href = "login.html";
        }

    });
}
