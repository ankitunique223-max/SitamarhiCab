// ==========================================
// SITAMARHI CAB
// CUSTOMER DASHBOARD
// dashboard.js
// ==========================================

import { auth, db } from "./firebase.js";

import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    onSnapshot,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================
// GLOBAL
// ==========================================

let currentUser = null;

let rides = [];

let driverLocationListener = null;

let notificationListener = null;

let notifications = [];


// ==========================================
// AUTH CHECK
// ==========================================

auth.onAuthStateChanged(async function (user) {

    if (!user) {

        window.location.href = "login.html";

        return;
    }

    currentUser = user;

    console.log("✅ User logged in:", user.uid);

    // IMPORTANT:
    // Notification listener must be inside auth callback
    startNotificationListener(user.uid);

    await loadUserProfile();

    await loadUserRides();

});


// ==========================================
// NOTIFICATION LISTENER
// ==========================================

function startNotificationListener(userId) {

    if (notificationListener) {

        notificationListener();

        notificationListener = null;
    }

    const notificationQuery = query(
        collection(db, "notifications"),
        where("userId", "==", userId)
    );

    notificationListener = onSnapshot(
        notificationQuery,
        function (snapshot) {

            notifications = [];

            snapshot.forEach(function (docSnap) {

                notifications.push({

                    id: docSnap.id,

                    ...docSnap.data()

                });

            });

            notifications.sort(function (a, b) {

                const timeA =
                    getTimestamp(a.createdAt);

                const timeB =
                    getTimestamp(b.createdAt);

                return timeB - timeA;

            });

            updateNotificationCount();

            renderNotifications();

        },
        function (error) {

            console.error(
                "❌ Notification listener error:",
                error
            );

        }
    );
}


// ==========================================
// NOTIFICATION COUNT
// ==========================================

function updateNotificationCount() {

    const badge =
        document.getElementById(
            "notificationCount"
        );

    if (!badge) {
        return;
    }

    const unreadCount =
        notifications.filter(function (notification) {

            return notification.read !== true;

        }).length;


    if (unreadCount > 0) {

        badge.textContent =
            unreadCount > 99
                ? "99+"
                : unreadCount;

        badge.style.display = "flex";

    } else {

        badge.style.display = "none";

    }

}


// ==========================================
// RENDER NOTIFICATIONS
// ==========================================

