

// ==========================================
// SITAMARHICAB - COMPLETE BOOKING JS
// Firebase + OpenStreetMap + OSRM
// ==========================================

import { auth, db } from "./firebase.js";

import {
    addDoc,
    collection,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ==========================================
// CONFIG
// ==========================================

const bookingForm = document.getElementById("bookingForm");

const vehicleRates = {
    "Bike": 8,
    "Auto": 12,
    "Mini Cab": 15,
    "Sedan": 18,
    "SUV": 22
};

window.currentFare = 0;
window.currentDistance = 0;
window.currentPickupLocation = null;
window.currentDropLocation = null;

// ==========================================
// HELPERS
// ==========================================

function validNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

function getValue(id) {
    return document.getElementById(id)?.value?.trim() || "";
}

// ==========================================
// GEOCODING
// ==========================================

async function geocodeLocation(location) {
    const cleanLocation = String(location || "").trim();

    if (!cleanLocation) {
        throw new Error("Location is empty.");
    }

    const queries = [
        cleanLocation,
        `${cleanLocation}, Sitamarhi, Bihar, India`,
        `${cleanLocation}, Bihar, India`,
        `${cleanLocation}, India`
    ];

    for (const searchQuery of queries) {
        try {
            const url =
                "https://nominatim.openstreetmap.org/search" +
                "?format=jsonv2&limit=1&q=" +
                encodeURIComponent(searchQuery);

            const response = await fetch(url);

            if (!response.ok) continue;

            const results = await response.json();

            if (Array.isArray(results) && results.length > 0) {
                const lat = Number(results[0].lat);
                const lng = Number(results[0].lon);

                if (validNumber(lat) && validNumber(lng)) {
                    return { lat, lng };
                }
            }
        } catch (error) {
            console.warn("Geocoding failed:", error);
        }
    }

    throw new Error(`Location not found: ${cleanLocation}`);
}

// ==========================================
// ROUTE DISTANCE
// ==========================================

async function getRouteDistance(pickup, drop) {
    const pickupLocation = await geocodeLocation(pickup);
    const dropLocation = await geocodeLocation(drop);

    window.currentPickupLocation = pickupLocation;
    window.currentDropLocation = dropLocation;

    const url =
        "https://router.project-osrm.org/route/v1/driving/" +
        `${pickupLocation.lng},${pickupLocation.lat};` +
        `${dropLocation.lng},${dropLocation.lat}` +
        "?overview=false";

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Route service is unavailable.");
    }

    const result = await response.json();

    if (
        result.code !== "Ok" ||
        !result.routes ||
        !result.routes.length
    ) {
        throw new Error("Road route could not be calculated.");
    }

    const distanceKm = Number(result.routes[0].distance) / 1000;

    if (!validNumber(distanceKm) || distanceKm <= 0) {
        throw new Error("Invalid route distance.");
    }

    return distanceKm;
}

// ==========================================
// FARE CALCULATION
// ==========================================

window.calculateFare = async function () {
    const pickup = getValue("pickup");
    const drop = getValue("drop");
    const vehicle = getValue("vehicle");

    const fareElement = document.getElementById("fare");

    if (!pickup || !drop || !vehicle) {
        alert("Please enter pickup, drop and vehicle.");
        return;
    }

    const rate = vehicleRates[vehicle];

    if (!rate) {
        alert("Vehicle rate not found.");
        return;
    }

    if (fareElement) {
        fareElement.innerText = "Calculating...";
    }

    try {
        const distanceKm = await getRouteDistance(pickup, drop);

        let fare = Math.round(distanceKm * rate);

        if (fare < 50) {
            fare = 50;
        }

        window.currentFare = fare;
        window.currentDistance = distanceKm;

        if (fareElement) {
            fareElement.innerText = "₹" + fare;
        }

        console.log("Distance:", distanceKm);
        console.log("Fare:", fare);

    } catch (error) {
        console.error("Fare calculation error:", error);

        window.currentFare = 0;
        window.currentDistance = 0;

        window.currentPickupLocation = null;
        window.currentDropLocation = null;

        if (fareElement) {
            fareElement.innerText = "₹0";
        }

        alert(error.message);
    }
};

