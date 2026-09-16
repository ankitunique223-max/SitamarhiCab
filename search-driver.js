// =====================================================
// SITAMARHI CAB
// CUSTOMER RIDE SEARCH + DRIVER TRACKING
// FINAL COMPLETE VERSION
// =====================================================

import {
    auth,
    db
} from "./firebase.js";

import {
    collection,
    query,
    where,
    limit,
    onSnapshot,
    getDoc,
    getDocs,
    doc,
    updateDoc,
    setDoc,
    serverTimestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
// =====================================================
// ELEMENTS
// =====================================================

const statusText = document.getElementById("statusText");
const driverCard = document.getElementById("driverCard");
const loader = document.getElementById("loader");
const errorBox = document.getElementById("errorBox");

const driverPhoto = document.getElementById("driverPhoto");
const driverName = document.getElementById("driverName");
const driverRating = document.getElementById("driverRating");
const driverVehicle = document.getElementById("driverVehicle");
const driverVehicleNumber =
    document.getElementById("driverVehicleNumber");

const driverRideStatus =
    document.getElementById("driverRideStatus");

const driverAwayText =
    document.getElementById("driverAwayText");

const distanceElement =
    document.getElementById("distance");

const etaElement =
    document.getElementById("eta");

const pickupText =
    document.getElementById("pickupText");

const dropText =
    document.getElementById("dropText");

const vehicleText =
    document.getElementById("vehicleText");

const fareText =
    document.getElementById("fareText");

const paymentText =
    document.getElementById("paymentText");

const rideStatusText =
    document.getElementById("rideStatusText");

const completedBox =
    document.getElementById("completedBox");

const callButton =
    document.getElementById("callButton");

const chatButton =
    document.getElementById("chatButton");

const cancelButton =
    document.getElementById("cancelButton");


// =====================================================
// GLOBAL VARIABLES
// =====================================================

let currentUser = null;
let currentRideId = null;
let currentRide = null;

let rideListener = null;
let driverLocationListener = null;
let searchTimer = null;

let assigning = false;

let map = null;

let pickupMarker = null;
let dropMarker = null;
let driverMarker = null;
let rideLine = null;

let lastDriverPosition = null;

let driverPhone = "";
// =====================================================
// CREATE NOTIFICATION
// =====================================================
async function createNotification(
    notificationId,
    userId,
    title,
    message,
    type,
    rideId
) {
    if (!userId) return;

    try {
        await setDoc(
            doc(db, "notifications", notificationId),
            {
                userId: userId,
                title: title,
                message: message,
                type: type,
                rideId: rideId,
                read: false,
                createdAt: serverTimestamp()
            },
            {
                merge: true
            }
        );

        console.log("🔔 Notification created:", notificationId);

    } catch (error) {
        console.error(
            "Notification error:",
            error
        );
    }
}


// =====================================================
// FIREBASE AUTH
// =====================================================

auth.onAuthStateChanged(async function (user) {

    if (!user) {

        window.location.href = "login.html";

        return;
    }

    currentUser = user;

    console.log(
        "👤 Customer logged in:",
        user.uid
    );

    await startCustomerRide();

});


// =====================================================
// START CUSTOMER RIDE
// =====================================================

async function startCustomerRide() {

    try {

        const params =
            new URLSearchParams(
                window.location.search
            );

        const urlRideId =
            params.get("rideId");

        // ---------------------------------------------
        // If rideId is present in URL
        // ---------------------------------------------

        if (urlRideId) {

            currentRideId =
                urlRideId;

        } else {

            currentRideId =
                await findLatestRide();

        }


        if (!currentRideId) {

            showError(
                "No ride found."
            );

            return;
        }


        console.log(
            "🚖 Current Ride ID:",
            currentRideId
        );


        listenToRide(
            currentRideId
        );


    } catch (error) {

        console.error(
            "❌ Start customer ride error:",
            error
        );

        showError(
            "Unable to load ride."
        );

    }

}


// =====================================================
// FIND LATEST RIDE
// =====================================================

async function findLatestRide() {

    try {

        const ridesQuery =
            query(
                collection(
                    db,
                    "rides"
                ),

                where(
                    "userId",
                    "==",
                    currentUser.uid
                ),

                limit(50)
            );


        const snapshot =
            await getDocs(
                ridesQuery
            );


        if (snapshot.empty) {

            return null;
        }


        let latestDoc = null;
        let latestTime = -1;


        snapshot.forEach(function (rideDoc) {

            const ride =
                rideDoc.data();

            let createdTime = 0;


            if (
                ride.createdAt &&
                typeof ride.createdAt.toMillis ===
                "function"
            ) {

                createdTime =
                    ride.createdAt.toMillis();

            } else if (
                ride.createdAt
            ) {

                const parsed =
                    new Date(
                        ride.createdAt
                    ).getTime();

                if (
                    Number.isFinite(parsed)
                ) {

                    createdTime =
                        parsed;
                }
            }


            if (
                createdTime >=
                latestTime
            ) {

                latestTime =
                    createdTime;

                latestDoc =
                    rideDoc;
            }

        });


        if (!latestDoc) {

            latestDoc =
                snapshot.docs[
                    snapshot.docs.length - 1
                ];
        }


        return latestDoc.id;


    } catch (error) {

        console.error(
            "Find latest ride error:",
            error
        );

        return null;
    }

}


// =====================================================
// RIDE LISTENER
// =====================================================

function listenToRide(rideId) {

    // ---------------------------------------------
    // Remove previous listener
    // ---------------------------------------------

    if (rideListener) {

        rideListener();

        rideListener = null;
    }


    const rideRef =
        doc(
            db,
            "rides",
            rideId
        );


    rideListener =
        onSnapshot(

            rideRef,

            async function (snapshot) {

                if (!snapshot.exists()) {

                    showError(
                        "Ride not found."
                    );

                    return;
                }


                currentRide =
                    snapshot.data();

                currentRide.id =
                    rideId;


                console.log(
                    "🚖 Ride update:",
                    currentRide
                );


                renderRideDetails(
                    currentRide
                );


                const status =
                    currentRide.status ||
                    "pending";


                // =================================================
                // PENDING
                // =================================================

                if (
                    status === "pending"
                ) {

                    showSearching();

                    stopDriverLocationListener();

                    startDriverSearchLoop();

                    return;
                }


                // =================================================
                // ASSIGNED
                // =================================================

                if (
                    status === "assigned"
                ) {

                    stopDriverSearchLoop();

                    showAssigned();


                    if (
                        currentRide.driverId
                    ) {

                        await loadDriver(
                            currentRide.driverId
                        );

                        startDriverLocationListener(
                            currentRide.driverId
                        );
                    }

                    return;
                }


                // =================================================
                // ACCEPTED
                // =================================================

                if (
                    status === "accepted"
                ) {

                    stopDriverSearchLoop();

                    showAccepted();


                    if (
                        currentRide.driverId
                    ) {

                        await loadDriver(
                            currentRide.driverId
                        );

                        startDriverLocationListener(
                            currentRide.driverId
                        );
                    }

                    return;
                }


                // =================================================
                // ONGOING
                // =================================================

                if (
                    status === "ongoing"
                ) {

                    stopDriverSearchLoop();

                    showOngoing();


                    if (
                        currentRide.driverId
                    ) {

                        await loadDriver(
                            currentRide.driverId
                        );

                        startDriverLocationListener(
                            currentRide.driverId
                        );
                    }

                    return;
                }


                // =================================================
                // COMPLETED
                // =================================================

                if (
                    status === "completed"
                ) {

                    stopDriverSearchLoop();

                    showCompleted();


                    if (
                        currentRide.driverId
                    ) {

                        await loadDriver(
                            currentRide.driverId
                        );

                        startDriverLocationListener(
                            currentRide.driverId
                        );
                    }

                    return;
                }


                // =================================================
                // CANCELLED
                // =================================================

                if (
                    status === "cancelled"
                ) {

                    stopDriverSearchLoop();

                    stopDriverLocationListener();

                    showCancelled();

                    return;
                }


                // =================================================
                // REJECTED
                // =================================================

                if (
                    status === "rejected"
                ) {

                    stopDriverSearchLoop();

                    stopDriverLocationListener();

                    showRejected();

                    return;
                }

            },

            function (error) {

                console.error(
                    "❌ Ride listener error:",
                    error
                );

                showError(
                    "Unable to listen to ride."
                );
            }
        );

}


// =====================================================
// RENDER RIDE DETAILS
// =====================================================

function renderRideDetails(ride) {

    if (pickupText) {

        pickupText.innerText =
            ride.pickup || "-";
    }


    if (dropText) {

        dropText.innerText =
            ride.drop || "-";
    }


    if (vehicleText) {

        vehicleText.innerText =
            ride.vehicle || "-";
    }


    if (fareText) {

        const fare =
            Number(
                ride.finalFare ??
                ride.fare
            ) || 0;

        fareText.innerText =
            "₹" + fare;
    }


    if (paymentText) {

        paymentText.innerText =
            ride.payment || "-";
    }


    if (rideStatusText) {

        rideStatusText.innerText =
            ride.status || "pending";
    }

}


// =====================================================
// DRIVER SEARCH LOOP
// =====================================================

function startDriverSearchLoop() {

    if (searchTimer) {

        return;
    }


    searchNearestDriver();


    searchTimer =
        setInterval(
            function () {

                if (
                    !currentRide ||
                    currentRide.status !==
                    "pending"
                ) {

                    stopDriverSearchLoop();

                    return;
                }


                searchNearestDriver();

            },
            5000
        );

}



// =====================================================
// STOP DRIVER SEARCH LOOP
// =====================================================

function stopDriverSearchLoop() {

    if (searchTimer) {

        clearInterval(
            searchTimer
        );

        searchTimer = null;
    }

}


// =====================================================
// SEARCH NEAREST DRIVER
// =====================================================

async function searchNearestDriver() {

    if (assigning) {

        return;
    }


    if (
        !currentRide ||
        currentRide.status !== "pending"
    ) {

        return;
    }


    assigning = true;


    try {

        // =================================================
        // PICKUP COORDINATES
        // =================================================

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

            showError(
                "Pickup location coordinates are missing."
            );

            return;
        }


        // =================================================
        // GET DRIVER USERS
        // IMPORTANT:
        // Only role query is used to avoid index problem.
        // Other conditions are checked locally.
        // =================================================

        const driversQuery = query(
    collection(db, "users"),
    where("role", "==", "driver")
);


        const driverSnapshot =
            await getDocs(
                driversQuery
            );


        let nearestDriver = null;

        let shortestDistance =
            Infinity;


        // =================================================
        // CHECK EVERY DRIVER
        // =================================================

        for (
            const driverDoc
            of driverSnapshot.docs
        ) {

            const driver =
                driverDoc.data();


            const driverId =
                driverDoc.id;


            // ---------------------------------------------
            // APPROVED DRIVER
            // ---------------------------------------------

            if (
                driver.status !==
                "approved"
            ) {

                continue;
            }


            // ---------------------------------------------
            // ONLINE DRIVER
            // ---------------------------------------------

            if (
                driver.online !== true
            ) {

                continue;
            }


            // ---------------------------------------------
            // DRIVER LOCATION
            // ---------------------------------------------

            const locationRef =
                doc(
                    db,
                    "driver_locations",
                    driverId
                );


            const locationSnapshot =
                await getDoc(
                    locationRef
                );


            if (
                !locationSnapshot.exists()
            ) {

                continue;
            }


            const location =
                locationSnapshot.data();


            const driverLat =
                Number(
                    location.latitude
                );


            const driverLng =
                Number(
                    location.longitude
                );


            if (
                !validCoordinate(
                    driverLat,
                    driverLng
                )
            ) {

                continue;
            }


            // ---------------------------------------------
            // CHECK GPS FRESHNESS
            // ---------------------------------------------

            if (
                location.updatedAt &&
                typeof location.updatedAt.toMillis ===
                "function"
            ) {

                const age =
                    Date.now() -
                    location.updatedAt.toMillis();


                // Ignore GPS older than 5 minutes
                if (
                    age >
                    5 * 60 * 1000
                ) {

                    continue;
                }
            }


            // ---------------------------------------------
            // DISTANCE
            // ---------------------------------------------

            const distance =
                calculateDistance(
                    pickupLat,
                    pickupLng,
                    driverLat,
                    driverLng
                );


            console.log(
                "🚗 Driver:",
                driver.name ||
                driver.displayName ||
                driverId,
                "| Distance:",
                distance.toFixed(2),
                "KM"
            );


            // ---------------------------------------------
            // NEAREST
            // ---------------------------------------------

            if (
                distance <
                shortestDistance
            ) {

                shortestDistance =
                    distance;


                nearestDriver = {

                    id:
                        driverId,

                    data:
                        driver,

                    latitude:
                        driverLat,

                    longitude:
                        driverLng,

                    distance:
                        distance

                };
            }

        }


        // =================================================
        // NO DRIVER
        // =================================================

        if (!nearestDriver) {

            if (statusText) {

                statusText.innerText =
                    "🔎 No online driver available. Searching again...";
            }

            return;
        }


        // =================================================
        // ASSIGN DRIVER SAFELY
        // =================================================

        const rideRef =
            doc(
                db,
                "rides",
                currentRideId
            );


        await runTransaction(
            db,
            async function (transaction) {

                const freshRide =
                    await transaction.get(
                        rideRef
                    );


                if (
                    !freshRide.exists()
                ) {

                    throw new Error(
                        "Ride does not exist."
                    );
                }


                const freshData =
                    freshRide.data();


                // Ride already changed
                if (
                    freshData.status !==
                    "pending"
                ) {

                    return;
                }


                // Driver already assigned
                if (
                    freshData.driverId
                ) {

                    return;
                }


                transaction.update(
                    rideRef,
                    {

                        driverId:
                            nearestDriver.id,

                        status:
                            "assigned",

                        assignedAt:
                            serverTimestamp(),

                        driverDistance:
                            Number(
                                nearestDriver.distance.toFixed(2)
                            ),

                        driverLatitude:
                            nearestDriver.latitude,

                        driverLongitude:
                            nearestDriver.longitude
                    }
                );

            }
        );


        console.log(
            "✅ Driver assigned:",
            nearestDriver.id
        );


    } catch (error) {

        console.error(
            "❌ Driver assignment error:",
            error
        );


        if (
            error.code ===
            "permission-denied"
        ) {

            showError(
                "Permission denied while finding driver."
            );

        } else if (
            error.code ===
            "failed-precondition"
        ) {

            console.error(
                "Firestore index may be required."
            );

        }

    } finally {

        assigning = false;
    }

}
const freshRideSnapshot =
    await getDoc(rideRef);

