// ==========================================================
// SITAMARHI CAB - DRIVER DASHBOARD
// COMPLETE DRIVER + RIDE MANAGEMENT + LIVE GPS
// ==========================================================

import { auth, db } from "./firebase.js";

import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    setDoc,
    addDoc,
    onSnapshot,
    serverTimestamp,
    deleteField,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================================
// GLOBAL VARIABLES
// ==========================================================

let currentDriver = null;

let gpsWatchId = null;

let ridesListener = null;

let driverInitialized = false;

let gpsPermissionDenied = false;
// ==========================================================
// NOTIFICATION HELPER
// ==========================================================

async function createNotification(
    notificationId,
    userId,
    title,
    message,
    type,
    rideId
) {
    if (!notificationId || !userId) {
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
            "🔔 Notification sent:",
            notificationId
        );

    } catch (error) {
        console.error(
            "❌ Notification error:",
            error
        );
    }
}

// ==========================================================
// DOM ELEMENTS
// ==========================================================

const onlineSwitch =
    document.getElementById("onlineSwitch");

const rideList =
    document.getElementById("rideList");

const logoutBtn =
    document.getElementById("driverLogout");

const earningsCard =
    document.getElementById("todayEarnings");

const tripsCard =
    document.getElementById("todayTrips");


// ==========================================================
// AUTH CHECK
// ==========================================================

auth.onAuthStateChanged(async (user) => {

    if (!user) {

        stopGPS();

        window.location.href =
            "login.html";

        return;
    }


    currentDriver = user;


    console.log(
        "👨‍✈️ Driver logged in:",
        user.uid
    );


    if (driverInitialized) {
        return;
    }


    driverInitialized = true;


    try {

        await verifyDriverAccount();

        await loadDriverOnlineStatus();

        startLiveTracking();

        loadDriverRides();

        updateDriverStats();

    } catch (error) {

        console.error(
            "Driver initialization error:",
            error
        );

    }

});


// ==========================================================
// VERIFY DRIVER ACCOUNT
// ==========================================================

async function verifyDriverAccount() {

    if (!currentDriver) {
        return;
    }


    try {

        const driverRef =
            doc(
                db,
                "users",
                currentDriver.uid
            );


        const snapshot =
            await getDoc(
                driverRef
            );


        if (!snapshot.exists()) {

            console.warn(
                "Driver profile not found."
            );

            return;
        }


        const driver =
            snapshot.data();


        console.log(
            "Driver profile:",
            driver
        );


        if (
            driver.role &&
            driver.role !== "driver"
        ) {

            alert(
                "This account is not registered as a driver."
            );

            await auth.signOut();

            window.location.href =
                "login.html";

            return;
        }


        if (
            driver.status &&
            driver.status !== "approved"
        ) {

            if (onlineSwitch) {

                onlineSwitch.checked =
                    false;

                onlineSwitch.disabled =
                    true;

            }


            alert(
                "Your driver account is not approved yet."
            );

        }

    } catch (error) {

        console.error(
            "Driver verification error:",
            error
        );

    }

}


// ==========================================================
// LOAD ONLINE STATUS
// ==========================================================

async function loadDriverOnlineStatus() {

    if (
        !currentDriver ||
        !onlineSwitch
    ) {
        return;
    }


    try {

        const driverRef =
            doc(
                db,
                "users",
                currentDriver.uid
            );


        const snapshot =
            await getDoc(
                driverRef
            );


        if (!snapshot.exists()) {
            return;
        }


        const driver =
            snapshot.data();


        onlineSwitch.checked =
            driver.online === true;

    } catch (error) {

        console.error(
            "Online status load error:",
            error
        );

    }

}


// ==========================================================
// ONLINE / OFFLINE SWITCH
// ==========================================================

