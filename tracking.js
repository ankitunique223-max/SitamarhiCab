import {
    auth,
    db
} from "./firebase.js";

import {
    doc,
    getDoc,
    onSnapshot,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ======================================================
// GLOBAL
// ======================================================

let currentUser = null;
let currentRide = null;

let rideListener = null;
let driverLocationListener = null;

let map = null;
let driverMarker = null;
let pickupMarker = null;

let currentRideId = null;


// ======================================================
// ELEMENTS
// ======================================================

const messageBox =
    document.getElementById("messageBox");

const trackingContent =
    document.getElementById("trackingContent");

const rideStatus =
    document.getElementById("rideStatus");

const pickupElement =
    document.getElementById("pickup");

const dropElement =
    document.getElementById("drop");

const fareElement =
    document.getElementById("fare");

const distanceElement =
    document.getElementById("distance");

const etaElement =
    document.getElementById("eta");

const paymentElement =
    document.getElementById("payment");

const driverCard =
    document.getElementById("driverCard");

const driverNameElement =
    document.getElementById("driverName");

const driverPhoneElement =
    document.getElementById("driverPhone");

const driverVehicleElement =
    document.getElementById("driverVehicle");


// ======================================================
// GET RIDE ID
// ======================================================

const params =
    new URLSearchParams(
        window.location.search
    );

currentRideId =
    params.get("rideId");


// ======================================================
// AUTH
// ======================================================

auth.onAuthStateChanged(
    async function(user) {

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }

        currentUser = user;

        if (!currentRideId) {

            showMessage(
                "❌ Ride ID missing."
            );

            return;
        }

        await loadRide();

    }
);


// ======================================================
// LOAD RIDE
// ======================================================

async function loadRide() {

    try {

        const rideRef =
            doc(
                db,
                "rides",
                currentRideId
            );

        const rideSnap =
            await getDoc(
                rideRef
            );


        if (!rideSnap.exists()) {

            showMessage(
                "❌ Ride not found."
            );

            return;
        }


        const ride =
            rideSnap.data();


        if (
            ride.userId !==
            currentUser.uid
        ) {

            showMessage(
                "❌ You are not allowed to track this ride."
            );

            return;
        }


        currentRide = {
            id: currentRideId,
            ...ride
        };


        renderRide(
            currentRide
        );


        startRideListener();

    } catch (error) {

        console.error(
            "Load ride error:",
            error
        );

        showMessage(
            "❌ Unable to load ride."
        );

    }

}


// ======================================================
// REALTIME RIDE LISTENER
// ======================================================

function startRideListener() {

    if (rideListener) {

        rideListener();

        rideListener = null;
    }


    const rideRef =
        doc(
            db,
            "rides",
            currentRideId
        );


    rideListener =
        onSnapshot(
            rideRef,

            function(snapshot) {

                if (!snapshot.exists()) {

                    showMessage(
                        "❌ Ride no longer exists."
                    );

                    return;
                }


                currentRide = {
                    id: snapshot.id,
                    ...snapshot.data()
                };


                renderRide(
                    currentRide
                );


                handleRideStatus(
                    currentRide
                );

            },

            function(error) {

                console.error(
                    "Ride listener error:",
                    error
                );

                showMessage(
                    "❌ Unable to monitor ride."
                );

            }
        );

}


// ======================================================
// RENDER RIDE
// ======================================================

function renderRide(ride) {

    messageBox.classList.add(
        "hidden"
    );

    trackingContent.classList.remove(
        "hidden"
    );


    pickupElement.textContent =
        ride.pickup || "-";

    dropElement.textContent =
        ride.drop || "-";


    const fare =
        Number(
            ride.finalFare ??
            ride.fare ??
            0
        );

    fareElement.textContent =
        "₹" + fare;


    paymentElement.textContent =
        ride.payment || "-";


    const status =
        ride.status || "pending";


    rideStatus.textContent =
        formatStatus(status);


    rideStatus.className =
        "status " + status;


    if (
        ride.driverId &&
        ride.driverId !== ""
    ) {

        loadDriver(
            ride.driverId
        );

    } else {

        driverCard.classList.add(
            "hidden"
        );

        stopDriverLocationListener();

        distanceElement.textContent =
            "Driver not assigned";

        etaElement.textContent =
            "-";
    }

}


// ======================================================
// DRIVER DETAILS
// ======================================================