if (
    freshRideSnapshot.exists()
) {
    const freshRide =
        freshRideSnapshot.data();

    if (
        freshRide.status === "assigned" &&
        freshRide.driverId === nearestDriver.id
    ) {

        // Customer notification
        await createNotification(
            `${currentRideId}_customer_driver_assigned`,
            currentUser.uid,
            "Driver Assigned 🚕",
            "A driver has been assigned to your ride.",
            "driver_assigned",
            currentRideId
        );

        // Driver notification
        await createNotification(
            `${currentRideId}_driver_new_ride`,
            nearestDriver.id,
            "New Ride Assigned 🚖",
            "A new ride has been assigned to you.",
            "new_ride",
            currentRideId
        );

    }
}


// =====================================================
// LOAD DRIVER
// =====================================================

async function loadDriver(driverId) {

    if (!driverId) {

        return;
    }


    try {

        const driverRef =
            doc(
                db,
                "users",
                driverId
            );


        const snapshot =
            await getDoc(
                driverRef
            );


        if (
            !snapshot.exists()
        ) {

            console.error(
                "Driver not found:",
                driverId
            );

            return;
        }


        const driver =
            snapshot.data();


        showDriver(
            driver
        );


    } catch (error) {

        console.error(
            "Driver loading error:",
            error
        );
    }

}


