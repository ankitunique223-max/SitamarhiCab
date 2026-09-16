// ===============================
// Sitamarhi Cab - Script
// ===============================

// Navbar shadow on scroll
window.addEventListener("scroll", () => {
    const navbar = document.querySelector(".navbar");

    if (window.scrollY > 30) {
        navbar.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
    } else {
        navbar.style.boxShadow = "none";
    }
});

// Book Ride Button
const bookBtn = document.querySelector(".book-btn");

if (bookBtn) {
    bookBtn.addEventListener("click", function (e) {
        e.preventDefault();
        alert("Welcome to Sitamarhi Cab!\nBooking feature will be available soon.");
    });
}

// Find Ride Button
const findRideBtn = document.querySelector(".booking-card button");

if (findRideBtn) {
    findRideBtn.addEventListener("click", function () {

        const pickup = document.querySelector('input[placeholder="Pickup Location"]').value;
        const drop = document.querySelector('input[placeholder="Drop Location"]').value;
        const vehicle = document.querySelector("select").value;

        if (pickup === "" || drop === "") {
            alert("Please enter Pickup and Drop location.");
            return;
        }

        alert(
            `Ride Details\n\nPickup: ${pickup}\nDrop: ${drop}\nVehicle: ${vehicle}\n\nSearching for nearby drivers...`
        );
    });
}

// Current Year in Footer (optional)
const footer = document.querySelector("footer p");
if (footer) {
    footer.innerHTML = `© ${new Date().getFullYear()} Sitamarhi Cab | All Rights Reserved`;
}
    // Feature Card Animation

const featureBoxes = document.querySelectorAll(".feature-box");

featureBoxes.forEach(box => {
    box.addEventListener("mouseenter", () => {
        box.style.background = "#FFD700";
    });

    box.addEventListener("mouseleave", () => {
        box.style.background = "#ffffff";
    });
});
const rideButtons = document.querySelectorAll(".ride-btn");

rideButtons.forEach(button => {
    button.addEventListener("click", () => {
        alert("Ride booking page will open soon.");
    });
});
const downloadBtn = document.querySelector(".download-app button");

if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
        alert("Android & iOS app is coming soon!");
    });
}

// ==============================
// SITAMARHI CAB - BOOKING SCRIPT
// ==============================

// Prevent selecting a past date
const dateInput = document.getElementById("date");

if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;
}


// ==============================
// Fare Calculator
// ==============================

function calculateFare() {

    const vehicle = document.getElementById("vehicle").value;
    const pickup = document.getElementById("pickup").value.trim();
    const drop = document.getElementById("drop").value.trim();

    if (pickup === "" || drop === "") {
        alert("Please enter Pickup and Drop locations.");
        return;
    }

    // Demo random distance (5 - 25 km)
    const distance = Math.floor(Math.random() * 21) + 5;

    let rate = 0;

    switch(vehicle){

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

    document.getElementById("fare").innerHTML =
        "₹" + fare + "<br><small>" + distance + " km</small>";

}





// ==============================
// Close Popup
// ==============================

function closePopup(){

    document.getElementById("popup").style.display="none";

    bookingForm.reset();

    document.getElementById("fare").innerHTML="₹0";

}

// Book Ride Button

const bookBtn = document.querySelector('.action-btn');

if(bookBtn){

bookBtn.addEventListener("click",function(){

window.location.href="book.html";

});

}