if (onlineSwitch) {

    onlineSwitch.addEventListener(
        "change",
        async function () {

            if (!currentDriver) {

                onlineSwitch.checked =
                    false;

                return;
            }


            const goingOnline =
                onlineSwitch.checked;


            try {

                // ==========================================
                // ONLINE
                // ==========================================

                if (goingOnline) {

                    const driverRef =
                        doc(
                            db,
                            "users",
                            currentDriver.uid
                        );


                    const driverSnapshot =
                        await getDoc(
                            driverRef
                        );


                    if (
                        driverSnapshot.exists()
                    ) {

                        const driver =
                            driverSnapshot.data();


                        if (
                            driver.status &&
                            driver.status !==
                            "approved"
                        ) {

                            onlineSwitch.checked =
                                false;


                            alert(
                                "❌ Your driver account is not approved."
                            );


                            return;

                        }

                    }


                    await setDoc(
                        driverRef,
                        {

                            online:
                                true,

                            updatedAt:
                                serverTimestamp()

                        },
                        {
                            merge:
                                true
                        }
                    );


                    startLiveTracking();


                    alert(
                        "🟢 Driver is Online"
                    );

                }


                // ==========================================
                // OFFLINE
                // ==========================================

                else {

                    await setDoc(
                        doc(
                            db,
                            "users",
                            currentDriver.uid
                        ),
                        {

                            online:
                                false,

                            updatedAt:
                                serverTimestamp()

                        },
                        {
                            merge:
                                true
                        }
                    );


                    alert(
                        "🔴 Driver is Offline"
                    );

                }

            } catch (error) {

                console.error(
                    "Online status error:",
                    error
                );


                onlineSwitch.checked =
                    !goingOnline;


                alert(
                    "Unable to update online status.\n\n" +
                    error.message
                );

            }

        }
    );

}


// ==========================================================
// LOAD DRIVER RIDES
// ==========================================================

function loadDriverRides() {

    if (!rideList) {

        console.warn(
            "rideList element not found."
        );

        return;
    }


    if (ridesListener) {

        ridesListener();

        ridesListener =
            null;

    }


    const ridesQuery =
        query(
            collection(
                db,
                "rides"
            ),
            where(
                "driverId",
                "==",
                currentDriver.uid
            )
        );


    ridesListener =
        onSnapshot(

            ridesQuery,

            function (snapshot) {

                rideList.innerHTML =
                    "";


                if (snapshot.empty) {

                    rideList.innerHTML =
                        "<p>No assigned rides.</p>";

                    return;
                }


                let visibleRides =
                    0;


                snapshot.forEach(
                    function (rideDoc) {

                        const ride =
                            rideDoc.data();


                        const rideId =
                            rideDoc.id;


                        // ==================================
                        // ASSIGNED
                        // ==================================

                        if (
                            ride.status ===
                            "assigned"
                        ) {

                            visibleRides++;


                            rideList.innerHTML +=
                                createAssignedRideCard(
                                    ride,
                                    rideId
                                );

                        }


                        // ==================================
                        // ACCEPTED
                        // ==================================

                        else if (
                            ride.status ===
                            "accepted"
                        ) {

                            visibleRides++;


                            rideList.innerHTML +=
                                createAcceptedRideCard(
                                    ride,
                                    rideId
                                );

                        }


                        // ==================================
                        // ONGOING
                        // ==================================

                        else if (
                            ride.status ===
                            "ongoing"
                        ) {

                            visibleRides++;


                            rideList.innerHTML +=
                                createOngoingRideCard(
                                    ride,
                                    rideId
                                );

                        }


                        // ==================================
                        // COMPLETED
                        // ==================================

                        else if (
                            ride.status ===
                            "completed"
                        ) {

                            visibleRides++;


                            rideList.innerHTML +=
                                createCompletedRideCard(
                                    ride,
                                    rideId
                                );

                        }


                        // ==================================
                        // CANCELLED
                        // ==================================

                        else if (
                            ride.status ===
                            "cancelled"
                        ) {

                            visibleRides++;


                            rideList.innerHTML +=
                                createCancelledRideCard(
                                    ride,
                                    rideId
                                );

                        }

                    }
                );


                if (
                    visibleRides ===
                    0
                ) {

                    rideList.innerHTML =
                        "<p>No active rides.</p>";

                }

            },

            function (error) {

                console.error(
                    "Ride listener error:",
                    error
                );


                rideList.innerHTML =
                    "<p>Unable to load rides.</p>";

            }

        );

}


// ==========================================================
// ASSIGNED RIDE CARD
// ==========================================================