// =====================================================
// SHOW DRIVER
// =====================================================

function showDriver(driver) {

    if (driverCard) {

        driverCard.style.display =
            "block";
    }


    hideError();


    const name =
        driver.name ||
        driver.displayName ||
        "Driver";


    const rating =
        driver.rating ??
        "New";


    const vehicle =
        driver.vehicle ||
        currentRide?.vehicle ||
        "Auto";


    const vehicleNumber =
        driver.vehicleNumber ||
        driver.carNumber ||
        "Vehicle number unavailable";


    driverPhone =
        driver.phone ||
        driver.mobile ||
        "";
async function createNotification(
    notificationId,
    userId,
    title,
    message,
    type,
    rideId
) {
    if (!userId || !notificationId) {
        return;
    }

    try {
        await setDoc(
            doc(
                db,
                "notifications",
                notificationId
            ),
            {
                userId: userId,
                title: title,
                message: message,
                type: type,
                rideId: rideId || "",
                read: false,
                createdAt: serverTimestamp()
            },
            {
                merge: true
            }
        );

        console.log(
            "🔔 Notification created:",
            notificationId
        );

    } catch (error) {

        console.error(
            "❌ Notification error:",
            error
        );
    }
}

    const photo =
        driver.photoURL ||
        driver.photo ||
        "https://randomuser.me/api/portraits/men/45.jpg";


    if (driverName) {

        driverName.innerText =
            name;
    }


    if (driverRating) {

        driverRating.innerText =
            rating;
    }


    if (driverVehicle) {

        driverVehicle.innerText =
            vehicle;
    }


    if (driverVehicleNumber) {

        driverVehicleNumber.innerText =
            vehicleNumber;
    }


    if (driverPhoto) {

        driverPhoto.src =
            photo;


        driverPhoto.onerror =
            function () {

                this.src =
                    "https://randomuser.me/api/portraits/men/45.jpg";
            };
    }


    // =================================================
    // CALL / CHAT
    // =================================================

    if (driverPhone) {

        if (callButton) {

            callButton.style.display =
                "inline-block";
        }


        if (chatButton) {

            chatButton.style.display =
                "inline-block";
        }

    } else {

        if (callButton) {

            callButton.style.display =
                "none";
        }


        if (chatButton) {

            chatButton.style.display =
                "none";
        }
    }


    updateDriverStatusText();

}


