// ==========================================================
// SITAMARHI CAB - ADMIN LOGIN
// ==========================================================

import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================================
// ELEMENTS
// ==========================================================

const loginForm = document.getElementById("adminLoginForm");
const emailInput = document.getElementById("adminEmail");
const passwordInput = document.getElementById("adminPassword");
const togglePassword = document.getElementById("toggleAdminPassword");


// ==========================================================
// PASSWORD SHOW / HIDE
// ==========================================================

if (togglePassword && passwordInput) {

    togglePassword.addEventListener("click", () => {

        if (passwordInput.type === "password") {

            passwordInput.type = "text";

            const icon =
                togglePassword.querySelector("i");

            if (icon) {
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            }

        } else {

            passwordInput.type = "password";

            const icon =
                togglePassword.querySelector("i");

            if (icon) {
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        }
    });
}


// ==========================================================
// ADMIN LOGIN
// ==========================================================

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        if (!email || !password) {

            alert("Please enter email and password.");

            return;
        }


        const button =
            loginForm.querySelector("button[type='submit']");

        if (button) {

            button.disabled = true;
            button.textContent = "Logging in...";
        }


        try {

            // Firebase Authentication
            const credential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const uid =
                credential.user.uid;


            // Check Firestore profile
            const userRef =
                doc(
                    db,
                    "users",
                    uid
                );


            const userSnap =
                await getDoc(userRef);


            if (!userSnap.exists()) {

                await auth.signOut();

                alert(
                    "Admin profile not found."
                );

                return;
            }


            const userData =
                userSnap.data();


            // ==================================================
            // ADMIN ROLE CHECK
            // ==================================================

            if (userData.role !== "admin") {

                await auth.signOut();

                alert(
                    "Access denied. Admin account required."
                );

                return;
            }


            // ==================================================
            // ADMIN LOGIN SUCCESS
            // ==================================================

            window.location.href =
                "admin-dashboard.html";


        } catch (error) {

            console.error(
                "Admin login error:",
                error
            );


            let message =
                "Login failed. Please try again.";


            if (
                error.code ===
                "auth/invalid-credential"
            ) {

                message =
                    "Invalid email or password.";

            } else if (
                error.code ===
                "auth/user-not-found"
            ) {

                message =
                    "Admin account not found.";

            } else if (
                error.code ===
                "auth/wrong-password"
            ) {

                message =
                    "Incorrect password.";

            } else if (
                error.code ===
                "auth/too-many-requests"
            ) {

                message =
                    "Too many attempts. Please try again later.";
            }


            alert(message);


        } finally {

            if (button) {

                button.disabled = false;
                button.textContent = "Login";
            }
        }

    });
}