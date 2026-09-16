import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    collection,
    query,
    where,
    limit,
    getDocs,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
const ridesList =
    document.getElementById("ridesList");


// ==========================================
// RATING ELEMENTS
// ==========================================

const ratingModal =
    document.getElementById("ratingModal");

const ratingDriver =
    document.getElementById("ratingDriver");

const stars =
    document.querySelectorAll(".star");

const ratingText =
    document.getElementById("ratingText");

const reviewText =
    document.getElementById("reviewText");

const submitRating =
    document.getElementById("submitRating");

const cancelRating =
    document.getElementById("cancelRating");

const ratingMessage =
    document.getElementById("ratingMessage");


// ==========================================
// RATING STATE
// ==========================================

let selectedRating = 0;

let selectedRide = null;

let currentUserId = null;


// ==========================================
// AUTH CHECK
// ==========================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;
    }

    currentUserId = user.uid;

    await loadRideHistory(user.uid);

});


// ==========================================
// LOAD RIDE HISTORY
// ==========================================

async function loadRideHistory(userId) {

    try {

        const ridesRef =
            collection(db, "rides");


        const ridesQuery =
            query(
                ridesRef,
                where("userId", "==", userId),
                limit(50)
            );


        const snapshot =
            await getDocs(ridesQuery);


        let rides = [];


        snapshot.forEach((rideDoc) => {

            rides.push({

                id: rideDoc.id,

                ...rideDoc.data()

            });

        });


        // ==========================================
        // NEWEST FIRST
        // ==========================================

        rides.sort((a, b) => {

            const timeA =
                a.createdAt?.toMillis?.() || 0;

            const timeB =
                b.createdAt?.toMillis?.() || 0;

            return timeB - timeA;

        });


        displayRides(rides);


    } catch (error) {

        console.error(
            "Ride history error:",
            error
        );


        ridesList.innerHTML = `

            <div class="empty-history">

                <h3>❌ Unable to load rides</h3>

                <p>
                    ${escapeHTML(error.message)}
                </p>

            </div>

        `;

    }

}


// ==========================================
// DISPLAY RIDES
// ==========================================

function displayRides(rides) {

    if (rides.length === 0) {

        ridesList.innerHTML = `

            <div class="empty-history">

                <div style="font-size:50px;">
                    🚕
                </div>

                <h3>
                    No rides yet
                </h3>

                <p>
                    Your rides will appear here.
                </p>

                <button
                    class="book-btn"
                    style="
                        margin-top:20px;
                        padding:12px 20px;
                        border:none;
                        border-radius:8px;
                        cursor:pointer;
                    "
                    onclick="window.location.href='book.html'">

                    Book Your First Ride

                </button>

            </div>

        `;

        return;
    }


    ridesList.innerHTML = "";


    rides.forEach((ride, index) => {

        const rideElement =
            createRideElement(
                ride,
                index
            );


        ridesList.appendChild(
            rideElement
        );

    });

}


// ==========================================
// CREATE RIDE CARD
// ==========================================