// =====================================================
// DRIVER STATUS TEXT
// =====================================================

function updateDriverStatusText() {

    if (
        !currentRide ||
        !driverRideStatus
    ) {

        return;
    }


    driverRideStatus.innerText =
        getRideStatus(
            currentRide.status
        );

}


// =====================================================
// GET RIDE STATUS
// =====================================================

function getRideStatus(status) {

    switch (status) {

        case "assigned":

            return "⏳ Waiting for driver";


        case "accepted":

            return "✅ Driver accepted";


        case "ongoing":

            return "🚗 Ride in progress";


        case "completed":

            return "🏁 Ride completed";


        case "cancelled":

            return "❌ Ride cancelled";


        case "rejected":

            return "❌ Driver rejected";


        default:

            return "🔎 Finding driver";
    }

}


// =====================================================
// SEARCHING UI
// =====================================================

function showSearching() {

    if (loader) {

        loader.style.display =
            "block";
    }


    if (statusText) {

        statusText.innerText =
            "🔎 Finding the nearest available driver...";
    }


    if (driverCard) {

        driverCard.style.display =
            "none";
    }


    if (cancelButton) {

        cancelButton.style.display =
            "inline-block";

        cancelButton.disabled =
            false;
    }


    if (completedBox) {

        completedBox.style.display =
            "none";
    }

}


