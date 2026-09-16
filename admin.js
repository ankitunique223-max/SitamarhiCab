// ==========================================================
// SITAMARHI CAB - ADMIN DASHBOARD
// REAL-TIME ADMIN PANEL
// ==========================================================

import {
    auth,
    db
} from "./firebase.js";

import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================================
// GLOBAL DATA
// ==========================================================

let allUsers = [];
let allDrivers = [];
let allRides = [];
let allReviews = [];

let currentAdmin = null;

let usersListener = null;
let ridesListener = null;
let reviewsListener = null;


// ==========================================================
// AUTH CHECK
// ==========================================================

auth.onAuthStateChanged(
    async function(user) {

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }

        try {

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );

            const userSnap =
                await getDoc(userRef);

            if (!userSnap.exists()) {

                alert(
                    "Admin profile not found."
                );

                await auth.signOut();

                window.location.href =
                    "login.html";

                return;
            }

            const profile =
                userSnap.data();

            if (profile.role !== "admin") {

                alert(
                    "Access denied. Admin only."
                );

                await auth.signOut();

                window.location.href =
                    "login.html";

                return;
            }

            currentAdmin = {
                uid: user.uid,
                ...profile
            };

            const adminName =
                document.getElementById(
                    "adminName"
                );

            if (adminName) {

                adminName.textContent =
                    profile.name ||
                    profile.email ||
                    "Administrator";
            }


            console.log(
                "✅ Admin authenticated:",
                user.uid
            );


            startRealtimeListeners();

        } catch (error) {

            console.error(
                "Admin authentication error:",
                error
            );

            alert(
                "Admin verification failed.\n\n" +
                error.message
            );

        }

    }
);


// ==========================================================
// START REALTIME LISTENERS
// ==========================================================

function startRealtimeListeners() {

    listenUsers();
    updateDashboardStats();

displayUsers();

displayDrivers();

displayPendingDrivers();
refreshAnalyticsIfReady();

    listenRides();
    updateDashboardStats();

displayRides();

    listenReviews();
    displayReviews();
    refreshAnalyticsIfReady();

    loadPendingDrivers();

}


// ==========================================================
// USERS
// ==========================================================

function listenUsers() {

    if (usersListener) {

        usersListener();

        usersListener = null;
    }


    usersListener =
        onSnapshot(
            collection(
                db,
                "users"
            ),

            function(snapshot) {

                allUsers = [];

                allDrivers = [];


                snapshot.forEach(
                    function(userDoc) {

                        const data =
                            userDoc.data();

                        const item = {

                            id:
                                userDoc.id,

                            ...data

                        };


                        if (
                            data.role ===
                            "driver"
                        ) {

                            allDrivers.push(
                                item
                            );

                        } else if (
                            data.role ===
                            "user"
                        ) {

                            allUsers.push(
                                item
                            );

                        }

                    }
                );


                updateDashboardStats();

                displayUsers();

                displayDrivers();

                displayPendingDrivers();

            },

            function(error) {

                console.error(
                    "Users listener error:",
                    error
                );

            }
        );

}


// ==========================================================
// RIDES
// ==========================================================

function listenRides() {

    if (ridesListener) {

        ridesListener();

        ridesListener = null;
    }


    ridesListener =
        onSnapshot(
            collection(
                db,
                "rides"
            ),

            function(snapshot) {

                allRides = [];


                snapshot.forEach(
                    function(rideDoc) {

                        allRides.push({

                            id:
                                rideDoc.id,

                            ...rideDoc.data()

                        });

                    }
                );


                allRides.sort(
                    function(a, b) {

                        return (
                            getTime(
                                b.createdAt
                            ) -
                            getTime(
                                a.createdAt
                            )
                        );

                    }
                );


                updateDashboardStats();

                displayRides();

            },

            function(error) {

                console.error(
                    "Rides listener error:",
                    error
                );

            }
        );

}


// ==========================================================
// REVIEWS
// ==========================================================