function createAssignedRideCard(
    ride,
    rideId
) {

    return `

        <div class="ride-card">

            <h3>
                🚖 New Assigned Ride
            </h3>

            <p>
                <b>Pickup:</b>
                ${escapeHTML(ride.pickup || "-")}
            </p>

            <p>
                <b>Drop:</b>
                ${escapeHTML(ride.drop || "-")}
            </p>

            <p>
                <b>Phone:</b>
                ${escapeHTML(ride.phone || "-")}
            </p>

            <p>
                <b>Vehicle:</b>
                ${escapeHTML(ride.vehicle || "-")}
            </p>

            <p>
                <b>Fare:</b>
                ₹${Number(ride.fare) || 0}
            </p>

            <p>
                <b>Payment:</b>
                ${escapeHTML(ride.payment || "-")}
            </p>

            <p>
                <b>Status:</b>
                ⏳ Assigned
            </p>

            <button
                class="accept-btn"
                onclick="acceptRide('${rideId}')"
            >
                ✅ Accept Ride
            </button>

        </div>

    `;

}


// ==========================================================
// ACCEPTED RIDE CARD
// ==========================================================

function createAcceptedRideCard(
    ride,
    rideId
) {

    return `

        <div class="ride-card">

            <h3>
                ✅ Ride Accepted
            </h3>

            <p>
                <b>Pickup:</b>
                ${escapeHTML(ride.pickup || "-")}
            </p>

            <p>
                <b>Drop:</b>
                ${escapeHTML(ride.drop || "-")}
            </p>

            <p>
                <b>Phone:</b>
                ${escapeHTML(ride.phone || "-")}
            </p>

            <p>
                <b>Vehicle:</b>
                ${escapeHTML(ride.vehicle || "-")}
            </p>

            <p>
                <b>Fare:</b>
                ₹${Number(ride.fare) || 0}
            </p>

            <p>
                <b>Payment:</b>
                ${escapeHTML(ride.payment || "-")}
            </p>

            <p>
                <b>Status:</b>
                ✅ Accepted
            </p>

            <button
                class="accept-btn"
                onclick="startRide('${rideId}')"
            >
                🚗 Start Ride
            </button>

        </div>

    `;

}


// ==========================================================
// ONGOING RIDE CARD
// ==========================================================

function createOngoingRideCard(
    ride,
    rideId
) {

    return `

        <div class="ride-card">

            <h3>
                🚗 Ride In Progress
            </h3>

            <p>
                <b>Pickup:</b>
                ${escapeHTML(ride.pickup || "-")}
            </p>

            <p>
                <b>Drop:</b>
                ${escapeHTML(ride.drop || "-")}
            </p>

            <p>
                <b>Phone:</b>
                ${escapeHTML(ride.phone || "-")}
            </p>

            <p>
                <b>Fare:</b>
                ₹${Number(ride.fare) || 0}
            </p>

            <p>
                <b>Payment:</b>
                ${escapeHTML(ride.payment || "-")}
            </p>

            <p>
                <b>Status:</b>
                🚗 Ongoing
            </p>

            <button
                class="complete-btn"
                onclick="completeRide('${rideId}')"
            >
                🏁 Complete Ride
            </button>

        </div>

    `;

}


// ==========================================================
// COMPLETED RIDE CARD
// ==========================================================

function createCompletedRideCard(
    ride,
    rideId
) {

    const finalFare =
        Number(
            ride.finalFare
        ) ||
        Number(
            ride.fare
        ) ||
        0;


    return `

        <div class="ride-card completed">

            <h3>
                ✅ Completed Ride
            </h3>

            <p>
                <b>Pickup:</b>
                ${escapeHTML(ride.pickup || "-")}
            </p>

            <p>
                <b>Drop:</b>
                ${escapeHTML(ride.drop || "-")}
            </p>

            <p>
                <b>Fare:</b>
                ₹${finalFare}
            </p>

            <p>
                <b>Payment:</b>
                ${escapeHTML(ride.payment || "-")}
            </p>

            <p>
                <b>Payment Status:</b>
                ${escapeHTML(
                    ride.paymentStatus || "pending"
                )}
            </p>

            <p>
                <b>Status:</b>
                🏁 Completed
            </p>

        </div>

    `;

}


// ==========================================================
// CANCELLED RIDE CARD
// ==========================================================

function createCancelledRideCard(
    ride,
    rideId
) {

    return `

        <div class="ride-card">

            <h3>
                ❌ Cancelled Ride
            </h3>

            <p>
                <b>Pickup:</b>
                ${escapeHTML(ride.pickup || "-")}
            </p>

            <p>
                <b>Drop:</b>
                ${escapeHTML(ride.drop || "-")}
            </p>

            <p>
                <b>Fare:</b>
                ₹${Number(ride.fare) || 0}
            </p>

            <p>
                <b>Status:</b>
                ❌ Cancelled
            </p>

        </div>

    `;

}


