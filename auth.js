// ==========================================
// SITAMARHI CAB - AUTHENTICATION
// ==========================================

// Firebase Imports
import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ==========================================
// PASSWORD TOGGLE (LOGIN)
// ==========================================

const togglePassword = document.getElementById("togglePassword");

if (togglePassword) {

    togglePassword.addEventListener("click", () => {

        const password = document.getElementById("password");

        if (password.type === "password") {

            password.type = "text";

            togglePassword.innerHTML =
                '<i class="fas fa-eye-slash"></i>';

        } else {

            password.type = "password";

            togglePassword.innerHTML =
                '<i class="fas fa-eye"></i>';

        }

    });

}

// ==========================================
// PASSWORD TOGGLE (SIGNUP)
// ==========================================

const toggleSignupPassword =
document.getElementById("toggleSignupPassword");

if (toggleSignupPassword) {

    toggleSignupPassword.addEventListener("click", () => {

        const pass =
        document.getElementById("signupPassword");

        if (pass.type === "password") {

            pass.type = "text";

            toggleSignupPassword.classList.replace(
                "fa-eye",
                "fa-eye-slash"
            );

        } else {

            pass.type = "password";

            toggleSignupPassword.classList.replace(
                "fa-eye-slash",
                "fa-eye"
            );

        }

    });

}

// ==========================================
// CONFIRM PASSWORD TOGGLE
// ==========================================

const toggleConfirmPassword =
document.getElementById("toggleConfirmPassword");

if (toggleConfirmPassword) {

    toggleConfirmPassword.addEventListener("click", () => {

        const confirm =
        document.getElementById("confirmPassword");

        if (confirm.type === "password") {

            confirm.type = "text";

            toggleConfirmPassword.classList.replace(
                "fa-eye",
                "fa-eye-slash"
            );

        } else {

            confirm.type = "password";

            toggleConfirmPassword.classList.replace(
                "fa-eye-slash",
                "fa-eye"
            );

        }

    });

}
// ==========================================
// FIREBASE SIGNUP
// ==========================================

const signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const password = document.getElementById("signupPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const role = document.getElementById("role").value;

        if (
            name === "" ||
            email === "" ||
            phone === "" ||
            password === "" ||
            role === ""
        ) {
            alert("Please fill all fields.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        try {

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {

                uid: user.uid,
                name: name,
                email: email,
                phone: phone,
                role: role,

                status:
                    role === "driver"
                        ? "pending"
                        : "approved",

                createdAt: new Date()

            });

            alert("Account created successfully!");

            if (role === "driver") {

                alert(
                    "Your driver account is pending admin approval."
                );

            }

            window.location.href = "login.html";

        }
        catch (error) {

            alert(error.message);

        }

    });

}
// ==========================================
// FIREBASE LOGIN
// ==========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (email === "" || password === "") {
            alert("Please enter email and password.");
            return;
        }

        try {

            // Login user
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            const user = userCredential.user;

            // Read user data from Firestore
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert("User data not found.");
                return;
            }

            const userData = docSnap.data();

            // Redirect according to role
            if (userData.role === "admin") {

                window.location.href = "admin-dashboard.html";

            } else if (userData.role === "driver") {

                // Driver approval check
                if (userData.status !== "approved") {
                    alert("Your driver account is pending admin approval.");
                    return;
                }

                window.location.href = "driver-dashboard.html";

            } else {

                window.location.href = "dashboard.html";

            }

        } catch (error) {

            alert("Login Failed!\n\n" + error.message);

        }

    });

}
// ==========================================
// LOGOUT
// ==========================================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        try {

            await signOut(auth);

            alert("Logged out successfully.");

            window.location.href = "login.html";

        } catch (error) {

            alert(error.message);

        }

    });

}

// ==========================================
// FORGOT PASSWORD
// ==========================================

const forgotPassword = document.getElementById("forgotPassword");

if (forgotPassword) {

    forgotPassword.addEventListener("click", async (e) => {

        e.preventDefault();

        const email = prompt("Enter your registered email:");

        if (!email) return;

        try {

            await sendPasswordResetEmail(auth, email);

            alert("Password reset email sent successfully.");

        } catch (error) {

            alert(error.message);

        }

    });

}

// ==========================================
// GOOGLE SIGN IN
// ==========================================

const googleBtn = document.querySelector(".google-btn");

if (googleBtn) {

    googleBtn.addEventListener("click", async () => {

        try {

            const provider = new GoogleAuthProvider();

            const result = await signInWithPopup(auth, provider);

            const user = result.user;

            const userRef = doc(db, "users", user.uid);

            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {

                await setDoc(userRef, {

                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    phone: "",
                    role: "user",
                    status: "approved",
                    createdAt: new Date()

                });

            }

            window.location.href = "dashboard.html";

        } catch (error) {

            alert(error.message);

        }

    });

}

// ==========================================
// AUTO LOGIN CHECK
// ==========================================

import { onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {

    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const data = userSnap.data();

    if (location.pathname.includes("login.html") ||
        location.pathname.includes("signup.html")) {

        if (data.role === "admin") {

            window.location.href = "admin-dashboard.html";

        } else if (data.role === "driver") {

            if (data.status === "approved") {

                window.location.href = "driver-dashboard.html";

            }

        } else {

            window.location.href = "dashboard.html";

        }

    }

});