function listenReviews() {

    if (reviewsListener) {

        reviewsListener();

        reviewsListener = null;
    }


    reviewsListener =
        onSnapshot(
            collection(
                db,
                "ratings"
            ),

            function(snapshot) {

                allReviews = [];


                snapshot.forEach(
                    function(reviewDoc) {

                        allReviews.push({

                            id:
                                reviewDoc.id,

                            ...reviewDoc.data()

                        });

                    }
                );


                allReviews.sort(
                    function(a, b) {

                        return (
                            getTime(
                                b.createdAt
                            ) -
                            getTime(
                                a.createdAt
                            )
                        );

                    }
                );


                displayReviews();

            },

            function(error) {

                console.error(
                    "Reviews listener error:",
                    error
                );

                const reviewList =
                    document.getElementById(
                        "reviewList"
                    );

                if (reviewList) {

                    reviewList.innerHTML =
                        `
                        <div class="empty">
                            Reviews unavailable.
                        </div>
                        `;
                }

            }
        );

}


// ==========================================================
// DASHBOARD STATS
// ==========================================================

function updateDashboardStats() {

    const totalUsers =
        allUsers.length;


    const totalDrivers =
        allDrivers.length;


    const onlineDrivers =
        allDrivers.filter(
            function(driver) {

                return (
                    driver.online === true
                );

            }
        ).length;


    const totalRides =
        allRides.length;


    const activeRides =
        allRides.filter(
            function(ride) {

                return (
                    ride.status ===
                        "assigned" ||

                    ride.status ===
                        "accepted" ||

                    ride.status ===
                        "ongoing"
                );

            }
        ).length;


    const pendingDrivers =
        allDrivers.filter(
            function(driver) {

                return (
                    driver.status ===
                    "pending"
                );

            }
        ).length;


    let revenue = 0;

    let paidCount = 0;


    allRides.forEach(
        function(ride) {

            const status =
                ride.status;


            const paymentStatus =
                String(
                    ride.paymentStatus ||
                    ""
                ).toLowerCase();


            if (
                status === "completed"
            ) {

                const amount =
                    Number(
                        ride.finalFare ||
                        ride.fare ||
                        0
                    );

                revenue += amount;


                if (
                    paymentStatus ===
                    "paid"
                ) {

                    paidCount++;

                }

            }

        }
    );


    setText(
        "totalUsers",
        totalUsers
    );

    setText(
        "totalDrivers",
        totalDrivers
    );

    setText(
        "onlineDrivers",
        onlineDrivers
    );

    setText(
        "totalRides",
        totalRides
    );

    setText(
        "activeRides",
        activeRides
    );

    setText(
        "pendingDrivers",
        pendingDrivers
    );

    setText(
        "totalRevenue",
        "₹" +
        formatNumber(revenue)
    );

    setText(
        "paidRides",
        paidCount
    );

}


// ==========================================================
// PENDING DRIVERS
// ==========================================================

async function loadPendingDrivers() {

    try {

        const q =
            query(
                collection(
                    db,
                    "users"
                ),

                where(
                    "role",
                    "==",
                    "driver"
                ),

                where(
                    "status",
                    "==",
                    "pending"
                )
            );


        const snapshot =
            await getDocs(q);


        const list = [];


        snapshot.forEach(
            function(driverDoc) {

                list.push({

                    id:
                        driverDoc.id,

                    ...driverDoc.data()

                });

            }
        );


        displayPendingDrivers(
            list
        );


    } catch (error) {

        console.error(
            "Pending drivers error:",
            error
        );

    }

}


// ==========================================================
// DISPLAY PENDING DRIVERS
// ==========================================================