function renderNotifications() {

    const container =
        document.getElementById(
            "notificationList"
        );

    if (!container) {
        return;
    }


    if (notifications.length === 0) {

        container.innerHTML = `
            <div class="empty-notification">
                <div>🔔</div>
                <p>No notifications yet</p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        notifications.map(function (notification) {

            const isUnread =
                notification.read !== true;

            const time =
                formatNotificationTime(
                    notification.createdAt
                );


            return `
                <div
                    class="notification-item ${isUnread ? "unread" : ""}"
                    data-id="${notification.id}"
                    onclick="openNotification('${notification.id}')"
                >

                    <div class="notification-icon">
                        ${getNotificationIcon(
                            notification.type
                        )}
                    </div>

                    <div class="notification-content">

                        <div class="notification-title">
                            ${escapeHTML(
                                notification.title ||
                                "Notification"
                            )}
                        </div>

                        <div class="notification-message">
                            ${escapeHTML(
                                notification.message ||
                                ""
                            )}
                        </div>

                        <div class="notification-time">
                            ${time}
                        </div>

                    </div>

                    ${
                        isUnread
                            ? `<span class="unread-dot"></span>`
                            : ""
                    }

                </div>
            `;

        }).join("");

}


// ==========================================
// NOTIFICATION ICON
// ==========================================

function getNotificationIcon(type) {

    switch (type) {

        case "driver_assigned":
            return "🚕";

        case "driver_accepted":
            return "✅";

        case "ride_started":
            return "🚗";

        case "ride_completed":
            return "🏁";

        case "ride_cancelled":
            return "❌";

        case "payment":
            return "💰";

        default:
            return "🔔";

    }

}


// ==========================================
// NOTIFICATION TIME
// ==========================================

function formatNotificationTime(timestamp) {

    if (!timestamp) {
        return "Just now";
    }

    try {

        const date =
            timestamp.toDate
                ? timestamp.toDate()
                : new Date(timestamp);

        const now =
            new Date();

        const diff =
            now - date;

        const seconds =
            Math.floor(diff / 1000);

        const minutes =
            Math.floor(seconds / 60);

        const hours =
            Math.floor(minutes / 60);

        const days =
            Math.floor(hours / 24);


        if (seconds < 60) {

            return "Just now";

        }


        if (minutes < 60) {

            return `${minutes} min ago`;

        }


        if (hours < 24) {

            return `${hours} hr ago`;

        }


        if (days < 7) {

            return `${days} day${days > 1 ? "s" : ""} ago`;

        }


        return date.toLocaleDateString("en-IN");

    } catch (error) {

        return "Recently";

    }

}


// ==========================================
// OPEN NOTIFICATION
// ==========================================

window.openNotification =
    async function (notificationId) {

        const notification =
            notifications.find(function (item) {

                return item.id === notificationId;

            });


        if (!notification) {
            return;
        }


        if (notification.read !== true) {

            try {

                await updateDoc(
                    doc(
                        db,
                        "notifications",
                        notificationId
                    ),
                    {
                        read: true,
                        readAt: new Date()
                    }
                );

            } catch (error) {

                console.error(
                    "❌ Notification read error:",
                    error
                );

            }

        }


        if (notification.rideId) {

            window.location.href =
                "search-driver.html?rideId=" +
                encodeURIComponent(
                    notification.rideId
                );

        }

    };


// ==========================================
// MARK ALL NOTIFICATIONS READ
// ==========================================

window.markAllNotificationsRead =
    async function () {

        const unread =
            notifications.filter(function (notification) {

                return notification.read !== true;

            });


        for (const notification of unread) {

            try {

                await updateDoc(
                    doc(
                        db,
                        "notifications",
                        notification.id
                    ),
                    {
                        read: true,
                        readAt: new Date()
                    }
                );

            } catch (error) {

                console.error(
                    "❌ Mark read error:",
                    error
                );

            }

        }

    };


// ==========================================
// TOGGLE NOTIFICATION PANEL
// ==========================================

window.toggleNotificationPanel =
    function () {

        const panel =
            document.getElementById(
                "notificationPanel"
            );

        if (!panel) {
            return;
        }


        const visible =
            panel.style.display === "block";


        panel.style.display =
            visible
                ? "none"
                : "block";


        if (!visible) {

            renderNotifications();

        }

    };


// ==========================================
// LOAD USER PROFILE
// ==========================================

async function loadUserProfile() {

    try {

        const userRef =
            doc(
                db,
                "users",
                currentUser.uid
            );


        const snapshot =
            await getDoc(userRef);


        if (!snapshot.exists()) {

            updateUserName(
                currentUser.displayName ||
                "User"
            );

            return;
        }


        const data =
            snapshot.data();


        const name =
            data.name ||
            data.fullName ||
            currentUser.displayName ||
            "User";


        updateUserName(name);

    } catch (error) {

        console.error(
            "❌ Profile loading error:",
            error
        );


        updateUserName(
            currentUser.displayName ||
            "User"
        );

    }

}


// ==========================================
// UPDATE USER NAME
// ==========================================

function updateUserName(name) {

    const nameElements =
        document.querySelectorAll(
            ".user span"
        );


    nameElements.forEach(function (element) {

        element.textContent = name;

    });


    const welcome =
        document.querySelector(
            ".topbar h1"
        );


    if (welcome) {

        welcome.textContent =
            "Welcome 👋 " + name;

    }

}


// ==========================================
// LOAD USER RIDES
// ==========================================

async function loadUserRides() {

    const rideList =
        document.getElementById(
            "myRideList"
        );


    if (!rideList) {
        return;
    }


    rideList.innerHTML =
        "<p>Loading your rides...</p>";


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
                )
            );


        const snapshot =
            await getDocs(
                ridesQuery
            );


        rides = [];


        snapshot.forEach(function (rideDoc) {

            rides.push({

                id: rideDoc.id,

                ...rideDoc.data()

            });

        });


        rides.sort(function (a, b) {

            return (
                getTimestamp(b.createdAt) -
                getTimestamp(a.createdAt)
            );

        });


        console.log(
            "🚖 User rides:",
            rides
        );


        updateRideCount();

        await updateWallet();

        updateRating();

        displayRides();

        setupLatestRideTracking();

    } catch (error) {

        console.error(
            "❌ Ride loading error:",
            error
        );


        rideList.innerHTML = `
            <div class="error-message">
                ❌ Unable to load your rides.
                <br>
                ${escapeHTML(error.message)}
            </div>
        `;

    }

}


// ==========================================
// DISPLAY RIDES
// ==========================================

function displayRides() {

    const rideList =
        document.getElementById(
            "myRideList"
        );


    if (!rideList) {
        return;
    }


    if (rides.length === 0) {

        rideList.innerHTML = `

            <div class="no-rides">

                <h3>
                    🚖 No rides yet
                </h3>

                <p>
                    Book your first ride now.
                </p>

                <a
                    href="book.html"
                    class="action-btn"
                >
                    Book New Ride
                </a>

            </div>

        `;

        return;
    }


    rideList.innerHTML = "";


    rides.forEach(function (ride) {

        const status =
            ride.status || "pending";


        const statusClass =
            getStatusClass(status);


        const fare =
            Number(
                ride.finalFare ??
                ride.fare ??
                0
            );


        let buttons = "";


        // ----------------------------------
        // ACTIVE RIDE
        // ----------------------------------

        if (
            status === "assigned" ||
            status === "accepted" ||
            status === "ongoing"
        ) {

            buttons = `

                <button
                    class="action-btn"
                    onclick="
                        trackRide('${ride.id}')
                    "
                >
                    📍 Track Ride
                </button>

            `;

        }


        // ----------------------------------
        // COMPLETED RIDE
        // ----------------------------------

        if (status === "completed") {

            const paymentStatus =
                ride.paymentStatus || "pending";


            buttons = `

                <div style="
                    display:flex;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-top:10px;
                ">

                    ${
                        paymentStatus !== "paid"
                            ?
                            `
                            <button
                                class="action-btn"
                                style="background:#16a34a;"
                                onclick="
                                    payRideWithWallet(
                                        '${ride.id}'
                                    )
                                "
                            >
                                💳 Pay with Wallet
                            </button>
                            `
                            :
                            `
                            <span
                                style="
                                    padding:10px 14px;
                                    background:#dcfce7;
                                    color:#166534;
                                    border-radius:8px;
                                    font-weight:bold;
                                "
                            >
                                ✅ Paid by
                                ${escapeHTML(
                                    ride.payment ||
                                    "Online"
                                )}
                            </span>
                            `
                    }


                    <button
                        class="action-btn"
                        onclick="
                            viewRide('${ride.id}')
                        "
                    >
                        ⭐ View Ride
                    </button>

                </div>

            `;

        }


        rideList.innerHTML += `

            <div class="ride-card">

                <div class="ride-card-header">

                    <h3>
                        🚖 Ride
                    </h3>

                    <span
                        class="${statusClass}"
                    >
                        ${escapeHTML(
                            formatStatus(status)
                        )}
                    </span>

                </div>


                <div class="ride-route">

                    <p>
                        <b>📍 Pickup:</b>
                        ${escapeHTML(
                            ride.pickup || "-"
                        )}
                    </p>

                    <p>
                        <b>📍 Drop:</b>
                        ${escapeHTML(
                            ride.drop || "-"
                        )}
                    </p>

                </div>


                <div class="ride-details">

                    <p>
                        <b>💰 Fare:</b>
                        ₹${fare.toFixed(2)}
                    </p>

                    <p>
                        <b>💳 Payment:</b>
                        ${escapeHTML(
                            ride.payment || "-"
                        )}
                    </p>

                    <p>
                        <b>🚗 Vehicle:</b>
                        ${escapeHTML(
                            ride.vehicle || "-"
                        )}
                    </p>

                </div>


                ${
                    ride.driverId
                        ?
                        `
                        <p>
                            <b>👨‍✈️ Driver:</b>
                            Assigned
                        </p>
                        `
                        :
                        ""
                }


                ${buttons}

            </div>

        `;

    });

}


// ==========================================
// TOTAL RIDES
// ==========================================

function updateRideCount() {

    const cards =
        document.querySelectorAll(
            ".dash-card h2"
        );


    if (cards.length > 0) {

        cards[0].textContent =
            rides.length;

    }

}


// ==========================================
// REAL WALLET BALANCE
// ==========================================

async function updateWallet() {

    const cards =
        document.querySelectorAll(
            ".dash-card h2"
        );


    if (cards.length < 2) {
        return;
    }


    try {

        const walletRef =
            doc(
                db,
                "wallet",
                currentUser.uid
            );


        const snapshot =
            await getDoc(walletRef);


        let balance = 0;


        if (snapshot.exists()) {

            const data =
                snapshot.data();


            balance =
                Number(
                    data.balance || 0
                );

        }


        if (!Number.isFinite(balance)) {

            balance = 0;

        }


        cards[1].textContent =
            "₹" + balance.toFixed(2);


        console.log(
            "💰 Wallet balance:",
            balance
        );

    } catch (error) {

        console.error(
            "❌ Wallet loading error:",
            error
        );


        cards[1].textContent =
            "₹0.00";

    }

}


// ==========================================
// RATING
// ==========================================

function updateRating() {

    let totalRating = 0;

    let ratingCount = 0;


    rides.forEach(function (ride) {

        // New rating system uses userRating
        const rating =
            Number(
                ride.userRating
            );


        if (
            rating >= 1 &&
            rating <= 5
        ) {

            totalRating += rating;

            ratingCount++;

        }

    });


    let average = "0.0";


    if (ratingCount > 0) {

        average =
            (
                totalRating /
                ratingCount
            ).toFixed(1);

    }


    const cards =
        document.querySelectorAll(
            ".dash-card h2"
        );


    if (cards.length > 2) {

        cards[2].textContent =
            average;

    }

}


// ==========================================
// LATEST RIDE TRACKING
// ==========================================

function setupLatestRideTracking() {

    if (rides.length === 0) {
        return;
    }


    const activeRide =
        rides.find(function (ride) {

            return (
                ride.status === "assigned" ||
                ride.status === "accepted" ||
                ride.status === "ongoing"
            );

        });


    if (!activeRide) {
        return;
    }


    if (!activeRide.driverId) {

        console.log(
            "Driver not assigned yet."
        );

        return;
    }


    listenToDriverLocation(
        activeRide.driverId
    );

}


// ==========================================
// DRIVER LOCATION
// ==========================================

function listenToDriverLocation(driverId) {

    const map =
        document.getElementById(
            "map"
        );


    if (!map) {
        return;
    }


    if (driverLocationListener) {

        driverLocationListener();

        driverLocationListener = null;

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

                if (!snapshot.exists()) {

                    map.innerHTML = `

                        <div style="
                            height:100%;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            text-align:center;
                        ">
                            📍 Waiting for driver location...
                        </div>

                    `;

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
                    !Number.isFinite(latitude) ||
                    !Number.isFinite(longitude)
                ) {

                    return;

                }


                map.innerHTML = `

                    <div style="
                        height:100%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        flex-direction:column;
                        gap:10px;
                        background:#f5f5f5;
                        border-radius:10px;
                    ">

                        <div style="
                            font-size:50px;
                        ">
                            🚕
                        </div>

                        <strong>
                            Driver is on the way
                        </strong>

                        <small>
                            Latitude:
                            ${latitude.toFixed(6)}
                            <br>
                            Longitude:
                            ${longitude.toFixed(6)}
                        </small>

                    </div>

                `;

            },

            function (error) {

                console.error(
                    "❌ Driver location error:",
                    error
                );

            }
        );

}


// ==========================================
// TRACK RIDE
// ==========================================

window.trackRide =
    function (rideId) {

        const ride =
            rides.find(function (item) {

                return item.id === rideId;

            });


        if (!ride) {

            alert(
                "❌ Ride not found."
            );

            return;
        }


        if (ride.driverId) {

            listenToDriverLocation(
                ride.driverId
            );

        }


        const map =
            document.getElementById(
                "map"
            );


        if (map) {

            map.scrollIntoView({
                behavior: "smooth"
            });

        }

    };


// ==========================================
// PAY RIDE WITH WALLET
// ==========================================

window.payRideWithWallet =
    function (rideId) {

        if (!rideId) {

            alert(
                "❌ Ride ID missing."
            );

            return;
        }


        window.location.href =
            "wallet-payment.html?rideId=" +
            encodeURIComponent(
                rideId
            );

    };


// ==========================================
// VIEW RIDE
// ==========================================

window.viewRide =
    function (rideId) {

        const ride =
            rides.find(function (item) {

                return item.id === rideId;

            });


        if (!ride) {

            alert(
                "❌ Ride not found."
            );

            return;
        }


        alert(

            "🚖 Ride Details\n\n" +

            "Pickup: " +
            (ride.pickup || "-") +

            "\nDrop: " +
            (ride.drop || "-") +

            "\nFare: ₹" +
            (
                ride.finalFare ??
                ride.fare ??
                0
            ) +

            "\nPayment: " +
            (
                ride.payment ||
                "-"
            ) +

            "\nPayment Status: " +
            (
                ride.paymentStatus ||
                "pending"
            ) +

            "\nStatus: " +
            formatStatus(
                ride.status
            )

        );

    };


// ==========================================
// STATUS FORMAT
// ==========================================

function formatStatus(status) {

    const statuses = {

        pending:
            "Pending",

        searching:
            "Searching Driver",

        assigned:
            "Driver Assigned",

        accepted:
            "Driver Accepted",

        ongoing:
            "Ride Ongoing",

        completed:
            "Completed",

        cancelled:
            "Cancelled",

        rejected:
            "Rejected"

    };


    return (
        statuses[status] ||
        status ||
        "Unknown"
    );

}


// ==========================================
// STATUS CLASS
// ==========================================

function getStatusClass(status) {

    switch (status) {

        case "completed":
            return "completed";

        case "ongoing":
            return "ongoing";

        case "accepted":
            return "accepted";

        case "assigned":
            return "assigned";

        case "cancelled":
            return "cancelled";

        default:
            return "pending";

    }

}


// ==========================================
// FIREBASE TIMESTAMP
// ==========================================

function getTimestamp(value) {

    if (!value) {
        return 0;
    }


    if (
        typeof value.toMillis ===
        "function"
    ) {

        return value.toMillis();

    }


    if (
        typeof value.seconds ===
        "number"
    ) {

        return value.seconds * 1000;

    }


    const date =
        new Date(value);


    const time =
        date.getTime();


    return Number.isNaN(time)
        ? 0
        : time;

}


// ==========================================
// HTML SECURITY
// ==========================================

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(value ?? "");


    return div.innerHTML;

}


// ==========================================
// PAGE CLEANUP
// ==========================================

window.addEventListener(
    "beforeunload",
    function () {

        if (driverLocationListener) {

            driverLocationListener();

            driverLocationListener = null;

        }


        if (notificationListener) {

            notificationListener();

            notificationListener = null;

        }

    }
);