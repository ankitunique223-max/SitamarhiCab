import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


const driverName =
    document.getElementById("driverName");

const ridesContainer =
    document.getElementById("ridesContainer");

const refreshBtn =
    document.getElementById("refreshBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const message =
    document.getElementById("message");


let currentUser = null;

let driverData = {};

let rides = [];

let unsubscribeRides = null;


/* =====================================
   AUTH
===================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        currentUser = user;


        console.log(
            "DRIVER UID:",
            user.uid
        );


        await loadDriver();

    }
);


/* =====================================
   LOAD DRIVER
===================================== */

async function loadDriver() {

    try {

        const driverRef =
            doc(
                db,
                "users",
                currentUser.uid
            );


        const driverSnapshot =
            await getDoc(
                driverRef
            );


        if (
            !driverSnapshot.exists()
        ) {

            ridesContainer.innerHTML = `
                <div class="empty">
                    Driver profile not found.
                </div>
            `;

            return;
        }


        driverData =
            driverSnapshot.data();


        console.log(
            "DRIVER DATA:",
            driverData
        );


        if (
            driverData.role !==
            "driver"
        ) {

            ridesContainer.innerHTML = `
                <div class="empty">
                    This account is not a driver account.
                </div>
            `;

            return;
        }


        if (
            driverData.status !==
            "approved"
        ) {

            ridesContainer.innerHTML = `
                <div class="empty">

                    <h3>
                        Driver Approval Pending
                    </h3>

                    <p style="margin-top:10px;">
                        Admin approval ke baad
                        rides yahan show hongi.
                    </p>

                </div>
            `;

            return;
        }


        driverName.textContent =
            driverData.name ||
            driverData.displayName ||
            currentUser.email ||
            "Driver";


        listenToAssignedRides();

    }

    catch (error) {

        console.error(
            "DRIVER LOAD ERROR:",
            error
        );


        showMessage(
            error.message,
            "error"
        );

    }

}


/* =====================================
   REAL-TIME RIDES
===================================== */

function listenToAssignedRides() {

    if (unsubscribeRides) {

        unsubscribeRides();

    }


    console.log(
        "Listening for driver UID:",
        currentUser.uid
    );


    const ridesCollection =
        collection(
            db,
            "rides"
        );


    const ridesQuery =
        query(
            ridesCollection,

            where(
                "driverId",
                "==",
                currentUser.uid
            )
        );


    unsubscribeRides =
        onSnapshot(

            ridesQuery,

            (snapshot) => {

                console.log(
                    "RIDES FOUND:",
                    snapshot.size
                );


                rides = [];


                snapshot.forEach(
                    (item) => {

                        rides.push({

                            id:
                                item.id,

                            ...item.data()

                        });

                    }
                );


                renderRides();

            },


            (error) => {

                console.error(
                    "RIDE LISTENER ERROR:",
                    error
                );


                ridesContainer.innerHTML = `
                    <div class="empty">

                        <h3>
                            ❌ Rides load nahi ho rahi
                        </h3>

                        <p style="margin-top:10px;">
                            ${escapeHTML(
                                error.message
                            )}
                        </p>

                    </div>
                `;

            }

        );

}


/* =====================================
   RENDER RIDES
===================================== */

function renderRides() {

    if (
        !rides.length
    ) {

        ridesContainer.innerHTML = `
            <div class="empty">

                <h3>
                    🚕 No Assigned Rides
                </h3>

                <p style="margin-top:10px;">
                    Admin se ride assign hone ke
                    baad yahan automatically aayegi.
                </p>

            </div>
        `;

        return;
    }


    ridesContainer.innerHTML =
        rides.map(
            (ride) => {

                const status =
                    String(
                        ride.status ||
                        "pending"
                    ).toLowerCase();


                let action = "";


                /* =========================
                   ASSIGNED
                ========================= */

                if (
                    status ===
                    "assigned"
                ) {

                    action = `

                        <button
                            type="button"

                            class="accept-btn"

                            data-action="accept"

                            data-ride-id="${escapeAttribute(
                                ride.id
                            )}"
                        >
                            ✅ Accept Ride
                        </button>

                    `;

                }


                /* =========================
                   ACCEPTED
                ========================= */

                else if (
                    status ===
                    "accepted"
                ) {

                    action = `

                        <button
                            type="button"

                            class="start-btn"

                            data-action="start"

                            data-ride-id="${escapeAttribute(
                                ride.id
                            )}"
                        >
                            ▶️ Start Ride
                        </button>

                    `;

                }


                /* =========================
                   ONGOING
                ========================= */

                else if (
                    status ===
                    "ongoing"
                ) {

                    action = `

                        <button
                            type="button"

                            class="complete-btn"

                            data-action="complete"

                            data-ride-id="${escapeAttribute(
                                ride.id
                            )}"
                        >
                            🏁 Complete Ride
                        </button>

                    `;

                }


                /* =========================
                   COMPLETED
                ========================= */

                else if (
                    status ===
                    "completed"
                ) {

                    action = `

                        <button
                            type="button"

                            class="done-btn"

                            disabled
                        >
                            ✅ Ride Completed
                        </button>

                    `;

                }


                /* =========================
                   CANCELLED
                ========================= */

                else if (
                    status ===
                    "cancelled"
                ) {

                    action = `

                        <button
                            type="button"

                            class="cancelled-btn"

                            disabled
                        >
                            ❌ Ride Cancelled
                        </button>

                    `;

                }


                else {

                    action = `
                        <span>
                            Status:
                            ${escapeHTML(
                                ride.status ||
                                "Unknown"
                            )}
                        </span>
                    `;

                }


                return `

                    <div class="ride-card">

                        <div class="ride-header">

                            <h3>
                                🚕 Ride #${escapeHTML(
                                    ride.id
                                )}
                            </h3>

                            <span class="ride-status">
                                ${escapeHTML(
                                    ride.status ||
                                    "Pending"
                                )}
                            </span>

                        </div>


                        <div class="ride-details">

                            <p>
                                📍
                                <strong>
                                    Pickup:
                                </strong>

                                ${escapeHTML(
                                    ride.pickup ||
                                    ride.pickupLocation ||
                                    "-"
                                )}
                            </p>


                            <p>
                                🏁
                                <strong>
                                    Destination:
                                </strong>

                                ${escapeHTML(
                                    ride.destination ||
                                    ride.dropLocation ||
                                    "-"
                                )}
                            </p>


                            <p>
                                💰
                                <strong>
                                    Fare:
                                </strong>

                                ₹${escapeHTML(
                                    String(
                                        ride.finalFare ||
                                        ride.fare ||
                                        0
                                    )
                                )}
                            </p>


                            <p>
                                💳
                                <strong>
                                    Payment:
                                </strong>

                                ${escapeHTML(
                                    ride.paymentStatus ||
                                    ride.payment ||
                                    "-"
                                )}
                            </p>


                            <p>
                                👤
                                <strong>
                                    Customer:
                                </strong>

                                ${escapeHTML(
                                    ride.userId ||
                                    "-"
                                )}
                            </p>

                        </div>


                        <div class="actions">

                            ${action}

                        </div>

                    </div>

                `;

            }
        ).join("");

}


/* =====================================
   BUTTON HANDLER
===================================== */

ridesContainer.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                "button[data-action]"
            );


        if (!button) {
            return;
        }


        const action =
            button.dataset.action;


        const rideId =
            button.dataset.rideId;


        if (!rideId) {

            alert(
                "Ride ID missing."
            );

            return;
        }


        if (
            action ===
            "accept"
        ) {

            await acceptRide(
                rideId,
                button
            );

        }


        else if (
            action ===
            "start"
        ) {

            await startRide(
                rideId,
                button
            );

        }


        else if (
            action ===
            "complete"
        ) {

            await completeRide(
                rideId,
                button
            );

        }

    }
);