function displayPendingDrivers(
    pendingData = null
) {

    const container =
        document.getElementById(
            "pendingDriverList"
        );


    if (!container) {
        return;
    }


    const pending =
        pendingData ||
        allDrivers.filter(
            function(driver) {

                return (
                    driver.status ===
                    "pending"
                );

            }
        );


    if (pending.length === 0) {

        container.innerHTML =
            `
            <div class="empty">
                ✅ No pending driver approvals.
            </div>
            `;

        return;
    }


    container.innerHTML = "";


    pending.forEach(
        function(driver) {

            container.innerHTML +=
                `
                <div class="item-card">

                    <h3>
                        👨‍✈️
                        ${escapeHTML(
                            driver.name ||
                            "Unknown Driver"
                        )}
                    </h3>

                    <p>
                        <strong>Email:</strong>
                        ${escapeHTML(
                            driver.email ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Phone:</strong>
                        ${escapeHTML(
                            driver.phone ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Vehicle:</strong>
                        ${escapeHTML(
                            driver.vehicle ||
                            driver.vehicleType ||
                            "-"
                        )}
                    </p>

                    <span class="status status-pending">
                        PENDING
                    </span>

                    <br>

                    <button
                        class="btn approve-btn"
                        onclick="
                            approveDriver(
                                '${driver.id}'
                            )
                        "
                    >
                        ✅ Approve
                    </button>

                    <button
                        class="btn reject-btn"
                        onclick="
                            rejectDriver(
                                '${driver.id}'
                            )
                        "
                    >
                        ❌ Reject
                    </button>

                </div>
                `;

        }
    );

}


// ==========================================================
// APPROVE DRIVER
// ==========================================================

window.approveDriver =
    async function(driverId) {

        try {

            await updateDoc(
                doc(
                    db,
                    "users",
                    driverId
                ),

                {
                    status:
                        "approved",

                    online:
                        false,

                    approvedAt:
                        new Date()
                }
            );


            showMessage(
                "✅ Driver approved successfully!"
            );


        } catch (error) {

            console.error(
                "Approve driver error:",
                error
            );

            alert(
                "Unable to approve driver.\n\n" +
                error.message
            );

        }

    };


// ==========================================================
// REJECT DRIVER
// ==========================================================

window.rejectDriver =
    async function(driverId) {

        const confirmed =
            confirm(
                "Are you sure you want to reject this driver?"
            );


        if (!confirmed) {
            return;
        }


        try {

            await updateDoc(
                doc(
                    db,
                    "users",
                    driverId
                ),

                {
                    status:
                        "rejected",

                    online:
                        false
                }
            );


            showMessage(
                "❌ Driver rejected."
            );


        } catch (error) {

            console.error(
                "Reject driver error:",
                error
            );

            alert(
                error.message
            );

        }

    };


// ==========================================================
// DISPLAY ALL DRIVERS
// ==========================================================

function displayDrivers() {

    const container =
        document.getElementById(
            "allDriverList"
        );


    if (!container) {
        return;
    }


    if (allDrivers.length === 0) {

        container.innerHTML =
            `
            <div class="empty">
                No drivers found.
            </div>
            `;

        return;
    }


    container.innerHTML = "";


    allDrivers.forEach(
        function(driver) {

            const status =
                driver.status ||
                "unknown";


            const onlineText =
                driver.online === true
                    ? "🟢 Online"
                    : "🔴 Offline";


            container.innerHTML +=
                `
                <div class="item-card">

                    <h3>
                        🚕
                        ${escapeHTML(
                            driver.name ||
                            "Driver"
                        )}
                    </h3>

                    <p>
                        <strong>Phone:</strong>
                        ${escapeHTML(
                            driver.phone ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Email:</strong>
                        ${escapeHTML(
                            driver.email ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${escapeHTML(
                            status
                        )}
                    </p>

                    <p>
                        <strong>Availability:</strong>
                        ${onlineText}
                    </p>

                    <p>
                        <strong>Vehicle:</strong>
                        ${escapeHTML(
                            driver.vehicle ||
                            driver.vehicleType ||
                            "-"
                        )}
                    </p>

                </div>
                `;

        }
    );

}


// ==========================================================
// DISPLAY USERS
// ==========================================================

function displayUsers() {

    const container =
        document.getElementById(
            "userList"
        );


    if (!container) {
        return;
    }


    if (allUsers.length === 0) {

        container.innerHTML =
            `
            <div class="empty">
                No registered users found.
            </div>
            `;

        return;
    }


    container.innerHTML = "";


    allUsers.forEach(
        function(user) {

            container.innerHTML +=
                `
                <div class="item-card">

                    <h3>
                        👤
                        ${escapeHTML(
                            user.name ||
                            "User"
                        )}
                    </h3>

                    <p>
                        <strong>Email:</strong>
                        ${escapeHTML(
                            user.email ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Phone:</strong>
                        ${escapeHTML(
                            user.phone ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Role:</strong>
                        ${escapeHTML(
                            user.role ||
                            "user"
                        )}
                    </p>

                </div>
                `;

        }
    );

}


