// ===============================
// Sitamarhi Cab - Script
// ===============================

// Navbar shadow on scroll
window.addEventListener("scroll", () => {
    const navbar = document.querySelector(".navbar");

    if (navbar) {
        if (window.scrollY > 30) {
            navbar.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
        } else {
            navbar.style.boxShadow = "none";
        }
    }
});


// ===============================
// BOOK RIDE BUTTON
// ===============================

// Homepage Book Ride button
const bookBtn = document.querySelector(".book-btn");

if (bookBtn) {
    bookBtn.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "book.html";
    });
}


// ===============================
// FIND RIDE BUTTON
// ===============================

const findRideBtn = document.querySelector(".booking-card button");

if (findRideBtn) {
    findRideBtn.addEventListener("click", function () {

        const pickupInput = document.querySelector(
            'input[placeholder="Pickup Location"]'
        );

        const dropInput = document.querySelector(
            'input[placeholder="Drop Location"]'
        );

        const vehicleSelect = document.querySelector("select");

        const pickup = pickupInput ? pickupInput.value.trim() : "";
        const drop = dropInput ? dropInput.value.trim() : "";
        const vehicle = vehicleSelect ? vehicleSelect.value : "";

        if (pickup === "" || drop === "") {
            alert("Please enter Pickup and Drop location.");
            return;
        }

        alert(
            `Ride Details\n\nPickup: ${pickup}\nDrop: ${drop}\nVehicle: ${vehicle}\n\nSearching for nearby drivers...`
        );
    });
}


// ===============================
// CURRENT YEAR IN FOOTER
// ===============================

const footer = document.querySelector("footer p");

if (footer) {
    footer.innerHTML =
        `© ${new Date().getFullYear()} Sitamarhi Cab | All Rights Reserved`;
}


// ===============================
// FEATURE CARD ANIMATION
// ===============================

const featureBoxes = document.querySelectorAll(".feature-box");

featureBoxes.forEach(box => {

    box.addEventListener("mouseenter", () => {
        box.style.background = "#FFD700";
    });

    box.addEventListener("mouseleave", () => {
        box.style.background = "#ffffff";
    });

});


// ===============================
// RIDE BUTTONS
// ===============================

const rideButtons = document.querySelectorAll(".ride-btn");

rideButtons.forEach(button => {

    button.addEventListener("click", () => {
        window.location.href = "book.html";
    });

});


// ===============================
// DOWNLOAD APP BUTTON
// ===============================

const downloadBtn = document.querySelector(".download-app button");

if (downloadBtn) {

    downloadBtn.addEventListener("click", () => {
        alert("Android & iOS app is coming soon!");
    });

}


// ==============================
// BOOKING PAGE SCRIPT
// ==============================

// Prevent selecting a past date
const dateInput = document.getElementById("date");

if (dateInput) {

    const today = new Date()
        .toISOString()
        .split("T")[0];

    dateInput.min = today;
}


// ==============================
// FARE CALCULATOR
// ==============================

function calculateFare() {

    const vehicleElement = document.getElementById("vehicle");
    const pickupElement = document.getElementById("pickup");
    const dropElement = document.getElementById("drop");
    const fareElement = document.getElementById("fare");

    if (!vehicleElement || !pickupElement || !dropElement || !fareElement) {
        return;
    }

    const vehicle = vehicleElement.value;
    const pickup = pickupElement.value.trim();
    const drop = dropElement.value.trim();

    if (pickup === "" || drop === "") {
        alert("Please enter Pickup and Drop locations.");
        return;
    }

    // Demo random distance (5 - 25 km)
    const distance = Math.floor(Math.random() * 21) + 5;

    let rate = 0;

    switch (vehicle) {

        case "Bike":
            rate = 10;
            break;

        case "Auto":
            rate = 15;
            break;

        case "Mini Cab":
            rate = 18;
            break;

        case "Sedan":
            rate = 22;
            break;

        case "SUV":
            rate = 30;
            break;

        default:
            rate = 20;
    }

    const fare = distance * rate;

    fareElement.innerHTML =
        "₹" + fare +
        "<br><small>" +
        distance +
        " km</small>";
}


// ==============================
// CLOSE POPUP
// ==============================

function closePopup() {

    const popup = document.getElementById("popup");

    if (popup) {
        popup.style.display = "none";
    }

    if (typeof bookingForm !== "undefined" && bookingForm) {
        bookingForm.reset();
    }

    const fareElement = document.getElementById("fare");

    if (fareElement) {
        fareElement.innerHTML = "₹0";
    }
}


// ==============================
// ACTION BUTTON
// ==============================

const actionBtn = document.querySelector(".action-btn");

if (actionBtn) {

    actionBtn.addEventListener("click", function () {
        window.location.href = "book.html";
    });

}