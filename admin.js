import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


const adminEmail =
    document.getElementById("adminEmail");

const totalUsers =
    document.getElementById("totalUsers");

const totalDrivers =
    document.getElementById("totalDrivers");

const totalRides =
    document.getElementById("totalRides");

const revenue =
    document.getElementById("revenue");

const driversContainer =
    document.getElementById("driversContainer");

const ridesContainer =
    document.getElementById("ridesContainer");

const usersContainer =
    document.getElementById("usersContainer");

const refreshBtn =
    document.getElementById("refreshBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const message =
    document.getElementById("message");


let allUsers = [];
let allDrivers = [];
let allRides = [];


/* =====================================
   AUTH
===================================== */

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    adminEmail.textContent =
        user.email || "Administrator";

    await loadDashboard();

});


/* =====================================
   LOAD EVERYTHING
===================================== */

async function loadDashboard() {

    try {

        showMessage(
            "Loading dashboard...",
            "info"
        );


        /* USERS */

        const usersSnapshot =
            await getDocs(
                collection(db, "users")
            );


        allUsers = [];

        usersSnapshot.forEach((item) => {

            allUsers.push({
                id: item.id,
                ...item.data()
            });

        });


        /* APPROVED DRIVERS */

        allDrivers =
            allUsers.filter((user) => {

                return (
                    user.role === "driver" &&
                    user.status === "approved"
                );

            });


        /* RIDES */

        const ridesSnapshot =
            await getDocs(
                collection(db, "rides")
            );


        allRides = [];

        ridesSnapshot.forEach((item) => {

            allRides.push({
                id: item.id,
                ...item.data()
            });

        });


        updateStats();

        renderDrivers();

        renderRides();

        renderUsers();


        showMessage(
            "Dashboard loaded successfully.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "ADMIN DASHBOARD ERROR:",
            error
        );

        showMessage(
            "Error: " + error.message,
            "error"
        );

        alert(
            "Dashboard Error:\n\n" +
            error.message
        );

    }

}


/* =====================================
   STATS
===================================== */

function updateStats() {

    const users =
        allUsers.filter(
            user => user.role === "user"
        );


    const drivers =
        allUsers.filter(
            user => user.role === "driver"
        );


    let totalRevenue = 0;


    allRides.forEach((ride) => {

        if (ride.finalFare) {

            totalRevenue +=
                Number(ride.finalFare) || 0;

        }

        else if (ride.fare) {

            if (
                ride.paymentStatus === "paid"
            ) {

                totalRevenue +=
                    Number(ride.fare) || 0;

            }

        }

    });


    totalUsers.textContent =
        users.length;

    totalDrivers.textContent =
        drivers.length;

    totalRides.textContent =
        allRides.length;

    revenue.textContent =
        "₹" +
        totalRevenue.toFixed(2);

}


/* =====================================
   DRIVERS
===================================== */

function renderDrivers() {

    if (allDrivers.length === 0) {

        driversContainer.innerHTML = `
            <div class="empty">
                No approved drivers found.
            </div>
        `;

        return;
    }


    driversContainer.innerHTML =
        allDrivers.map((driver) => {

            return `

                <div class="driver-card">

                    <h3>
                        🚗 ${escapeHTML(
                            driver.name ||
                            driver.displayName ||
                            "Driver"
                        )}
                    </h3>

                    <p>
                        Email:
                        ${escapeHTML(
                            driver.email || "-"
                        )}
                    </p>

                    <p>
                        Phone:
                        ${escapeHTML(
                            driver.phone || "-"
                        )}
                    </p>

                    <p>
                        Status:
                        <strong>
                            ${escapeHTML(
                                driver.status || "-"
                            )}
                        </strong>
                    </p>

                    <p>
                        Driver UID:
                        <small>
                            ${escapeHTML(
                                driver.id
                            )}
                        </small>
                    </p>

                </div>

            `;

        }).join("");

}


/* =====================================
   RIDES
===================================== */