// ==========================================================
// DISPLAY RIDES
// ==========================================================

function displayRides() {

    const container =
        document.getElementById(
            "rideManagement"
        );


    if (!container) {
        return;
    }


    if (allRides.length === 0) {

        container.innerHTML =
            `
            <div class="empty">
                🚗 No rides available.
            </div>
            `;

        return;
    }


    container.innerHTML = "";


    allRides.forEach(
        function(ride) {

            const status =
                ride.status ||
                "pending";


            const fare =
                Number(
                    ride.finalFare ||
                    ride.fare ||
                    0
                );


            const assignedDriver =
                allDrivers.find(
                    function(driver) {

                        return (
                            driver.id ===
                            ride.driverId
                        );

                    }
                );


            const driverName =
                assignedDriver
                    ? assignedDriver.name
                    : "Not Assigned";


            container.innerHTML +=
                `
                <div class="item-card">

                    <h3>
                        🚖 Ride
                    </h3>

                    <p>
                        <strong>Pickup:</strong><br>
                        ${escapeHTML(
                            ride.pickup ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Drop:</strong><br>
                        ${escapeHTML(
                            ride.drop ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Vehicle:</strong>
                        ${escapeHTML(
                            ride.vehicle ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Fare:</strong>
                        ₹${fare}
                    </p>

                    <p>
                        <strong>Driver:</strong>
                        ${escapeHTML(
                            driverName
                        )}
                    </p>

                    <p>
                        <strong>Payment:</strong>
                        ${escapeHTML(
                            ride.payment ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Payment Status:</strong>
                        ${escapeHTML(
                            ride.paymentStatus ||
                            "pending"
                        )}
                    </p>

                    <p>
                        <strong>Status:</strong>

                        <span class="
                            status
                            ${getStatusClass(
                                status
                            )}
                        ">
                            ${escapeHTML(
                                status
                                    .toUpperCase()
                            )}
                        </span>

                    </p>


                    ${
                        status ===
                            "pending" ||

                        status ===
                            "assigned"
                            ?

                            createDriverSelector(
                                ride
                            )

                            :

                            ""
                    }

                </div>
                `;

        }
    );

}


// ==========================================================
// DRIVER SELECTOR
// ==========================================================

function createDriverSelector(
    ride
) {

    const availableDrivers =
        allDrivers.filter(
            function(driver) {

                return (
                    driver.status ===
                    "approved"
                );

            }
        );


    if (
        availableDrivers.length === 0
    ) {

        return `
            <p>
                ⚠️ No approved drivers available.
            </p>
        `;

    }


    let options =
        `<option value="">
            Select Driver
        </option>`;


    availableDrivers.forEach(
        function(driver) {

            const selected =
                driver.id ===
                ride.driverId
                    ? "selected"
                    : "";


            options +=
                `
                <option
                    value="${driver.id}"
                    ${selected}
                >
                    ${escapeHTML(
                        driver.name ||
                        driver.email ||
                        "Driver"
                    )}
                    ${
                        driver.online === true
                            ? " 🟢"
                            : " 🔴"
                    }
                </option>
                `;

        }
    );


    return `
        <select
            id="driver-${ride.id}"
        >
            ${options}
        </select>

        <button
            class="btn assign-btn"
            onclick="
                assignDriver(
                    '${ride.id}'
                )
            "
        >
            🚕 Assign Driver
        </button>
    `;

}


// ==========================================================
// ASSIGN DRIVER
// ==========================================================