function createRideElement(
    ride,
    index
) {

    const card =
        document.createElement("div");


    card.className =
        "ride-item";


    const status =
        ride.status || "pending";


    const fare =
        ride.finalFare ??
        ride.fare ??
        0;


    const distance =
        ride.distance
            ? Number(ride.distance).toFixed(2)
            : "N/A";


    const payment =
        ride.payment || "Cash";


    const vehicle =
        ride.vehicle || "N/A";


    const pickup =
        ride.pickup || "N/A";


    const drop =
        ride.drop || "N/A";


    const date =
        formatDate(
            ride.createdAt
        );


    const hasRating =
        ride.userRating !== undefined &&
        ride.userRating !== null &&
        Number(ride.userRating) > 0;


    card.innerHTML = `

        <div class="ride-top">

            <h3>
                🚕 Ride #${index + 1}
            </h3>

            <span class="${getStatusClass(status)}">

                ${capitalize(status)}

            </span>

        </div>


        <p>
            <strong>Pickup:</strong>
            ${escapeHTML(pickup)}
        </p>


        <p>
            <strong>Drop:</strong>
            ${escapeHTML(drop)}
        </p>


        <p>
            <strong>Date:</strong>
            ${date}
        </p>


        <p>
            <strong>Vehicle:</strong>
            ${escapeHTML(vehicle)}
        </p>


        <p>
            <strong>Distance:</strong>
            ${distance} km
        </p>


        <p>
            <strong>Fare:</strong>
            ₹${fare}
        </p>


        <p>
            <strong>Payment:</strong>
            ${escapeHTML(payment)}
        </p>


        ${
            ride.driverId
                ? `
                    <p>
                        <strong>Driver:</strong>
                        Assigned
                    </p>
                `
                : `
                    <p>
                        <strong>Driver:</strong>
                        Not Assigned
                    </p>
                `
        }


        ${
            hasRating
                ? `
                    <div class="rating-display">

                        <strong>Your Rating:</strong>

                        ${"⭐".repeat(
                            Number(ride.userRating)
                        )}

                        <br>

                        ${
                            ride.userReview
                                ? `
                                    <small>
                                        "${escapeHTML(
                                            ride.userReview
                                        )}"
                                    </small>
                                `
                                : ""
                        }

                    </div>
                `
                : ""
        }


        <div class="ride-actions">

            <button
                class="details-btn">

                👁 View Details

            </button>


            <button
                class="book-btn">

                🚕 Book Again

            </button>


            <button
                class="invoice-btn">

                🧾 Invoice

            </button>


            ${
                status === "completed" &&
                ride.driverId &&
                !hasRating
                    ? `
                        <button
                            class="rating-btn">

                            ⭐ Rate Driver

                        </button>
                    `
                    : ""
            }

        </div>

    `;


    // ==========================================
    // VIEW DETAILS
    // ==========================================

    const detailsBtn =
        card.querySelector(
            ".details-btn"
        );


    detailsBtn.addEventListener(
        "click",
        () => {

            showRideDetails(ride);

        }
    );


    // ==========================================
    // BOOK AGAIN
    // ==========================================

    const bookBtn =
        card.querySelector(
            ".book-btn"
        );


    bookBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "book.html";

        }
    );


    // ==========================================
    // INVOICE
    // ==========================================

    const invoiceBtn =
        card.querySelector(
            ".invoice-btn"
        );


    invoiceBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "invoice.html?rideId=" +
                encodeURIComponent(
                    ride.id
                );

        }
    );


    // ==========================================
    // RATING
    // ==========================================

    const ratingBtn =
        card.querySelector(
            ".rating-btn"
        );


    if (ratingBtn) {

        ratingBtn.addEventListener(
            "click",
            async () => {

                await openRatingModal(
                    ride
                );

            }
        );

    }


    return card;

}


// ==========================================
// OPEN RATING MODAL
// ==========================================

async function openRatingModal(ride) {

    selectedRide = ride;

    selectedRating = 0;

    reviewText.value = "";

    ratingMessage.textContent = "";

    ratingMessage.className =
        "rating-message";


    updateStars();


    ratingDriver.textContent =
        "Driver: Loading...";


    ratingModal.style.display =
        "flex";


    // ==========================================
    // LOAD DRIVER NAME
    // ==========================================

    if (ride.driverId) {

        try {

            const driverRef =
                doc(
                    db,
                    "users",
                    ride.driverId
                );


            const driverSnap =
                await getDoc(
                    driverRef
                );


            if (driverSnap.exists()) {

                const driver =
                    driverSnap.data();


                ratingDriver.textContent =
                    `Driver: ${
                        driver.name ||
                        driver.displayName ||
                        "Driver"
                    }`;

            } else {

                ratingDriver.textContent =
                    "Driver: Assigned Driver";

            }


        } catch (error) {

            console.error(
                "Driver load error:",
                error
            );


            ratingDriver.textContent =
                "Driver: Assigned Driver";

        }

    }

}


// ==========================================
// STAR CLICK
// ==========================================

stars.forEach((star) => {

    star.addEventListener(
        "click",
        () => {

            selectedRating =
                Number(
                    star.dataset.rating
                );


            updateStars();

        }
    );

});


// ==========================================
// UPDATE STARS
// ==========================================

function updateStars() {

    stars.forEach((star) => {

        const value =
            Number(
                star.dataset.rating
            );


        if (
            value <= selectedRating
        ) {

            star.classList.add(
                "active"
            );

        } else {

            star.classList.remove(
                "active"
            );

        }

    });


    const ratingLabels = {

        0: "Select a rating",

        1: "Very Poor 😞",

        2: "Poor 😕",

        3: "Average 😐",

        4: "Good 🙂",

        5: "Excellent 🤩"

    };


    ratingText.textContent =
        ratingLabels[
            selectedRating
        ];

}


// ==========================================
// CANCEL RATING
// ==========================================

cancelRating.addEventListener(
    "click",
    () => {

        closeRatingModal();

    }
);


// ==========================================
// CLICK OUTSIDE MODAL
// ==========================================

