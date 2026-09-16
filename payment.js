import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// =====================================================
// CONFIG
// =====================================================

const RAZORPAY_KEY_ID = "rzp_test_Ta3DcEprJki8XB";

const BACKEND_URL = "http://127.0.0.1:3000";


// =====================================================
// HTML ELEMENTS
// =====================================================

const rideIdElement = document.getElementById("rideId");
const vehicleElement = document.getElementById("vehicle");
const amountElement = document.getElementById("amount");
const payButton = document.getElementById("payButton");
const messageElement = document.getElementById("message");


// =====================================================
// GET RIDE ID FROM URL
// =====================================================

const urlParams = new URLSearchParams(window.location.search);

const rideId = urlParams.get("rideId");


console.log("=================================");
console.log("🚕 SitamarhiCab Payment");
console.log("=================================");

console.log("Ride ID:", rideId);
console.log("Backend:", BACKEND_URL);
console.log("Razorpay Key:", RAZORPAY_KEY_ID);


// =====================================================
// BASIC CHECK
// =====================================================

if (!rideId) {

    showError("Ride ID is missing.");

    payButton.disabled = true;

}


// =====================================================
// MESSAGE FUNCTIONS
// =====================================================

function showMessage(text) {

    messageElement.textContent = text;

    messageElement.className = "message loading";

}


function showSuccess(text) {

    messageElement.textContent = text;

    messageElement.className = "message success";

}


function showError(text) {

    console.error(text);

    messageElement.textContent = text;

    messageElement.className = "message error";

}


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(auth, async (user) => {

    console.log("Auth user:", user);

    if (!user) {

        showError("Please login first.");

        payButton.disabled = true;

        return;

    }


    if (!rideId) {

        return;

    }


    await loadRide(user);

});


// =====================================================
// LOAD RIDE
// =====================================================

async function loadRide(user) {

    try {

        showMessage("Loading ride...");

        const rideRef = doc(db, "rides", rideId);

        const rideSnap = await getDoc(rideRef);


        if (!rideSnap.exists()) {

            showError("Ride not found.");

            return;

        }


        const ride = rideSnap.data();

        console.log("Ride data:", ride);


        // -------------------------------------------------
        // SECURITY CHECK
        // -------------------------------------------------

        if (ride.userId !== user.uid) {

            showError("You are not authorized to pay for this ride.");

            return;

        }


        // -------------------------------------------------
        // RIDE INFORMATION
        // -------------------------------------------------

        rideIdElement.textContent = rideId;

        vehicleElement.textContent = ride.vehicle || "Cab";


        const fare = Number(ride.fare || 0);


        if (!Number.isFinite(fare) || fare <= 0) {

            showError("Invalid ride fare.");

            return;

        }


        amountElement.textContent = fare;


        // -------------------------------------------------
        // PAYMENT STATUS
        // -------------------------------------------------

        if (ride.paymentStatus === "paid") {

            showSuccess("Payment already completed.");

            payButton.textContent = "Payment Completed";

            payButton.disabled = true;

            return;

        }


        // -------------------------------------------------
        // PAYMENT BUTTON
        // -------------------------------------------------

        payButton.textContent = `Pay ₹${fare}`;

        payButton.disabled = false;


        payButton.onclick = () => {

            startPayment(fare, user);

        };


        showMessage("Ready for secure test payment.");

        messageElement.className = "message";


    } catch (error) {

        console.error("LOAD RIDE ERROR:", error);

        showError(
            error?.message || "Failed to load ride."
        );

    }

}


// =====================================================
// START PAYMENT
// =====================================================