window.assignDriver =
    async function(rideId) {

        try {

            const select =
                document.getElementById(
                    "driver-" +
                    rideId
                );


            if (!select) {
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
                    function(item) {

                        return (
                            item.id ===
                            driverId
                        );

                    }
                );


            if (!driver) {

                alert(
                    "Driver not found."
                );

                return;
            }


            if (
                driver.status !==
                "approved"
            ) {

                alert(
                    "Driver is not approved."
                );

                return;
            }


            await updateDoc(
                doc(
                    db,
                    "rides",
                    rideId
                ),

                {
                    driverId:
                        driverId,

                    status:
                        "assigned",

                    assignedAt:
                        new Date()
                }
            );


            showMessage(
                "🚕 Driver assigned successfully!"
            );


        } catch (error) {

            console.error(
                "Assign driver error:",
                error
            );

            alert(
                "Unable to assign driver.\n\n" +
                error.message
            );

        }

    };


// ==========================================================
// REVIEWS
// ==========================================================

function displayReviews() {

    const container =
        document.getElementById(
            "reviewList"
        );


    if (!container) {
        return;
    }


    if (allReviews.length === 0) {

        container.innerHTML =
            `
            <div class="empty">
                ⭐ No reviews yet.
            </div>
            `;

        return;
    }


    container.innerHTML = "";


    allReviews.forEach(
        function(review) {

            const stars =
                "⭐".repeat(
                    Number(
                        review.rating
                    ) || 0
                );


            const driver =
                allDrivers.find(
                    function(item) {

                        return (
                            item.id ===
                            review.driverId
                        );

                    }
                );


            const driverName =
                driver
                    ? driver.name
                    : "Driver";


            container.innerHTML +=
                `
                <div class="item-card">

                    <h3>
                        ${stars}
                    </h3>

                    <p>
                        <strong>Driver:</strong>
                        ${escapeHTML(
                            driverName
                        )}
                    </p>

                    <p>
                        <strong>Rating:</strong>
                        ${escapeHTML(
                            review.rating ||
                            "-"
                        )}/5
                    </p>

                    <p>
                        <strong>Review:</strong><br>
                        ${escapeHTML(
                            review.review ||
                            "No written review."
                        )}
                    </p>

                    <p>
                        <strong>Ride:</strong>
                        ${escapeHTML(
                            review.rideId ||
                            "-"
                        )}
                    </p>

                </div>
                `;

        }
    );

}


// ==========================================================
// STATUS CLASS
// ==========================================================

function getStatusClass(
    status
) {

    switch (
        String(status)
            .toLowerCase()
    ) {

        case "pending":
            return "status-pending";

        case "assigned":
            return "status-assigned";

        case "accepted":
            return "status-accepted";

        case "ongoing":
            return "status-ongoing";

        case "completed":
            return "status-completed";

        case "cancelled":
            return "status-cancelled";

        default:
            return "status-pending";

    }

}


// ==========================================================
// SCROLL
// ==========================================================

window.scrollToSection =
    function(sectionId) {

        const element =
            document.getElementById(
                sectionId
            );


        if (element) {

            element.scrollIntoView({
                behavior:
                    "smooth"
            });

        }

    };


// ==========================================================
// HELPERS
// ==========================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


function getTime(
    timestamp
) {

    if (!timestamp) {
        return 0;
    }


    try {

        if (
            typeof timestamp.toMillis ===
            "function"
        ) {

            return timestamp.toMillis();

        }


        if (
            typeof timestamp.toDate ===
            "function"
        ) {

            return timestamp.toDate()
                .getTime();

        }


        const date =
            new Date(timestamp);


        return date.getTime() ||
            0;

    } catch {

        return 0;

    }

}


function formatNumber(
    number
) {

    return Number(
        number || 0
    ).toLocaleString(
        "en-IN"
    );

}