ratingModal.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            ratingModal
        ) {

            closeRatingModal();

        }

    }
);


// ==========================================
// SUBMIT RATING
// ==========================================

submitRating.addEventListener(
    "click",
    async () => {

        if (!selectedRide) {

            return;

        }


        if (selectedRating < 1) {

            ratingMessage.textContent =
                "Please select 1–5 stars.";

            ratingMessage.className =
                "rating-message rating-error";

            return;

        }


        if (!currentUserId) {

            ratingMessage.textContent =
                "Please login again.";

            ratingMessage.className =
                "rating-message rating-error";

            return;

        }


        try {

            submitRating.disabled = true;

            submitRating.textContent =
                "Submitting...";


            ratingMessage.textContent =
                "Saving your review...";


            const review =
                reviewText.value.trim();


            // ==========================================
            // SAVE TO RATINGS COLLECTION
            // ==========================================

            await addDoc(
                collection(
                    db,
                    "ratings"
                ),
                {

                    rideId:
                        selectedRide.id,

                    userId:
                        currentUserId,

                    driverId:
                        selectedRide.driverId,

                    rating:
                        selectedRating,

                    review:
                        review,

                    vehicle:
                        selectedRide.vehicle ||
                        "",

                    fare:
                        selectedRide.finalFare ??
                        selectedRide.fare ??
                        0,

                    createdAt:
                        serverTimestamp()

                }
            );


            // ==========================================
            // UPDATE RIDE
            // ==========================================

            const rideRef =
                doc(
                    db,
                    "rides",
                    selectedRide.id
                );


            // Note:
            // Firestore rules must allow the
            // customer to update these fields.

            await updateDoc(
    rideRef,
    {
        userRating: selectedRating,
        userReview: review,
        ratedAt: serverTimestamp()
    }
);
            // ==========================================
            // SUCCESS
            // ==========================================

            ratingMessage.textContent =
                "Rating submitted successfully! ⭐";


            ratingMessage.className =
                "rating-message rating-success";


            setTimeout(() => {

                closeRatingModal();

                loadRideHistory(
                    currentUserId
                );

            }, 1200);


        } catch (error) {

            console.error(
                "Rating error:",
                error
            );


            ratingMessage.textContent =
                error?.message ||
                "Failed to submit rating.";


            ratingMessage.className =
                "rating-message rating-error";


            submitRating.disabled = false;

            submitRating.textContent =
                "Submit Rating";

        }

    }
);


// ==========================================
// CLOSE RATING MODAL
// ==========================================

function closeRatingModal() {

    ratingModal.style.display =
        "none";

    selectedRide = null;

    selectedRating = 0;

    reviewText.value = "";

    ratingMessage.textContent = "";

}


// ==========================================
// VIEW RIDE DETAILS
// ==========================================

function showRideDetails(ride) {

    const fare =
        ride.finalFare ??
        ride.fare ??
        0;


    const rating =
        ride.userRating
            ? `${ride.userRating}/5 ⭐`
            : "Not Rated";


    alert(
`Ride Details

Ride ID:
${ride.id}

Pickup:
${ride.pickup || "N/A"}

Drop:
${ride.drop || "N/A"}

Vehicle:
${ride.vehicle || "N/A"}

Distance:
${ride.distance
    ? Number(ride.distance).toFixed(2) + " km"
    : "N/A"}

Fare:
₹${fare}

Payment:
${ride.payment || "N/A"}

Payment Status:
${ride.paymentStatus || "N/A"}

Ride Status:
${ride.status || "N/A"}

Rating:
${rating}

Review:
${ride.userReview || "Not Reviewed"}`
    );

}


// ==========================================
// DATE FORMAT
// ==========================================

function formatDate(timestamp) {

    if (!timestamp) {

        return "N/A";

    }


    try {

        const date =
            timestamp.toDate
                ? timestamp.toDate()
                : new Date(timestamp);


        return date.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    } catch (error) {

        return "N/A";

    }

}


// ==========================================
// STATUS CLASS
// ==========================================

function getStatusClass(status) {

    switch (status) {

        case "completed":
            return "completed";

        case "assigned":
            return "assigned";

        case "accepted":
            return "accepted";

        case "ongoing":
            return "ongoing";

        case "cancelled":
        case "rejected":
            return "cancelled";

        default:
            return "pending";

    }

}


// ==========================================
// CAPITALIZE
// ==========================================

function capitalize(text) {

    if (!text) {

        return "";

    }


    return text.charAt(0).toUpperCase()
        + text.slice(1);

}


// ==========================================
// HTML SECURITY
// ==========================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}