// =====================================================
// ASSIGNED UI
// =====================================================

function showAssigned() {

    if (loader) {

        loader.style.display =
            "none";
    }


    if (statusText) {

        statusText.innerText =
            "👨‍✈️ Driver assigned. Waiting for acceptance...";
    }


    if (driverCard) {

        driverCard.style.display =
            "block";
    }


    if (cancelButton) {

        cancelButton.style.display =
            "inline-block";
    }


    updateDriverStatusText();

}


// =====================================================
// ACCEPTED UI
// =====================================================

function showAccepted() {

    if (loader) {

        loader.style.display =
            "none";
    }


    if (statusText) {

        statusText.innerText =
            "✅ Driver accepted your ride.";
    }


    if (driverCard) {

        driverCard.style.display =
            "block";
    }


    if (cancelButton) {

        cancelButton.style.display =
            "inline-block";
    }


    updateDriverStatusText();

}


// =====================================================
// ONGOING UI
// =====================================================

function showOngoing() {

    if (loader) {

        loader.style.display =
            "none";
    }


    if (statusText) {

        statusText.innerText =
            "🚗 Your ride is in progress.";
    }


    if (driverCard) {

        driverCard.style.display =
            "block";
    }


    if (cancelButton) {

        cancelButton.style.display =
            "none";
    }


    updateDriverStatusText();

}