function renderRides() {

    if (allRides.length === 0) {

        ridesContainer.innerHTML = `
            <div class="empty">
                No rides found.
            </div>
        `;

        return;
    }


    ridesContainer.innerHTML =
        allRides.map((ride) => {

            const driver =
                allDrivers.find(
                    item =>
                        item.id ===
                        ride.driverId
                );


            const driverName =
                driver
                    ? (
                        driver.name ||
                        driver.displayName ||
                        driver.email
                    )
                    : (
                        ride.driverName ||
                        "Not Assigned"
                    );


            const status =
                String(
                    ride.status || "pending"
                ).toLowerCase();


            let actionHTML = "";


            /* PENDING */

            if (
                status === "pending" ||
                status === "unassigned"
            ) {

                actionHTML = `
                    ${createDriverSelector(ride)}
                `;

            }


            /* ASSIGNED */

            else if (
                status === "assigned"
            ) {

                actionHTML = `
                    <div class="assign-area">

                        <select
                            class="driver-select"
                            data-ride-id="${escapeAttribute(
                                ride.id
                            )}"
                        >

                            ${createDriverOptions(
                                ride.driverId
                            )}

                        </select>

                        <button
                            type="button"
                            class="reassign-btn"
                            data-action="assign"
                            data-ride-id="${escapeAttribute(
                                ride.id
                            )}"
                        >
                            🔄 Reassign Driver
                        </button>

                    </div>
                `;

            }


            /* ACCEPTED / ONGOING / COMPLETED */

            else {

                actionHTML = `
                    <p style="margin-top:15px;">
                        🚗 Driver:
                        <strong>
                            ${escapeHTML(
                                driverName
                            )}
                        </strong>
                    </p>
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

                        <span class="status">
                            ${escapeHTML(
                                status.toUpperCase()
                            )}
                        </span>

                    </div>


                    <div class="ride-details">

                        <p>
                            <strong>Customer:</strong>
                            ${escapeHTML(
                                ride.userId || "-"
                            )}
                        </p>

                        <p>
                            <strong>Pickup:</strong>
                            ${escapeHTML(
                                ride.pickup ||
                                ride.pickupLocation ||
                                "-"
                            )}
                        </p>

                        <p>
                            <strong>Destination:</strong>
                            ${escapeHTML(
                                ride.destination ||
                                ride.dropLocation ||
                                "-"
                            )}
                        </p>

                        <p>
                            <strong>Fare:</strong>
                            ₹${escapeHTML(
                                String(
                                    ride.finalFare ||
                                    ride.fare ||
                                    0
                                )
                            )}
                        </p>

                        <p>
                            <strong>Payment:</strong>
                            ${escapeHTML(
                                ride.paymentStatus ||
                                ride.payment ||
                                "-"
                            )}
                        </p>

                        <p>
                            <strong>Driver:</strong>
                            ${escapeHTML(
                                driverName
                            )}
                        </p>

                    </div>

                    ${actionHTML}

                </div>

            `;

        }).join("");

}


/* =====================================
   DRIVER SELECTOR
===================================== */

function createDriverSelector(ride) {

    if (allDrivers.length === 0) {

        return `
            <p class="error">
                ⚠️ No approved driver available.
            </p>
        `;

    }


    return `

        <div class="assign-area">

            <select
                class="driver-select"
                data-ride-id="${escapeAttribute(
                    ride.id
                )}"
            >

                ${createDriverOptions()}

            </select>


            <button
                type="button"
                class="assign-btn"
                data-action="assign"
                data-ride-id="${escapeAttribute(
                    ride.id
                )}"
            >
                🚕 Assign Driver
            </button>

        </div>

    `;

}


/* =====================================
   DRIVER OPTIONS
===================================== */

function createDriverOptions(
    selectedDriverId = ""
) {

    let html = `
        <option value="">
            Select Driver
        </option>
    `;


    allDrivers.forEach((driver) => {

        const selected =
            driver.id === selectedDriverId
                ? "selected"
                : "";


        html += `

            <option
                value="${escapeAttribute(
                    driver.id
                )}"
                ${selected}
            >
                ${escapeHTML(
                    driver.name ||
                    driver.displayName ||
                    driver.email ||
                    "Driver"
                )}
            </option>

        `;

    });


    return html;

}


/* =====================================
   ASSIGN BUTTON
===================================== */

ridesContainer.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                '[data-action="assign"]'
            );


        if (!button) return;


        const rideId =
            button.dataset.rideId;


        const select =
            ridesContainer.querySelector(
                `.driver-select[data-ride-id="${CSS.escape(
                    rideId
                )}"]`
            );


        if (!select) {

            alert(
                "Driver selection nahi mila."
            );

            return;
        }


        const driverId =
            select.value;


        if (!driverId) {

            alert(
                "Please select a driver."
            );

            return;
        }


        const driver =
            allDrivers.find(
                item =>
                    item.id === driverId
            );


        if (!driver) {

            alert(
                "Driver not found."
            );

            return;
        }


        try {

            button.disabled = true;

            button.textContent =
                "Assigning...";


            await updateDoc(
                doc(
                    db,
                    "rides",
                    rideId
                ),
                {

                    driverId:
                        driver.id,

                    driverName:
                        driver.name ||
                        driver.displayName ||
                        driver.email ||
                        "Driver",

                    status:
                        "assigned",

                    assignedAt:
                        new Date()

                }
            );


            alert(
                "✅ Driver assigned successfully!"
            );


            await loadDashboard();

        }

        catch (error) {

            console.error(
                "ASSIGN ERROR:",
                error
            );


            alert(
                "❌ Driver assign failed:\n\n" +
                error.message
            );


            button.disabled = false;

            button.textContent =
                "🚕 Assign Driver";

        }

    }
);


/* =====================================
   USERS
===================================== */

function renderUsers() {

    if (allUsers.length === 0) {

        usersContainer.innerHTML = `
            <div class="empty">
                No users found.
            </div>
        `;

        return;
    }


    usersContainer.innerHTML =
        allUsers.map((user) => {

            return `

                <div class="user-card">

                    <h3>
                        👤 ${escapeHTML(
                            user.name ||
                            user.displayName ||
                            "User"
                        )}
                    </h3>

                    <p>
                        Email:
                        ${escapeHTML(
                            user.email || "-"
                        )}
                    </p>

                    <p>
                        Role:
                        ${escapeHTML(
                            user.role || "-"
                        )}
                    </p>

                    <p>
                        Status:
                        ${escapeHTML(
                            user.status || "-"
                        )}
                    </p>

                </div>

            `;

        }).join("");

}


/* =====================================
   REFRESH
===================================== */

refreshBtn.addEventListener(
    "click",
    async () => {

        await loadDashboard();

    }
);


/* =====================================
   LOGOUT
===================================== */

logoutBtn.addEventListener(
    "click",
    async () => {

        await signOut(auth);

        window.location.href =
            "login.html";

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


    if (type === "success") {

        message.className =
            "success";

    }

    else if (type === "error") {

        message.className =
            "error";

    }

    else {

        message.className = "";

    }

}


/* =====================================
   SECURITY HELPERS
===================================== */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

    return escapeHTML(value);

}