function escapeHTML(
    value
) {

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


function showMessage(
    message
) {

    const element =
        document.getElementById(
            "adminMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.style.display =
        "block";


    setTimeout(
        function() {

            element.style.display =
                "none";

        },

        3000
    );

}


// ==========================================================
// CLEANUP
// ==========================================================

window.addEventListener(
    "beforeunload",
    function() {

        if (usersListener) {

            usersListener();

            usersListener =
                null;

        }


        if (ridesListener) {

            ridesListener();

            ridesListener =
                null;

        }


        if (reviewsListener) {

            reviewsListener();

            reviewsListener =
                null;

        }

    }
);


// ==========================================================
// DEBUG
// ==========================================================

console.log(
    "🚖 SitamarhiCab Admin Dashboard loaded."
);
// ==========================================================
// ADVANCED ANALYTICS
// ==========================================================

let rideStatusChartInstance = null;
let vehicleRevenueChartInstance = null;
let monthlyRevenueChartInstance = null;
let ratingChartInstance = null;


// ==========================================================
// MAIN ANALYTICS FUNCTION
// ==========================================================

window.renderAnalytics = function () {

    try {

        updateAnalyticsSummary();

        renderRideStatusChart();

        renderVehicleRevenueChart();

        renderMonthlyRevenueChart();

        renderRatingChart();

        console.log(
            "📊 Analytics rendered successfully."
        );

    } catch (error) {

        console.error(
            "Analytics rendering error:",
            error
        );

    }

};


// ==========================================================
// ANALYTICS SUMMARY
// ==========================================================

function updateAnalyticsSummary() {

    const completed =
        allRides.filter(
            function (ride) {

                return ride.status === "completed";

            }
        ).length;


    const cancelled =
        allRides.filter(
            function (ride) {

                return ride.status === "cancelled";

            }
        ).length;


    const pending =
        allRides.filter(
            function (ride) {

                return ride.status === "pending";

            }
        ).length;


    let ratingTotal = 0;

    let ratingCount = 0;


    allReviews.forEach(
        function (review) {

            const rating =
                Number(
                    review.rating
                );


            if (
                rating >= 1 &&
                rating <= 5
            ) {

                ratingTotal += rating;

                ratingCount++;

            }

        }
    );


    const averageRating =
        ratingCount > 0
            ? (
                ratingTotal /
                ratingCount
            ).toFixed(1)
            : "0.0";


    setText(
        "completedRides",
        completed
    );


    setText(
        "cancelledRides",
        cancelled
    );


    setText(
        "pendingRides",
        pending
    );


    setText(
        "averageRating",
        averageRating
    );

}


// ==========================================================
// RIDE STATUS CHART
// ==========================================================

function renderRideStatusChart() {

    const canvas =
        document.getElementById(
            "rideStatusChart"
        );


    if (!canvas) {

        return;

    }


    const pending =
        allRides.filter(
            r =>
                r.status === "pending"
        ).length;


    const assigned =
        allRides.filter(
            r =>
                r.status === "assigned"
        ).length;


    const accepted =
        allRides.filter(
            r =>
                r.status === "accepted"
        ).length;


    const ongoing =
        allRides.filter(
            r =>
                r.status === "ongoing"
        ).length;


    const completed =
        allRides.filter(
            r =>
                r.status === "completed"
        ).length;


    const cancelled =
        allRides.filter(
            r =>
                r.status === "cancelled"
        ).length;


    if (
        rideStatusChartInstance
    ) {

        rideStatusChartInstance.destroy();

    }


    rideStatusChartInstance =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "Pending",
                        "Assigned",
                        "Accepted",
                        "Ongoing",
                        "Completed",
                        "Cancelled"
                    ],

                    datasets: [

                        {

                            data: [
                                pending,
                                assigned,
                                accepted,
                                ongoing,
                                completed,
                                cancelled
                            ]

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position: "bottom"

                        }

                    }

                }

            }
        );

}


// ==========================================================
// VEHICLE REVENUE
// ==========================================================

function renderVehicleRevenueChart() {

    const canvas =
        document.getElementById(
            "vehicleRevenueChart"
        );


    if (!canvas) {

        return;

    }


    const revenueMap = {};


    allRides.forEach(
        function (ride) {

            if (
                ride.status !==
                "completed"
            ) {

                return;

            }


            const vehicle =
                ride.vehicle ||
                "Unknown";


            const fare =
                Number(
                    ride.finalFare ||
                    ride.fare ||
                    0
                );


            if (
                !revenueMap[vehicle]
            ) {

                revenueMap[vehicle] = 0;

            }


            revenueMap[vehicle] += fare;

        }
    );


    const labels =
        Object.keys(
            revenueMap
        );


    const values =
        labels.map(
            function (vehicle) {

                return revenueMap[
                    vehicle
                ];

            }
        );


    if (
        vehicleRevenueChartInstance
    ) {

        vehicleRevenueChartInstance.destroy();

    }


    vehicleRevenueChartInstance =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Revenue (₹)",

                            data: values

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true

                        }

                    }

                }

            }
        );

}