/* =====================================
   ACCEPT
===================================== */

async function acceptRide(
    rideId,
    button
) {

    try {

        button.disabled = true;

        button.textContent =
            "Accepting...";


        await updateDoc(
            doc(
                db,
                "rides",
                rideId
            ),
            {

                status:
                    "accepted",

                acceptedAt:
                    new Date(),

                acceptedBy:
                    currentUser.uid

            }
        );


        showMessage(
            "✅ Ride accepted.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "ACCEPT ERROR:",
            error
        );


        button.disabled = false;

        button.textContent =
            "✅ Accept Ride";


        alert(
            "Accept failed:\n\n" +
            error.message
        );

    }

}


/* =====================================
   START
===================================== */

async function startRide(
    rideId,
    button
) {

    try {

        button.disabled = true;

        button.textContent =
            "Starting...";


        await updateDoc(
            doc(
                db,
                "rides",
                rideId
            ),
            {

                status:
                    "ongoing",

                startedAt:
                    new Date(),

                startedBy:
                    currentUser.uid

            }
        );


        showMessage(
            "▶️ Ride started.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "START ERROR:",
            error
        );


        button.disabled = false;

        button.textContent =
            "▶️ Start Ride";


        alert(
            "Start failed:\n\n" +
            error.message
        );

    }

}


/* =====================================
   COMPLETE
===================================== */

async function completeRide(
    rideId,
    button
) {

    try {

        const ride =
            rides.find(
                item =>
                    item.id ===
                    rideId
            );


        if (!ride) {

            alert(
                "Ride data not found."
            );

            return;
        }


        const currentFare =
            Number(
                ride.finalFare ||
                ride.fare ||
                0
            );


        const fare =
            prompt(
                "Final Fare enter karein:",
                String(currentFare)
            );


        if (fare === null) {
            return;
        }


        const finalFare =
            Number(fare);


        if (
            !Number.isFinite(
                finalFare
            ) ||
            finalFare < 0
        ) {

            alert(
                "Valid fare enter karein."
            );

            return;
        }


        button.disabled = true;

        button.textContent =
            "Completing...";


        await updateDoc(
            doc(
                db,
                "rides",
                rideId
            ),
            {

                status:
                    "completed",

                finalFare:
                    finalFare,

                completedAt:
                    new Date(),

                completedBy:
                    currentUser.uid

            }
        );


        showMessage(
            "🏁 Ride completed.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "COMPLETE ERROR:",
            error
        );


        button.disabled = false;

        button.textContent =
            "🏁 Complete Ride";


        alert(
            "Complete failed:\n\n" +
            error.message
        );

    }

}


/* =====================================
   REFRESH
===================================== */

refreshBtn.addEventListener(
    "click",
    () => {

        listenToAssignedRides();

    }
);


/* =====================================
   LOGOUT
===================================== */

logoutBtn.addEventListener(
    "click",
    async () => {

        try {

            if (
                unsubscribeRides
            ) {

                unsubscribeRides();

            }


            await signOut(auth);


            window.location.href =
                "login.html";

        }

        catch (error) {

            alert(
                "Logout failed:\n\n" +
                error.message
            );

        }

    }
);


/* =====================================
   MESSAGE
===================================== */

function showMessage(
    text,
    type
) {

    message.style.display =
        "block";

    message.textContent =
        text;


    if (
        type ===
        "success"
    ) {

        message.style.background =
            "#dcfce7";

        message.style.color =
            "green";

    }

    else {

        message.style.background =
            "#fee2e2";

        message.style.color =
            "red";

    }

}


/* =====================================
   HELPERS
===================================== */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function escapeAttribute(value) {

    return escapeHTML(value);

}