async function loadDriver(
    driverId
) {

    try {

        const driverSnap =
            await getDoc(
                doc(
                    db,
                    "users",
                    driverId
                )
            );


        if (
            !driverSnap.exists()
        ) {

            return;
        }


        const driver =
            driverSnap.data();


        driverCard.classList.remove(
            "hidden"
        );


        driverNameElement.textContent =
            driver.name ||
            driver.displayName ||
            "Driver";


        driverPhoneElement.textContent =
            driver.phone ||
            driver.mobile ||
            "Unavailable";


        driverVehicleElement.textContent =
            driver.vehicle ||
            driver.vehicleNumber ||
            "Cab";


        const phone =
            driver.phone ||
            driver.mobile ||
            "";


        const callBtn =
            document.getElementById(
                "callBtn"
            );


        if (callBtn) {

            callBtn.onclick =
                function() {

                    if (!phone) {

                        alert(
                            "Driver phone number unavailable."
                        );

                        return;
                    }

                    window.location.href =
                        "tel:" + phone;

                };

        }


        startDriverLocationListener(
            driverId
        );

    } catch (error) {

        console.error(
            "Driver load error:",
            error
        );

    }

}


// ======================================================
// DRIVER GPS LISTENER
// ======================================================

function startDriverLocationListener(
    driverId
) {

    stopDriverLocationListener();


    const locationRef =
        doc(
            db,
            "driver_locations",
            driverId
        );


    driverLocationListener =
        onSnapshot(
            locationRef,

            function(snapshot) {

                if (!snapshot.exists()) {

                    distanceElement.textContent =
                        "Waiting for driver GPS...";

                    etaElement.textContent =
                        "Waiting...";

                    return;
                }


                const data =
                    snapshot.data();


                const latitude =
                    Number(
                        data.latitude
                    );

                const longitude =
                    Number(
                        data.longitude
                    );


                if (
                    !validCoordinate(
                        latitude,
                        longitude
                    )
                ) {

                    return;
                }


                updateDriverMarker(
                    latitude,
                    longitude
                );


                updateDistanceAndETA(
                    latitude,
                    longitude
                );

            },

            function(error) {

                console.error(
                    "Driver location error:",
                    error
                );

                distanceElement.textContent =
                    "Location unavailable";

            }
        );

}


// ======================================================
// STOP GPS LISTENER
// ======================================================

function stopDriverLocationListener() {

    if (
        driverLocationListener
    ) {

        driverLocationListener();

        driverLocationListener =
            null;
    }

}


// ======================================================
// MAP
// ======================================================

function initializeMap(
    latitude,
    longitude
) {

    if (map) {

        return;
    }


    if (
        typeof L ===
        "undefined"
    ) {

        console.error(
            "Leaflet not loaded."
        );

        return;
    }


    map =
        L.map(
            "liveMap"
        ).setView(
            [
                latitude,
                longitude
            ],
            14
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);

}


// ======================================================
// DRIVER MARKER
// ======================================================

function updateDriverMarker(
    latitude,
    longitude
) {

    initializeMap(
        latitude,
        longitude
    );


    if (!map) {

        return;
    }


    const position = [
        latitude,
        longitude
    ];


    if (!driverMarker) {

        const icon =
            L.divIcon({
                className:
                    "driver-marker",
                html:
                    "🚕",
                iconSize:
                    [40, 40],
                iconAnchor:
                    [20, 20]
            });


        driverMarker =
            L.marker(
                position,
                {
                    icon: icon
                }
            )
            .addTo(map)
            .bindPopup(
                "🚕 Driver"
            );

    } else {

        driverMarker.setLatLng(
            position
        );

    }


    map.setView(
        position,
        15
    );

}


// ======================================================
// PICKUP MARKER
// ======================================================

function addPickupMarker() {

    if (!map) {
        return;
    }


    const lat =
        Number(
            currentRide?.pickupLatitude
        );

    const lng =
        Number(
            currentRide?.pickupLongitude
        );


    if (
        !validCoordinate(
            lat,
            lng
        )
    ) {

        return;
    }


    if (pickupMarker) {

        pickupMarker.setLatLng([
            lat,
            lng
        ]);

        return;
    }


    pickupMarker =
        L.marker([
            lat,
            lng
        ])
        .addTo(map)
        .bindPopup(
            "📍 Pickup Location"
        );

}


// ======================================================
// DISTANCE + ETA
// ======================================================