// ==========================================================
// MONTHLY REVENUE
// ==========================================================

function renderMonthlyRevenueChart() {

    const canvas =
        document.getElementById(
            "monthlyRevenueChart"
        );


    if (!canvas) {

        return;

    }


    const monthlyRevenue = {};


    allRides.forEach(
        function (ride) {

            if (
                ride.status !==
                "completed"
            ) {

                return;

            }


            const amount =
                Number(
                    ride.finalFare ||
                    ride.fare ||
                    0
                );


            const date =
                getRideDate(
                    ride
                );


            if (!date) {

                return;

            }


            const key =
                date.getFullYear() +
                "-" +
                String(
                    date.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                );


            if (
                !monthlyRevenue[key]
            ) {

                monthlyRevenue[key] =
                    0;

            }


            monthlyRevenue[key] +=
                amount;

        }
    );


    const labels =
        Object.keys(
            monthlyRevenue
        ).sort();


    const values =
        labels.map(
            function (month) {

                return monthlyRevenue[
                    month
                ];

            }
        );


    const formattedLabels =
        labels.map(
            function (month) {

                const parts =
                    month.split("-");

                return (
                    parts[0] +
                    "/" +
                    parts[1]
                );

            }
        );


    if (
        monthlyRevenueChartInstance
    ) {

        monthlyRevenueChartInstance.destroy();

    }


    monthlyRevenueChartInstance =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels:
                        formattedLabels,

                    datasets: [

                        {

                            label:
                                "Revenue (₹)",

                            data: values,

                            fill: false,

                            tension: 0.3

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true

                        }

                    }

                }

            }
        );

}


// ==========================================================
// RATING DISTRIBUTION
// ==========================================================

function renderRatingChart() {

    const canvas =
        document.getElementById(
            "ratingChart"
        );


    if (!canvas) {

        return;

    }


    const ratingCounts = {

        1: 0,

        2: 0,

        3: 0,

        4: 0,

        5: 0

    };


    allReviews.forEach(
        function (review) {

            const rating =
                Number(
                    review.rating
                );


            if (
                ratingCounts[
                    rating
                ] !== undefined
            ) {

                ratingCounts[
                    rating
                ]++;

            }

        }
    );


    if (
        ratingChartInstance
    ) {

        ratingChartInstance.destroy();

    }


    ratingChartInstance =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels: [
                        "1 Star",
                        "2 Stars",
                        "3 Stars",
                        "4 Stars",
                        "5 Stars"
                    ],

                    datasets: [

                        {

                            label:
                                "Reviews",

                            data: [
                                ratingCounts[1],
                                ratingCounts[2],
                                ratingCounts[3],
                                ratingCounts[4],
                                ratingCounts[5]
                            ]

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                precision: 0

                            }

                        }

                    }

                }

            }
        );

}


// ==========================================================
// GET RIDE DATE
// ==========================================================

function getRideDate(ride) {

    if (
        ride.createdAt &&
        typeof ride.createdAt.toDate ===
        "function"
    ) {

        return ride.createdAt.toDate();

    }


    if (
        ride.createdAt &&
        typeof ride.createdAt.toMillis ===
        "function"
    ) {

        return new Date(
            ride.createdAt.toMillis()
        );

    }


    if (ride.date) {

        const parsed =
            new Date(
                ride.date
            );


        if (
            !isNaN(
                parsed.getTime()
            )
        ) {

            return parsed;

        }

    }


    return null;

}


// ==========================================================
// AUTO REFRESH ANALYTICS WHEN DATA CHANGES
// ==========================================================

function refreshAnalyticsIfReady() {

    if (
        typeof window.renderAnalytics ===
        "function"
    ) {

        window.renderAnalytics();

    }

}