// ==========================================================
// ACCEPT RIDE
// ==========================================================

window.acceptRide =
    async function (rideId) {

        if (!currentDriver) {

            alert(
                "Driver is not logged in."
            );

            return;
        }


        try {

            const rideRef =
                doc(
                    db,
                    "rides",
                    rideId
                );


            await runTransaction(
                db,
                async function(transaction) {

                    const rideSnapshot =
                        await transaction.get(
                            rideRef
                        );


                    if (
                        !rideSnapshot.exists()
                    ) {

                        throw new Error(
                            "Ride not found."
                        );

                    }


                    const ride =
                        rideSnapshot.data();


                    if (
                        ride.driverId !==
                        currentDriver.uid
                    ) {

                        throw new Error(
                            "This ride is not assigned to you."
                        );

                    }


                    if (
                        ride.status !==
                        "assigned"
                    ) {

                        throw new Error(
                            "Ride is no longer available."
                        );

                    }


                    transaction.update(
                        rideRef,
                        {

                            status:
                                "accepted",

                            acceptedAt:
                                serverTimestamp(),

                            acceptedBy:
                                currentDriver.uid

                        }
                    );

                }
            );
            // ==========================================================
// CUSTOMER NOTIFICATION - DRIVER ACCEPTED
// ==========================================================

const acceptedRideSnapshot =
    await getDoc(rideRef);

if (acceptedRideSnapshot.exists()) {

    const acceptedRide =
        acceptedRideSnapshot.data();

    if (acceptedRide.userId) {

        await createNotification(
            `${rideId}_customer_driver_accepted`,
            acceptedRide.userId,
            "Driver Accepted ✅",
            "Your driver has accepted the ride.",
            "driver_accepted",
            rideId
        );

    }
}


            alert(
                "✅ Ride Accepted!"
            );


            updateDriverStats();


        } catch (error) {

            console.error(
                "Accept ride error:",
                error
            );


            alert(
                "Unable to accept ride.\n\n" +
                error.message
            );

        }

    };


// ==========================================================
// START RIDE
// ==========================================================

window.startRide =
    async function (rideId) {

        if (!currentDriver) {

            alert(
                "Driver is not logged in."
            );

            return;
        }


        try {

            const rideRef =
                doc(
                    db,
                    "rides",
                    rideId
                );


            const rideSnapshot =
                await getDoc(
                    rideRef
                );


            if (
                !rideSnapshot.exists()
            ) {

                alert(
                    "❌ Ride not found."
                );

                return;
            }


            const ride =
                rideSnapshot.data();


            if (
                ride.driverId !==
                currentDriver.uid
            ) {

                alert(
                    "❌ This ride is not assigned to you."
                );

                return;
            }


            if (
                ride.status !==
                "accepted"
            ) {

                alert(
                    "❌ Ride must be accepted first."
                );

                return;
            }


            await updateDoc(
                rideRef,
                {

                    status:
                        "ongoing",

                    startedAt:
                        serverTimestamp(),

                    startedBy:
                        currentDriver.uid

                }
            );
            // ==========================================================
// CUSTOMER NOTIFICATION - RIDE STARTED
// ==========================================================

await createNotification(
    `${rideId}_customer_ride_started`,
    ride.userId,
    "Ride Started 🚗",
    "Your ride has started. Your driver is on the way.",
    "ride_started",
    rideId
);


            // Make sure driver stays online
            await setDoc(
                doc(
                    db,
                    "users",
                    currentDriver.uid
                ),
                {

                    online:
                        true,

                    updatedAt:
                        serverTimestamp()

                },
                {
                    merge:
                        true
                }
            );

            // Bind location sharing to this assigned ride. Firestore rules use
            // this field to expose live location only to this ride's customer.
            await setDoc(
                doc(
                    db,
                    "driver_locations",
                    currentDriver.uid
                ),
                {
                    driverId: currentDriver.uid,
                    activeRideId: rideId,
                    updatedAt: serverTimestamp()
                },
                {
                    merge: true
                }
            );


            startLiveTracking();


            alert(
                "🚗 Ride Started!"
            );


        } catch (error) {

            console.error(
                "Start ride error:",
                error
            );


            alert(
                "Unable to start ride.\n\n" +
                error.message
            );

        }

    };