// =====================================================
// COMPLETED UI
// =====================================================

function showCompleted() {

    if (loader) {

        loader.style.display =
            "none";
    }


    if (statusText) {

        statusText.innerText =
            "🏁 Ride completed successfully.";
    }


    if (driverCard) {

        driverCard.style.display =
            "block";
    }


    if (completedBox) {

        completedBox.style.display =
            "block";
    }


    if (cancelButton) {

        cancelButton.style.display =
            "none";
    }


    updateDriverStatusText();

}


// =====================================================
// CANCELLED UI
// =====================================================

function showCancelled() {

    if (loader) {

        loader.style.display =
            "none";
    }


    if (statusText) {

        statusText.innerText =
            "❌ This ride has been cancelled.";
    }


    if (driverCard) {

        driverCard.style.display =
            "none";
    }


    if (cancelButton) {

        cancelButton.style.display =
            "none";
    }


    if (completedBox) {

        completedBox.style.display =
            "none";
    }

}


// =====================================================
// REJECTED UI
// =====================================================

function showRejected() {

    if (loader) {

        loader.style.display =
            "none";
    }


    if (statusText) {

        statusText.innerText =
            "❌ Driver rejected the ride.";
    }


    if (driverCard) {

        driverCard.style.display =
            "none";
    }


    if (cancelButton) {

        cancelButton.style.display =
            "none";
    }

}


// =====================================================
// ERROR
// =====================================================

function showError(message) {

    if (loader) {

        loader.style.display =
            "none";
    }


    if (errorBox) {

        errorBox.innerText =
            message;

        errorBox.style.display =
            "block";
    }


    if (statusText) {

        statusText.innerText =
            "❌ " + message;
    }

}


// =====================================================
// HIDE ERROR
// =====================================================

function hideError() {

    if (errorBox) {

        errorBox.style.display =
            "none";
    }

}


// =====================================================
// DRIVER LOCATION LISTENER
// =====================================================

function startDriverLocationListener(driverId) {

    if (!driverId) {

        return;
    }


    // Remove old listener
    if (driverLocationListener) {

        driverLocationListener();

        driverLocationListener =
            null;
    }


    const locationRef =
        doc(
            db,
            "driver_locations",
            driverId
        );


    driverLocationListener =
        onSnapshot(

            locationRef,

            function (snapshot) {

                if (
                    !snapshot.exists()
                ) {

                    console.log(
                        "📍 Waiting for driver GPS..."
                    );

                    return;
                }


                const location =
                    snapshot.data();


                const latitude =
                    Number(
                        location.latitude
                    );


                const longitude =
                    Number(
                        location.longitude
                    );


                if (
                    !validCoordinate(
                        latitude,
                        longitude
                    )
                ) {

                    return;
                }


                console.log(
                    "📍 LIVE DRIVER:",
                    latitude,
                    longitude
                );


                lastDriverPosition = {

                    latitude:
                        latitude,

                    longitude:
                        longitude
                };


                updateDriverMarker(
                    latitude,
                    longitude
                );


                updateDriverDistance(
                    latitude,
                    longitude
                );

            },

            function (error) {

                console.error(
                    "❌ Driver GPS listener error:",
                    error
                );
            }
        );

}


// =====================================================
// STOP DRIVER LOCATION LISTENER
// =====================================================

function stopDriverLocationListener() {

    if (driverLocationListener) {

        driverLocationListener();

        driverLocationListener =
            null;
    }

}


// =====================================================
// UPDATE DRIVER MARKER
// =====================================================

function updateDriverMarker(
    latitude,
    longitude
) {

    initializeMap();


    if (!map) {

        return;
    }


    const position = [
        latitude,
        longitude
    ];


    if (!driverMarker) {

        const driverIcon =
            L.divIcon({

                className:
                    "custom-driver-icon",

                html:
                    "🚕",

                iconSize:
                    [
                        38,
                        38
                    ],

                iconAnchor:
                    [
                        19,
                        19
                    ]
            });


        driverMarker =
            L.marker(
                position,
                {
                    icon:
                        driverIcon
                }
            )
            .addTo(
                map
            )
            .bindPopup(
                "🚕 Driver"
            );

    } else {

        driverMarker.setLatLng(
            position
        );
    }


    fitMap();

}


