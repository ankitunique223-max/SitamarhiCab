import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ===============================
// GLOBAL VARIABLES
// ===============================

let currentUser = null;
let rideId = null;
let rideData = null;
let selectedRating = 0;


// ===============================
// GET RIDE ID FROM URL
// ===============================

const params = new URLSearchParams(window.location.search);

rideId = params.get("rideId");


// ===============================
// ELEMENTS
// ===============================

const stars = document.querySelectorAll(".star");
const ratingText = document.getElementById("ratingText");
const commentInput = document.getElementById("comment");
const submitButton = document.getElementById("submitRating");
const message = document.getElementById("message");


// ===============================
// RATING TEXT
// ===============================

const ratingLabels = {
    1: "Very Bad 😞",
    2: "Bad 😕",
    3: "Average 😐",
    4: "Good 😊",
    5: "Excellent 🤩"
};


// ===============================
// STAR CLICK
// ===============================

stars.forEach(star => {

    star.addEventListener("click", () => {

        selectedRating = Number(star.dataset.rating);

        updateStars();

        ratingText.textContent = ratingLabels[selectedRating];

    });

});


// ===============================
// UPDATE STAR UI
// ===============================

function updateStars() {

    stars.forEach(star => {

        const rating = Number(star.dataset.rating);

        if (rating <= selectedRating) {
            star.classList.add("active");
        } else {
            star.classList.remove("active");
        }

    });

}


// ===============================
// AUTH CHECK
// ===============================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;
    }

    currentUser = user;

    await loadRide();

});


// ===============================
// LOAD RIDE
// ===============================

async function loadRide() {

    if (!rideId) {

        showMessage(
            "Ride ID not found.",
            "red"
        );

        submitButton.disabled = true;

        return;
    }


    try {

        const rideRef = doc(
            db,
            "rides",
            rideId
        );

        const rideSnap = await getDoc(rideRef);


        if (!rideSnap.exists()) {

            showMessage(
                "Ride not found.",
                "red"
            );

            submitButton.disabled = true;

            return;
        }


        rideData = rideSnap.data();


        // ===============================
        // CHECK RIDE OWNER
        // ===============================

        if (rideData.userId !== currentUser.uid) {

            showMessage(
                "You are not allowed to rate this ride.",
                "red"
            );

            submitButton.disabled = true;

            return;
        }


        // ===============================
        // CHECK COMPLETED
        // ===============================

        if (rideData.status !== "completed") {

            showMessage(
                "You can rate the ride after it is completed.",
                "red"
            );

            submitButton.disabled = true;

            return;
        }


        // ===============================
        // CHECK DRIVER
        // ===============================

        if (!rideData.driverId) {

            showMessage(
                "Driver information not found.",
                "red"
            );

            submitButton.disabled = true;

            return;
        }


        // ===============================
        // CHECK EXISTING RATING
        // ===============================

        const ratingRef = doc(
            db,
            "ratings",
            rideId
        );

        const ratingSnap = await getDoc(ratingRef);


        if (ratingSnap.exists()) {

            const existingRating = ratingSnap.data();

            selectedRating = existingRating.rating || 0;

            commentInput.value =
                existingRating.comment || "";

            updateStars();

            ratingText.textContent =
                ratingLabels[selectedRating] || "Rating submitted";

            showMessage(
                "You have already rated this ride.",
                "green"
            );

            submitButton.disabled = true;

        }

    } catch (error) {

        console.error(
            "Load ride error:",
            error
        );

        showMessage(
            "Unable to load ride.",
            "red"
        );

    }

}


// ===============================
// SUBMIT RATING
// ===============================

submitButton.addEventListener("click", async () => {

    if (!currentUser) {

        showMessage(
            "Please login first.",
            "red"
        );

        return;
    }


    if (!rideData) {

        showMessage(
            "Ride information not loaded.",
            "red"
        );

        return;
    }


    // ===============================
    // VALIDATE RATING
    // ===============================

    if (
        selectedRating < 1 ||
        selectedRating > 5
    ) {

        showMessage(
            "Please select a rating from 1 to 5 stars.",
            "red"
        );

        return;
    }


    // ===============================
    // COMMENT
    // ===============================

    const comment =
        commentInput.value.trim();


    submitButton.disabled = true;

    submitButton.textContent =
        "Submitting...";


    try {

        const ratingRef = doc(
            db,
            "ratings",
            rideId
        );


        // ===============================
        // SAVE RATING
        // ===============================

        await setDoc(ratingRef, {

            rideId: rideId,

            userId: currentUser.uid,

            driverId: rideData.driverId,

            rating: selectedRating,

            comment: comment,

            createdAt: serverTimestamp()

        });


        // ===============================
        // UPDATE RIDE
        // ===============================

        const rideRef = doc(
            db,
            "rides",
            rideId
        );


        await setDoc(
            rideRef,
            {
                userRating: selectedRating,
                userReview: comment
            },
            {
                merge: true
            }
        );


        showMessage(
            "Rating submitted successfully! ⭐",
            "green"
        );


        submitButton.textContent =
            "Rating Submitted ✓";


        commentInput.disabled = true;


        stars.forEach(star => {
            star.style.pointerEvents = "none";
        });


        // ===============================
        // REDIRECT
        // ===============================

        setTimeout(() => {

            window.location.href =
                "dashboard.html";

        }, 1800);


    } catch (error) {

        console.error(
            "Rating submit error:",
            error
        );


        submitButton.disabled = false;

        submitButton.textContent =
            "Submit Rating";


        if (error.code === "permission-denied") {

            showMessage(
                "Permission denied. Please check Firestore Rules.",
                "red"
            );

        } else {

            showMessage(
                "Failed to submit rating. Please try again.",
                "red"
            );

        }

    }

});


// ===============================
// SHOW MESSAGE
// ===============================

function showMessage(text, color) {

    message.textContent = text;

    message.style.color = color;

}