// ==========================================================
// COMPLETE RIDE
// ==========================================================

window.completeRide =
    async function (rideId) {

        if (!currentDriver) {

            alert(
                "❌ Driver is not logged in."
            );

            return;
        }


        const confirmed =
            confirm(
                "🏁 Complete this ride?"
            );


        if (!confirmed) {
            return;
        }


        try {

            const rideRef =
                doc(
                    db,
                    "rides",
                    rideId
                );


            const rideSnapshot =
                await getDoc(
                    rideRef
                );


            if (
                !rideSnapshot.exists()
            ) {

                alert(
                    "❌ Ride not found."
                );

                return;
            }


            const ride =
                rideSnapshot.data();


            if (
                ride.driverId !==
                currentDriver.uid
            ) {

                alert(
                    "❌ This ride is not assigned to you."
                );

                return;
            }


            if (
                ride.status !==
                "ongoing"
            ) {

                alert(
                    "❌ Ride cannot be completed.\n\nCurrent status: " +
                    ride.status
                );

                return;
            }


            const amount =
                Number(
                    ride.fare
                ) || 0;


            const paymentMethod =
                ride.payment ||
                "Cash";


            await updateDoc(
                rideRef,
                {

                    status:
                        "completed",

                    finalFare:
                        amount,

                    payment:
                        paymentMethod,

                    paymentStatus:
                        ride.paymentStatus ||
                        "pending",

                    completedAt:
                        serverTimestamp(),

                    completedBy:
                        currentDriver.uid

                }
            );
            // ==========================================================
// CUSTOMER NOTIFICATION - RIDE COMPLETED
// ==========================================================

await createNotification(
    `${rideId}_customer_ride_completed`,
    ride.userId,
    "Ride Completed 🏁",
    "Your ride has been completed successfully.",
    "ride_completed",
    rideId
);

            // The customer must no longer be able to subscribe to location
            // after the ride has ended.
            await setDoc(
                doc(
                    db,
                    "driver_locations",
                    currentDriver.uid
                ),
                {
                    activeRideId: deleteField(),
                    updatedAt: serverTimestamp()
                },
                {
                    merge: true
                }
            );


            // ==========================================
            // SAVE EARNING
            // ==========================================

            try {

                await addDoc(
                    collection(
                        db,
                        "earnings"
                    ),
                    {

                        driverId:
                            currentDriver.uid,

                        rideId:
                            rideId,

                        amount:
                            amount,

                        paymentMethod:
                            paymentMethod,

                        createdAt:
                            serverTimestamp()

                    }
                );

            } catch (earningError) {

                console.warn(
                    "⚠️ Earnings record error:",
                    earningError
                );

            }


            // ==========================================
            // STOP GPS
            // ==========================================

            stopGPS();


            // ==========================================
            // DRIVER OFFLINE
            // ==========================================

            await setDoc(
                doc(
                    db,
                    "users",
                    currentDriver.uid
                ),
                {

                    online:
                        false,

                    updatedAt:
                        serverTimestamp()

                },
                {
                    merge:
                        true
                }
            );


            if (onlineSwitch) {

                onlineSwitch.checked =
                    false;

            }


            alert(
                "🎉 Ride Completed Successfully!"
            );


            updateDriverStats();


        } catch (error) {

            console.error(
                "Complete ride error:",
                error
            );


            alert(
                "Unable to complete ride.\n\n" +
                error.message
            );

        }

    };


// ==========================================================
// DRIVER STATS
// ==========================================================

async function updateDriverStats() {

    if (!currentDriver) {
        return;
    }


    try {

        const ridesQuery =
            query(
                collection(
                    db,
                    "rides"
                ),
                where(
                    "driverId",
                    "==",
                    currentDriver.uid
                ),
                where(
                    "status",
                    "==",
                    "completed"
                )
            );


        const snapshot =
            await getDocs(
                ridesQuery
            );


        let trips =
            0;


        let earnings =
            0;


        snapshot.forEach(
            function (rideDoc) {

                const ride =
                    rideDoc.data();


                trips++;


                earnings +=
                    Number(
                        ride.finalFare
                    ) ||
                    Number(
                        ride.fare
                    ) ||
                    0;

            }
        );


        if (earningsCard) {

            earningsCard.innerText =
                "₹" +
                earnings;

        }


        if (tripsCard) {

            tripsCard.innerText =
                trips;

        }


    } catch (error) {

        console.error(
            "Stats error:",
            error
        );

    }

}


