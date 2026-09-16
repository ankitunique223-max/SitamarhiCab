// ==========================================
// SITAMARHI CAB
// REAL LIVE RIDE TRACKING
// ==========================================

import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================
// ELEMENTS
// ==========================================

const eta =
    document.getElementById("eta");

const rideStatus =
    document.getElementById("rideStatus");

const cab =
    document.getElementById("cab");


// ==========================================
// RIDE ID
// ==========================================

const params =
    new URLSearchParams(
        window.location.search
    );

const rideId =
    params.get("rideId");


let locationListener =
    null;

let rideListener =
    null;


// ==========================================
// CHECK RIDE ID
// ==========================================

if (!rideId) {

    if (rideStatus) {

        rideStatus.innerHTML =
            "❌ Ride ID missing.";
    }

} else {

    console.log(
        "🚖 Tracking Ride:",
        rideId
    );

    loadRide();
}


// ==========================================
// LOAD RIDE
// ==========================================

async function loadRide() {

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

            showError(
                "❌ Ride not found."
            );

            return;
        }


        const ride =
            rideSnapshot.data();


        console.log(
            "Ride:",
            ride
        );


        if (
            !ride.driverId
        ) {

            showError(
                "❌ Driver not assigned."
            );

            return;
        }


        // ==================================
        // LISTEN TO RIDE STATUS
        // ==================================

        listenToRide(
            rideId
        );


        // ==================================
        // LISTEN TO DRIVER GPS
        // ==================================

        listenToDriverLocation(
            ride.driverId
        );


        // ==================================
        // UPDATE BASIC INFO
        // ==================================

        updateRideInfo(
            ride
        );


    } catch (error) {

        console.error(
            "Load ride error:",
            error
        );


        showError(
            "❌ Unable to load ride."
        );
    }
}


// ==========================================
// RIDE STATUS LISTENER
// ==========================================

function listenToRide(
    rideId
) {

    const rideRef =
        doc(
            db,
            "rides",
            rideId
        );


    rideListener =
        onSnapshot(

            rideRef,

            function (snapshot) {

                if (
                    !snapshot.exists()
                ) {

                    showError(
                        "❌ Ride not found."
                    );

                    return;
                }


                const ride =
                    snapshot.data();


                console.log(
                    "Ride status:",
                    ride.status
                );


                updateRideInfo(
                    ride
                );


                // ==================================
                // COMPLETED
                // ==================================

                if (
                    ride.status ===
                    "completed"
                ) {

                    if (rideStatus) {

                        rideStatus.innerHTML =
                            "🏁 Ride Completed";
                    }


                    if (eta) {

                        eta.innerHTML =
                            "Completed";
                    }


                    setTimeout(
                        function () {

                            window.location.href =
                                "ride-complete.html";

                        },
                        1500
                    );
                }


                // ==================================
                // CANCELLED
                // ==================================

                if (
                    ride.status ===
                    "cancelled"
                ) {

                    if (rideStatus) {

                        rideStatus.innerHTML =
                            "❌ Ride Cancelled";
                    }
                }

            },

            function (error) {

                console.error(
                    "Ride listener error:",
                    error
                );
            }
        );
}


// ==========================================
// DRIVER LOCATION LISTENER
// ==========================================

function listenToDriverLocation(
    driverId
) {

    console.log(
        "📍 Tracking driver:",
        driverId
    );


    const locationRef =
        doc(
            db,
            "driver_locations",
            driverId
        );


    locationListener =
        onSnapshot(

            locationRef,

            function (snapshot) {

                if (
                    !snapshot.exists()
                ) {

                    console.log(
                        "No driver location yet."
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
                    !Number.isFinite(
                        latitude
                    ) ||
                    !Number.isFinite(
                        longitude
                    )
                ) {

                    return;
                }


                console.log(
                    "📍 Driver moved:",
                    latitude,
                    longitude
                );


                moveCab(
                    latitude,
                    longitude
                );
            },

            function (error) {

                console.error(
                    "Location listener error:",
                    error
                );
            }
        );
}


// ==========================================
// UPDATE RIDE INFO
// ==========================================

function updateRideInfo(
    ride
) {

    if (rideStatus) {

        switch (
            ride.status
        ) {

            case "assigned":

                rideStatus.innerHTML =
                    "👨‍✈️ Driver Assigned";

                break;


            case "accepted":

                rideStatus.innerHTML =
                    "✅ Driver Accepted";

                break;


            case "ongoing":

                rideStatus.innerHTML =
                    "🚗 Ride Started";

                break;


            case "completed":

                rideStatus.innerHTML =
                    "🏁 Ride Completed";

                break;


            default:

                rideStatus.innerHTML =
                    "🔎 Searching Driver";
        }
    }


    // ==================================
    // ETA
    // ==================================

    if (
        ride.status ===
        "ongoing"
    ) {

        if (eta) {

            eta.innerHTML =
                "Ride in progress";
        }

    } else if (
        ride.status ===
        "accepted"
    ) {

        if (eta) {

            eta.innerHTML =
                "Driver is arriving";
        }
    }
}


// ==========================================
// MOVE CAB
// ==========================================

function moveCab(
    latitude,
    longitude
) {

    if (!cab) {

        return;
    }


    /*
        Temporary visual map position.

        Later we will replace this
        with Google Maps / Leaflet.
    */


    const latPercent =
        ((latitude - 20) / 10) *
        100;


    const lngPercent =
        ((longitude - 80) / 10) *
        100;


    const left =
        Math.max(
            5,
            Math.min(
                95,
                lngPercent
            )
        );


    const top =
        Math.max(
            5,
            Math.min(
                95,
                100 - latPercent
            )
        );


    cab.style.left =
        left + "%";


    cab.style.top =
        top + "%";


    cab.style.transition =
        "all 1.5s ease";


    console.log(
        "🚖 Cab position:",
        left + "%",
        top + "%"
    );
}


// ==========================================
// ERROR
// ==========================================

function showError(
    message
) {

    if (rideStatus) {

        rideStatus.innerHTML =
            message;
    }


    if (eta) {

        eta.innerHTML =
            "-";
    }
}


// ==========================================
// CANCEL RIDE
// ==========================================

window.cancelRide =
    async function () {

        const confirmCancel =
            confirm(
                "Cancel this ride?"
            );


        if (!confirmCancel) {

            return;
        }


        try {

            await import(
                "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
            ).then(
                async ({
                    updateDoc
                }) => {

                    await updateDoc(

                        doc(
                            db,
                            "rides",
                            rideId
                        ),

                        {
                            status:
                                "cancelled"
                        }
                    );
                }
            );


            alert(
                "❌ Ride cancelled."
            );


        } catch (error) {

            console.error(
                error
            );


            alert(
                "Unable to cancel ride."
            );
        }
    };


// ==========================================
// CALL DRIVER
// ==========================================

window.callDriver =
    function () {

        alert(
            "📞 Calling Driver..."
        );
    };


// ==========================================
// CHAT DRIVER
// ==========================================

window.chatDriver =
    function () {

        alert(
            "💬 Chat feature coming soon."
        );
    };


// ==========================================
// PAYMENT
// ==========================================

const paymentBtn =
    document.getElementById(
        "paymentBtn"
    );


if (paymentBtn) {

    paymentBtn.addEventListener(
        "click",
        function () {

            window.location.href =
                "payment.html";
        }
    );
}


// ==========================================
// CLEANUP
// ==========================================

window.addEventListener(
    "beforeunload",
    function () {

        if (
            locationListener
        ) {

            locationListener();
        }


        if (
            rideListener
        ) {

            rideListener();
        }
    }
);