// ==========================================
// SAVE RIDE TO FIRESTORE
// ==========================================

async function saveRide(data) {
    try {
        const user = auth.currentUser;

        if (!user) {
            throw new Error("Please login again.");
        }

        const pickupLatitude = Number(data.pickupLatitude);
        const pickupLongitude = Number(data.pickupLongitude);
        const dropLatitude = Number(data.dropLatitude);
        const dropLongitude = Number(data.dropLongitude);

        if (
            !validNumber(pickupLatitude) ||
            !validNumber(pickupLongitude) ||
            !validNumber(dropLatitude) ||
            !validNumber(dropLongitude)
        ) {
            throw new Error("Valid pickup and drop coordinates are required.");
        }

        const fare = Number(data.fare);
        const distance = Number(data.distance);

        if (!validNumber(fare) || fare <= 0) {
            throw new Error("Invalid fare.");
        }

        if (!validNumber(distance) || distance <= 0) {
            throw new Error("Invalid distance.");
        }

        const rideData = {
            userId: user.uid,

            pickup: String(data.pickup),
            drop: String(data.drop),

            phone: String(data.phone),

            vehicle: String(data.vehicle),
            payment: String(data.payment),

            date: String(data.date),
            time: String(data.time),

            fare: fare,
            distance: distance,

            pickupLatitude,
            pickupLongitude,

            dropLatitude,
            dropLongitude,

            status: "pending",
            driverId: "",

            paymentStatus: "pending",

            createdAt: serverTimestamp()
        };

        console.log("Creating ride:", {
            userId: rideData.userId,
            status: rideData.status,
            driverId: rideData.driverId,
            payment: rideData.payment
        });

        const rideRef = await addDoc(
            collection(db, "rides"),
            rideData
        );

        console.log("Ride created successfully:", rideRef.id);

        return rideRef.id;

    } catch (error) {
        console.error("FIRESTORE RIDE CREATE ERROR:", error);
        throw error;
    }
}

// ==========================================
// BOOKING FORM SUBMIT
// ==========================================

if (bookingForm) {
    bookingForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const submitButton =
            bookingForm.querySelector('[type="submit"]');

        try {
            const user = auth.currentUser;

            if (!user) {
                alert("Please login first.");
                return;
            }

            const pickup = getValue("pickup");
            const drop = getValue("drop");
            const phone = getValue("phone");
            const vehicle = getValue("vehicle");
            const payment = getValue("payment");
            const date = getValue("date");
            const time = getValue("time");

            if (!pickup || !drop || !phone || !vehicle) {
                throw new Error("Please fill all required fields.");
            }

            if (!/^[0-9]{10}$/.test(phone)) {
                throw new Error("Enter a valid 10-digit phone number.");
            }

            if (!date || !time) {
                throw new Error("Please select date and time.");
            }

            if (!["Cash", "Online"].includes(payment)) {
                throw new Error("Please select a valid payment method.");
            }

            if (
                !window.currentFare ||
                !window.currentPickupLocation ||
                !window.currentDropLocation
            ) {
                throw new Error("Please click Estimate Fare first.");
            }

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Booking...";
            }

            const rideId = await saveRide({
                pickup,
                drop,
                phone,
                vehicle,
                payment,
                date,
                time,

                fare: window.currentFare,
                distance: window.currentDistance,

                pickupLatitude: window.currentPickupLocation.lat,
                pickupLongitude: window.currentPickupLocation.lng,

                dropLatitude: window.currentDropLocation.lat,
                dropLongitude: window.currentDropLocation.lng
            });

            console.log("Ride created:", rideId);

            if (payment === "Online") {
                window.location.href =
                    `payment.html?rideId=${encodeURIComponent(rideId)}`;
            } else {
                alert("Ride booked successfully!");

                window.location.href = "ride-history.html";
            }

        } catch (error) {
            console.error("BOOKING ERROR:", error);

            alert(
                error.message ||
                "Unable to book ride. Please try again."
            );

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Book Ride";
            }
        }
    });
}