// ==========================================================
// LIVE GPS TRACKING
// ==========================================================

function startLiveTracking() {

    if (!currentDriver) {

        return;

    }


    if (
        !navigator.geolocation
    ) {

        console.error(
            "Geolocation is not supported."
        );

        return;

    }


    if (
        gpsWatchId !== null
    ) {

        return;

    }


    console.log(
        "📍 Starting live GPS..."
    );


    gpsWatchId =
        navigator.geolocation.watchPosition(

            async function(position) {

                if (!currentDriver) {
                    return;
                }


                const latitude =
                    Number(
                        position.coords.latitude
                    );


                const longitude =
                    Number(
                        position.coords.longitude
                    );


                if (
                    !validCoordinate(
                        latitude,
                        longitude
                    )
                ) {

                    return;

                }


                const accuracy =
                    Number(
                        position.coords.accuracy
                    ) || null;


                try {

                    await setDoc(
                        doc(
                            db,
                            "driver_locations",
                            currentDriver.uid
                        ),
                        {

                            driverId:
                                currentDriver.uid,

                            latitude:
                                latitude,

                            longitude:
                                longitude,

                            accuracy:
                                accuracy,

                            updatedAt:
                                serverTimestamp()

                        },
                        {
                            merge:
                                true
                        }
                    );


                    console.log(
                        "📍 GPS:",
                        latitude,
                        longitude
                    );


                } catch (error) {

                    console.error(
                        "GPS Firebase error:",
                        error
                    );

                }

            },


            function(error) {

                console.error(
                    "GPS error:",
                    error
                );


                if (
                    error.code ===
                    1
                ) {

                    gpsPermissionDenied =
                        true;


                    alert(
                        "📍 Location permission is required for live driver tracking."
                    );

                }

                else if (
                    error.code ===
                    2
                ) {

                    console.warn(
                        "Location unavailable."
                    );

                }

                else if (
                    error.code ===
                    3
                ) {

                    console.warn(
                        "Location request timed out."
                    );

                }

            },


            {

                enableHighAccuracy:
                    true,

                maximumAge:
                    3000,

                timeout:
                    15000

            }

        );

}


// ==========================================================
// STOP GPS
// ==========================================================

function stopGPS() {

    if (
        gpsWatchId !== null &&
        navigator.geolocation
    ) {

        navigator.geolocation.clearWatch(
            gpsWatchId
        );


        gpsWatchId =
            null;


        console.log(
            "📍 GPS tracking stopped."
        );

    }

}


// ==========================================================
// LOGOUT
// ==========================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async function(event) {

            event.preventDefault();


            const confirmed =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmed) {
                return;
            }


            try {

                stopGPS();


                if (
                    ridesListener
                ) {

                    ridesListener();

                    ridesListener =
                        null;

                }


                if (
                    currentDriver
                ) {

                    await setDoc(
                        doc(
                            db,
                            "users",
                            currentDriver.uid
                        ),
                        {

                            online:
                                false,

                            updatedAt:
                                serverTimestamp()

                        },
                        {
                            merge:
                                true
                        }
                    );

                }


                await auth.signOut();


                window.location.href =
                    "login.html";


            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );


                alert(
                    "Logout failed.\n\n" +
                    error.message
                );

            }

        }
    );

}


// ==========================================================
// VALIDATE COORDINATES
// ==========================================================

function validCoordinate(
    latitude,
    longitude
) {

    return (

        Number.isFinite(
            Number(latitude)
        ) &&

        Number.isFinite(
            Number(longitude)
        ) &&

        Number(latitude) >= -90 &&

        Number(latitude) <= 90 &&

        Number(longitude) >= -180 &&

        Number(longitude) <= 180

    );

}


// ==========================================================
// ESCAPE HTML
// ==========================================================

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(
            value ?? ""
        );


    return div.innerHTML;

}


// ==========================================================
// CLEANUP
// ==========================================================

window.addEventListener(
    "beforeunload",
    function() {

        stopGPS();


        if (
            ridesListener
        ) {

            ridesListener();

            ridesListener =
                null;

        }

    }
);


// ==========================================================
// DEBUG
// ==========================================================

console.log(
    "🚖 SitamarhiCab Driver Dashboard loaded successfully."
);