function updateDistanceAndETA(
    driverLat,
    driverLng
) {

    if (!currentRide) {
        return;
    }


    const pickupLat =
        Number(
            currentRide.pickupLatitude
        );

    const pickupLng =
        Number(
            currentRide.pickupLongitude
        );


    if (
        !validCoordinate(
            pickupLat,
            pickupLng
        )
    ) {

        distanceElement.textContent =
            "GPS available";

        etaElement.textContent =
            "Calculating...";

        return;
    }


    addPickupMarker();


    const distance =
        calculateDistance(
            driverLat,
            driverLng,
            pickupLat,
            pickupLng
        );


    distanceElement.textContent =
        distance.toFixed(2) +
        " km";


    if (
        distance < 0.15
    ) {

        etaElement.textContent =
            "Arriving";

        return;
    }


    const averageSpeed =
        25;


    let eta =
        Math.ceil(
            (
                distance /
                averageSpeed
            ) * 60
        );


    if (eta < 1) {
        eta = 1;
    }


    etaElement.textContent =
        eta + " min";

}


// ======================================================
// HAVERSINE DISTANCE
// ======================================================

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R =
        6371;


    const dLat =
        toRadians(
            lat2 - lat1
        );

    const dLon =
        toRadians(
            lon2 - lon1
        );


    const a =
        Math.sin(
            dLat / 2
        ) ** 2
        +
        Math.cos(
            toRadians(lat1)
        )
        *
        Math.cos(
            toRadians(lat2)
        )
        *
        Math.sin(
            dLon / 2
        ) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return R * c;

}


function toRadians(
    value
) {

    return (
        value *
        Math.PI /
        180
    );

}


// ======================================================
// STATUS HANDLER
// ======================================================

function handleRideStatus(
    ride
) {

    if (
        ride.status ===
        "completed"
    ) {

        stopDriverLocationListener();

        etaElement.textContent =
            "Ride Completed";

        return;
    }


    if (
        ride.status ===
        "cancelled"
    ) {

        stopDriverLocationListener();

        etaElement.textContent =
            "Ride Cancelled";

        return;
    }


    if (
        ride.status ===
        "accepted" ||
        ride.status ===
        "ongoing"
    ) {

        if (
            ride.driverId
        ) {

            startDriverLocationListener(
                ride.driverId
            );

        }

    }

}


// ======================================================
// CANCEL RIDE
// ======================================================

document
    .getElementById("cancelBtn")
    ?.addEventListener(
        "click",
        async function() {

            if (!currentRide) {
                return;
            }


            if (
                ![
                    "pending",
                    "assigned",
                    "accepted"
                ].includes(
                    currentRide.status
                )
            ) {

                alert(
                    "This ride cannot be cancelled now."
                );

                return;
            }


            const confirmed =
                confirm(
                    "Are you sure you want to cancel this ride?"
                );


            if (!confirmed) {
                return;
            }


            try {

                await updateDoc(
                    doc(
                        db,
                        "rides",
                        currentRideId
                    ),
                    {
                        status:
                            "cancelled",

                        cancelledAt:
                            serverTimestamp(),

                        cancelledBy:
                            currentUser.uid
                    }
                );


                alert(
                    "Ride cancelled successfully."
                );

            } catch (error) {

                console.error(
                    "Cancel ride error:",
                    error
                );

                alert(
                    "Unable to cancel ride.\n\n" +
                    error.message
                );

            }

        }
    );


// ======================================================
// DASHBOARD BUTTONS
// ======================================================

document
    .getElementById("backBtn")
    ?.addEventListener(
        "click",
        function() {

            window.location.href =
                "dashboard.html";

        }
    );


document
    .getElementById("dashboardBtn")
    ?.addEventListener(
        "click",
        function() {

            window.location.href =
                "dashboard.html";

        }
    );


// ======================================================
// HELPERS
// ======================================================

function validCoordinate(
    latitude,
    longitude
) {

    return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );

}


function formatStatus(
    status
) {

    const labels = {

        pending:
            "⏳ Finding Driver",

        assigned:
            "🚕 Driver Assigned",

        accepted:
            "✅ Driver Accepted",

        ongoing:
            "🚗 Ride In Progress",

        completed:
            "🏁 Ride Completed",

        cancelled:
            "❌ Ride Cancelled"

    };


    return (
        labels[status] ||
        status
    );

}


function showMessage(
    message
) {

    messageBox.classList.remove(
        "hidden"
    );

    messageBox.innerHTML =
        message;

    trackingContent.classList.add(
        "hidden"
    );

}


// ======================================================
// CLEANUP
// ======================================================

window.addEventListener(
    "beforeunload",
    function() {

        if (rideListener) {
            rideListener();
        }

        if (
            driverLocationListener
        ) {
            driverLocationListener();
        }

    }
);


console.log(
    "🚕 SitamarhiCab Live Tracking loaded."
);