// =====================================================
// UPDATE DRIVER DISTANCE + ETA
// =====================================================

function updateDriverDistance(
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

        return;
    }


    const distance =
        calculateDistance(
            driverLat,
            driverLng,
            pickupLat,
            pickupLng
        );


    // =================================================
    // DISTANCE
    // =================================================

    if (distanceElement) {

        distanceElement.innerText =
            distance.toFixed(2) +
            " km";
    }


    if (driverAwayText) {

        driverAwayText.innerText =
            "📍 Driver is " +
            distance.toFixed(2) +
            " KM away";
    }


    // =================================================
    // ETA
    // =================================================

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


    if (etaElement) {

        if (distance < 0.15) {

            etaElement.innerText =
                "Arriving";

        } else {

            etaElement.innerText =
                eta + " min";
        }
    }


    currentRide.driverDistance =
        Number(
            distance.toFixed(2)
        );

}


// =====================================================
// INITIALIZE MAP
// =====================================================

function initializeMap() {

    if (map) {

        return;
    }


    if (
        typeof L ===
        "undefined"
    ) {

        console.error(
            "❌ Leaflet JS is not loaded."
        );

        return;
    }


    const mapElement =
        document.getElementById(
            "liveMap"
        );


    if (!mapElement) {

        console.warn(
            "⚠️ #liveMap element not found."
        );

        return;
    }


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

        console.warn(
            "⚠️ Pickup coordinates unavailable."
        );

        return;
    }


    map =
        L.map(
            "liveMap"
        ).setView(
            [
                pickupLat,
                pickupLng
            ],
            13
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {

            maxZoom:
                19,

            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(
        map
    );


    addPickupMarker();

    addDropMarker();

    drawRideLine();


    setTimeout(
        function () {

            if (map) {

                map.invalidateSize();
            }

        },
        300
    );

}


// =====================================================
// PICKUP MARKER
// =====================================================

function addPickupMarker() {

    if (
        !map ||
        !currentRide
    ) {

        return;
    }


    const lat =
        Number(
            currentRide.pickupLatitude
        );


    const lng =
        Number(
            currentRide.pickupLongitude
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

        return;
    }


    pickupMarker =
        L.marker(
            [
                lat,
                lng
            ]
        )
        .addTo(
            map
        )
        .bindPopup(
            "📍 Pickup"
        );

}


// =====================================================
// DROP MARKER
// =====================================================

function addDropMarker() {

    if (
        !map ||
        !currentRide
    ) {

        return;
    }


    const lat =
        Number(
            currentRide.dropLatitude
        );


    const lng =
        Number(
            currentRide.dropLongitude
        );


    if (
        !validCoordinate(
            lat,
            lng
        )
    ) {

        return;
    }


    if (dropMarker) {

        return;
    }


    dropMarker =
        L.marker(
            [
                lat,
                lng
            ]
        )
        .addTo(
            map
        )
        .bindPopup(
            "🏁 Destination"
        );

}


// =====================================================
// DRAW RIDE LINE
// =====================================================

function drawRideLine() {

    if (
        !map ||
        !currentRide
    ) {

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


    const dropLat =
        Number(
            currentRide.dropLatitude
        );


    const dropLng =
        Number(
            currentRide.dropLongitude
        );


    if (
        !validCoordinate(
            pickupLat,
            pickupLng
        ) ||
        !validCoordinate(
            dropLat,
            dropLng
        )
    ) {

        return;
    }


    if (rideLine) {

        map.removeLayer(
            rideLine
        );
    }


    rideLine =
        L.polyline(
            [
                [
                    pickupLat,
                    pickupLng
                ],
                [
                    dropLat,
                    dropLng
                ]
            ],
            {

                weight:
                    5,

                opacity:
                    0.7
            }
        )
        .addTo(
            map
        );

}


// =====================================================
// FIT MAP
// =====================================================

function fitMap() {

    if (!map) {

        return;
    }


    const points = [];


    if (pickupMarker) {

        points.push(
            pickupMarker.getLatLng()
        );
    }


    if (dropMarker) {

        points.push(
            dropMarker.getLatLng()
        );
    }


    if (driverMarker) {

        points.push(
            driverMarker.getLatLng()
        );
    }


    if (points.length === 0) {

        return;
    }


    if (points.length === 1) {

        map.setView(
            points[0],
            14
        );

        return;
    }


    map.fitBounds(
        L.latLngBounds(
            points
        ),
        {

            padding:
                [
                    40,
                    40
                ]
        }
    );

}


// =====================================================
// CALL DRIVER
// =====================================================

if (callButton) {

    callButton.addEventListener(
        "click",
        function () {

            if (!driverPhone) {

                alert(
                    "Driver phone number unavailable."
                );

                return;
            }


            window.location.href =
                "tel:" +
                driverPhone;
        }
    );
}


// =====================================================
// CHAT DRIVER - WHATSAPP
// =====================================================

if (chatButton) {

    chatButton.addEventListener(
        "click",
        function () {

            if (!driverPhone) {

                alert(
                    "Driver phone number unavailable."
                );

                return;
            }


            let whatsappNumber =
                driverPhone.replace(
                    /\D/g,
                    ""
                );


            if (
                whatsappNumber.length ===
                10
            ) {

                whatsappNumber =
                    "91" +
                    whatsappNumber;
            }


            if (
                whatsappNumber.length <
                10
            ) {

                alert(
                    "Invalid driver phone number."
                );

                return;
            }


            window.open(
                "https://wa.me/" +
                whatsappNumber,
                "_blank"
            );

        }
    );
}


// =====================================================
// CANCEL RIDE
// =====================================================

if (cancelButton) {

    cancelButton.addEventListener(
        "click",
        async function () {

            if (!currentRideId) {

                return;
            }


            if (!currentRide) {

                return;
            }


            if (
                currentRide.status ===
                "completed" ||
                currentRide.status ===
                "cancelled"
            ) {

                return;
            }


            // -----------------------------------------
            // CONFIRM
            // -----------------------------------------

            const confirmed =
                confirm(
                    "Are you sure you want to cancel this ride?"
                );


            if (!confirmed) {

                return;
            }


            try {

                cancelButton.disabled =
                    true;


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
                            "customer"
                    }
                );


                console.log(
                    "✅ Ride cancelled."
                );


            } catch (error) {

                console.error(
                    "❌ Cancel error:",
                    error
                );


                alert(
                    "Unable to cancel ride.\n\n" +
                    error.message
                );


                cancelButton.disabled =
                    false;
            }

        }
    );
}


