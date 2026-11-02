
import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Contact Form
const contactForm = document.getElementById("contactForm");
const submitBtn = contactForm?.querySelector('button[type="submit"]');

if (contactForm) {
    contactForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const message = document.getElementById("message").value.trim();

        if (name.length < 3) {
            alert("Please enter a valid name.");
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        if (!/^[0-9]{10}$/.test(phone)) {
            alert("Phone number must contain exactly 10 digits.");
            return;
        }

        if (message.length < 10) {
            alert("Message should be at least 10 characters.");
            return;
        }

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Sending...";
            }

            await addDoc(collection(db, "contactMessages"), {
                name,
                email,
                phone,
                message,
                createdAt: serverTimestamp(),
                status: "new"
            });

            alert("Thank you! Your message has been submitted successfully.");
            contactForm.reset();

        } catch (error) {
            console.error("Contact form error:", error);
            alert("Message could not be sent. Please try again later.");

        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Send Message";
            }
        }
    });
}