async function startPayment(fare, user) {

    try {

        payButton.disabled = true;

        payButton.textContent = "Creating Order...";

        showMessage("Creating Razorpay test order...");


        console.log("=================================");
        console.log("📦 CREATE ORDER REQUEST");
        console.log("=================================");

        console.log("Amount:", fare);

        console.log("Ride ID:", rideId);

        console.log(
            "URL:",
            `${BACKEND_URL}/create-order`
        );


        // =================================================
        // CREATE ORDER
        // =================================================

        const response = await fetch(
            `${BACKEND_URL}/create-order`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    amount: fare,

                    rideId: rideId

                })

            }
        );


        console.log(
            "Create order HTTP status:",
            response.status
        );


        let data;

        try {

            data = await response.json();

        } catch {

            throw new Error(
                "Backend returned invalid response."
            );

        }


        console.log("Create order response:", data);


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Order creation failed."
            );

        }


        if (!data.orderId) {

            throw new Error(
                "Razorpay Order ID missing."
            );

        }


        console.log(
            "✅ Razorpay Order:",
            data.orderId
        );


        // =================================================
        // OPEN RAZORPAY
        // =================================================

        openRazorpayCheckout(
            fare,
            data,
            user
        );


    } catch (error) {

        console.error(
            "❌ CREATE ORDER ERROR:",
            error
        );


        showError(
            error?.message ||
            "Order creation failed."
        );


        payButton.disabled = false;

        payButton.textContent = `Pay ₹${fare}`;

    }

}


// =====================================================
// RAZORPAY CHECKOUT
// =====================================================

function openRazorpayCheckout(
    fare,
    order,
    user
) {

    console.log("Opening Razorpay Checkout...");


    const options = {

        key: RAZORPAY_KEY_ID,

        amount: order.amount,

        currency: "INR",

        name: "SitamarhiCab",

        description: `Ride Payment - ${rideId}`,

        order_id: order.orderId,


        handler: async function (response) {

            console.log(
                "================================="
            );

            console.log(
                "💳 PAYMENT SUCCESS"
            );

            console.log(
                "================================="
            );

            console.log(response);


            await verifyPayment(
                response,
                fare,
                user
            );

        },


        prefill: {

            name: user.displayName || "",

            email: user.email || ""

        },


        notes: {

            rideId: rideId

        },


        theme: {

            color: "#f5b400"

        },


        modal: {

            ondismiss: function () {

                console.log(
                    "Razorpay checkout closed."
                );


                showMessage(
                    "Payment window closed."
                );


                payButton.disabled = false;

                payButton.textContent =
                    `Pay ₹${fare}`;

            }

        }

    };


    const razorpay = new Razorpay(options);


    razorpay.on(
        "payment.failed",
        function (response) {

            console.error(
                "❌ PAYMENT FAILED:",
                response
            );


            showError(
                response?.error?.description ||
                "Payment failed."
            );


            payButton.disabled = false;

            payButton.textContent =
                `Pay ₹${fare}`;

        }
    );


    razorpay.open();

}


// =====================================================
// VERIFY PAYMENT
// =====================================================

async function verifyPayment(
    response,
    fare,
    user
) {

    try {

        showMessage(
            "Verifying payment..."
        );


        const verificationResponse =
            await fetch(
                `${BACKEND_URL}/verify-payment`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        razorpay_order_id:
                            response.razorpay_order_id,

                        razorpay_payment_id:
                            response.razorpay_payment_id,

                        razorpay_signature:
                            response.razorpay_signature

                    })

                }
            );


        const result =
            await verificationResponse.json();


        console.log(
            "Verify response:",
            result
        );


        if (
            !verificationResponse.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Payment verification failed."
            );

        }


        // =================================================
        // UPDATE FIRESTORE
        // =================================================

        const rideRef =
            doc(db, "rides", rideId);


        await updateDoc(
            rideRef,
            {

                payment: "Online",

                paymentStatus: "paid",

                razorpayOrderId:
                    response.razorpay_order_id,

                razorpayPaymentId:
                    response.razorpay_payment_id,

                paidAt:
                    new Date()

            }
        );


        console.log(
            "✅ FIRESTORE PAYMENT UPDATED"
        );


        // =================================================
        // SUCCESS
        // =================================================

        showSuccess(
            "Payment successful! 🎉"
        );


        payButton.textContent =
            "Payment Completed";

        payButton.disabled = true;


        // Redirect after 2 seconds

        setTimeout(() => {

            window.location.href =
                `ride-history.html`;

        }, 2000);


    } catch (error) {

        console.error(
            "❌ VERIFY PAYMENT ERROR:",
            error
        );


        showError(
            error?.message ||
            "Payment verification failed."
        );


        payButton.disabled = false;

        payButton.textContent =
            `Pay ₹${fare}`;

    }

}