// =====================================================
// HAVERSINE DISTANCE
// =====================================================

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
        ) *
        Math.sin(
            dLat / 2
        ) +

        Math.cos(
            toRadians(
                lat1
            )
        ) *

        Math.cos(
            toRadians(
                lat2
            )
        ) *

        Math.sin(
            dLon / 2
        ) *
        Math.sin(
            dLon / 2
        );


    const safeA =
        Math.min(
            1,
            Math.max(
                0,
                a
            )
        );


    const c =
        2 *
        Math.atan2(
            Math.sqrt(
                safeA
            ),
            Math.sqrt(
                1 - safeA
            )
        );


    return R * c;

}


// =====================================================
// RADIANS
// =====================================================

function toRadians(
    degrees
) {

    return (
        Number(degrees) *
        Math.PI /
        180
    );

}


// =====================================================
// VALIDATE COORDINATES
// =====================================================

function validCoordinate(
    latitude,
    longitude
) {

    const lat =
        Number(
            latitude
        );


    const lng =
        Number(
            longitude
        );


    return (

        Number.isFinite(lat) &&

        Number.isFinite(lng) &&

        lat >= -90 &&

        lat <= 90 &&

        lng >= -180 &&

        lng <= 180
    );

}


// =====================================================
// CLEANUP
// =====================================================

window.addEventListener(
    "beforeunload",
    function () {

        stopDriverSearchLoop();

        stopDriverLocationListener();


        if (rideListener) {

            rideListener();

            rideListener =
                null;
        }

    }
);


// =====================================================
// PAGE LOAD - MAP SIZE FIX
// =====================================================

window.addEventListener(
    "load",
    function () {

        setTimeout(
            function () {

                if (map) {

                    map.invalidateSize();
                }

            },
            500
        );

    }
);


// =====================================================
// DEBUG
// =====================================================

console.log(
    "🚖 SitamarhiCab search-driver.js loaded successfully."
);