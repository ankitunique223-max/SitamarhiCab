// =====================================================
// SITAMARHI CAB
// WALLET RIDE PAYMENT
// =====================================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc,
    runTransaction,
    collection,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// =====================================================
// GLOBAL
// =====================================================

let currentUser = null;

let currentRide = null;

let walletBalance = 0;

let rideId = null;


// =====================================================
// ELEMENTS
// =====================================================

const walletBalanceElement =
    document.getElementById(
        "walletBalance"
    );

const rideIdElement =
    document.getElementById(
        "rideId"
    );

const vehicleElement =
    document.getElementById(
        "vehicle"
    );

const pickupElement =
    document.getElementById(
        "pickup"
    );

const dropElement =
    document.getElementById(
        "drop"
    );

const fareElement =
    document.getElementById(
        "fare"
    );

const payButton =
    document.getElementById(
        "payButton"
    );

const messageElement =
    document.getElementById(
        "message"
    );


// =====================================================
// RIDE ID
// =====================================================

const params =
    new URLSearchParams(
        window.location.search
    );

rideId =
    params.get("rideId");


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
    message,
    type
) {

    if (!messageElement) {
        return;
    }

    messageElement.textContent =
        message;

    messageElement.className =
        "message " + type;
}


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(
    auth,
    async function(user) {

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }

        currentUser =
            user;


        if (!rideId) {

            showMessage(
                "Ride ID is missing.",
                "error"
            );

            return;
        }


        try {

            await loadRide();

            await loadWallet();

        } catch (error) {

            console.error(
                "❌ Wallet payment initialization:",
                error
            );

            showMessage(
                error.message ||
                "Unable to load payment.",
                "error"
            );
        }

    }
);


// =====================================================
// LOAD RIDE
// =====================================================

async function loadRide() {

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


    if (!rideSnapshot.exists()) {

        throw new Error(
            "Ride not found."
        );
    }


    const ride =
        rideSnapshot.data();


    // Security
    if (
        ride.userId !==
        currentUser.uid
    ) {

        throw new Error(
            "You are not allowed to pay for this ride."
        );
    }


    currentRide = {
        id: rideId,
        ...ride
    };


    const fare =
        Number(
            ride.finalFare ??
            ride.fare ??
            0
        );


    if (
        !Number.isFinite(fare) ||
        fare <= 0
    ) {

        throw new Error(
            "Invalid ride fare."
        );
    }


    if (rideIdElement) {

        rideIdElement.textContent =
            rideId;
    }


    if (vehicleElement) {

        vehicleElement.textContent =
            ride.vehicle ||
            "N/A";
    }


    if (pickupElement) {

        pickupElement.textContent =
            ride.pickup ||
            "-";
    }


    if (dropElement) {

        dropElement.textContent =
            ride.drop ||
            "-";
    }


    if (fareElement) {

        fareElement.textContent =
            fare.toFixed(2);
    }


    // Already paid
    if (
        ride.paymentStatus ===
        "paid"
    ) {

        payButton.disabled =
            true;

        payButton.textContent =
            "Already Paid";

        showMessage(
            "This ride has already been paid.",
            "success"
        );

        return;
    }


    // Only completed ride
    if (
        ride.status !==
        "completed"
    ) {

        payButton.disabled =
            true;

        payButton.textContent =
            "Ride Not Completed";

        showMessage(
            "Wallet payment is available after ride completion.",
            "error"
        );

        return;
    }


    payButton.disabled =
        false;

    payButton.textContent =
        "Pay ₹" +
        fare.toFixed(2);
}


// =====================================================
// LOAD WALLET
// =====================================================

async function loadWallet() {

    const walletRef =
        doc(
            db,
            "wallet",
            currentUser.uid
        );


    const walletSnapshot =
        await getDoc(
            walletRef
        );


    if (!walletSnapshot.exists()) {

        walletBalance =
            0;

    } else {

        const data =
            walletSnapshot.data();

        walletBalance =
            Number(
                data.balance || 0
            );
    }


    updateWalletUI();


    // If ride already paid,
    // don't change button.
    if (
        currentRide?.paymentStatus ===
        "paid"
    ) {
        return;
    }


    const fare =
        Number(
            currentRide?.finalFare ??
            currentRide?.fare ??
            0
        );


    if (
        walletBalance <
        fare
    ) {

        payButton.disabled =
            true;

        payButton.textContent =
            "Insufficient Balance";

        showMessage(
            `Wallet balance ₹${walletBalance.toFixed(2)} is less than fare ₹${fare.toFixed(2)}.`,
            "error"
        );

        return;
    }


    if (
        currentRide?.status ===
        "completed"
    ) {

        payButton.disabled =
            false;

        payButton.textContent =
            "Pay ₹" +
            fare.toFixed(2);

        showMessage(
            "Wallet payment ready.",
            "success"
        );
    }
}


// =====================================================
// UPDATE WALLET UI
// =====================================================

function updateWalletUI() {

    if (!walletBalanceElement) {
        return;
    }

    walletBalanceElement.textContent =
        "₹" +
        walletBalance.toFixed(2);
}


// =====================================================
// PAY WITH WALLET
// =====================================================

payButton.addEventListener(
    "click",
    async function() {

        if (!currentUser) {

            showMessage(
                "Please login first.",
                "error"
            );

            return;
        }


        if (!currentRide) {

            showMessage(
                "Ride is not loaded.",
                "error"
            );

            return;
        }


        const fare =
            Number(
                currentRide.finalFare ??
                currentRide.fare ??
                0
            );


        if (
            !Number.isFinite(fare) ||
            fare <= 0
        ) {

            showMessage(
                "Invalid fare.",
                "error"
            );

            return;
        }


        if (
            currentRide.paymentStatus ===
            "paid"
        ) {

            showMessage(
                "This ride is already paid.",
                "success"
            );

            return;
        }


        if (
            currentRide.status !==
            "completed"
        ) {

            showMessage(
                "Ride must be completed before payment.",
                "error"
            );

            return;
        }


        if (
            walletBalance <
            fare
        ) {

            showMessage(
                "Insufficient wallet balance.",
                "error"
            );

            return;
        }


        const confirmed =
            confirm(
                `Pay ₹${fare.toFixed(2)} from your wallet?`
            );


        if (!confirmed) {
            return;
        }


        payButton.disabled =
            true;

        payButton.textContent =
            "Processing...";


        showMessage(
            "Processing wallet payment...",
            "loading"
        );


        try {

            const walletRef =
                doc(
                    db,
                    "wallet",
                    currentUser.uid
                );


            const rideRef =
                doc(
                    db,
                    "rides",
                    rideId
                );


            // Deterministic transaction ID
            // prevents duplicate payment
            const transactionId =
                "ride_" +
                rideId;


            const transactionRef =
                doc(
                    db,
                    "wallet_transactions",
                    transactionId
                );


            let newBalance =
                0;


            // =========================================
            // ATOMIC PAYMENT
            // =========================================

            await runTransaction(
                db,
                async function(transaction) {

                    const walletSnapshot =
                        await transaction.get(
                            walletRef
                        );


                    const rideSnapshot =
                        await transaction.get(
                            rideRef
                        );


                    const transactionSnapshot =
                        await transaction.get(
                            transactionRef
                        );


                    // Ride check
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
                        ride.userId !==
                        currentUser.uid
                    ) {

                        throw new Error(
                            "You do not own this ride."
                        );
                    }


                    // Already paid
                    if (
                        ride.paymentStatus ===
                        "paid"
                    ) {

                        throw new Error(
                            "Ride is already paid."
                        );
                    }


                    if (
                        ride.status !==
                        "completed"
                    ) {

                        throw new Error(
                            "Ride is not completed."
                        );
                    }


                    const currentFare =
                        Number(
                            ride.finalFare ??
                            ride.fare ??
                            0
                        );


                    if (
                        currentFare !==
                        fare
                    ) {

                        throw new Error(
                            "Ride fare changed. Please refresh."
                        );
                    }


                    // Duplicate transaction
                    if (
                        transactionSnapshot.exists()
                    ) {

                        throw new Error(
                            "Payment transaction already exists."
                        );
                    }


                    const oldBalance =
                        walletSnapshot.exists()
                            ? Number(
                                walletSnapshot
                                    .data()
                                    .balance || 0
                            )
                            : 0;


                    if (
                        oldBalance <
                        fare
                    ) {

                        throw new Error(
                            `Insufficient balance. Available ₹${oldBalance.toFixed(2)}`
                        );
                    }


                    newBalance =
                        oldBalance -
                        fare;


                    // =================================
                    // WALLET DEBIT
                    // =================================

                    transaction.set(
                        walletRef,
                        {
                            userId:
                                currentUser.uid,

                            balance:
                                newBalance,

                            updatedAt:
                                serverTimestamp()
                        },
                        {
                            merge: true
                        }
                    );


                    // =================================
                    // TRANSACTION HISTORY
                    // =================================

                    transaction.set(
                        transactionRef,
                        {
                            userId:
                                currentUser.uid,

                            rideId:
                                rideId,

                            type:
                                "debit",

                            amount:
                                fare,

                            balanceAfter:
                                newBalance,

                            description:
                                "Ride Fare Payment",

                            mode:
                                "wallet",

                            status:
                                "success",

                            createdAt:
                                serverTimestamp()
                        }
                    );


                    // =================================
                    // UPDATE RIDE
                    // =================================

                    transaction.update(
                        rideRef,
                        {
                            payment:
                                "Wallet",

                            paymentStatus:
                                "paid",

                            paidAt:
                                serverTimestamp(),

                            paidBy:
                                currentUser.uid,

                            walletTransactionId:
                                transactionId
                        }
                    );

                }
            );


            // =========================================
            // UPDATE LOCAL DATA
            // =========================================

            walletBalance =
                newBalance;

            currentRide.payment =
                "Wallet";

            currentRide.paymentStatus =
                "paid";


            updateWalletUI();


            payButton.disabled =
                true;

            payButton.textContent =
                "Payment Successful";


            showMessage(
                `✅ ₹${fare.toFixed(2)} paid successfully from wallet.`,
                "success"
            );


            // =========================================
            // NOTIFICATION
            // =========================================

            try {

                const notificationRef =
                    doc(
                        collection(
                            db,
                            "notifications"
                        )
                    );


                await setDoc(
                    notificationRef,
                    {
                        userId:
                            currentUser.uid,

                        title:
                            "Wallet Payment Successful",

                        message:
                            `₹${fare.toFixed(2)} ride fare paid successfully from your wallet.`,

                        type:
                            "payment",

                        rideId:
                            rideId,

                        read:
                            false,

                        createdAt:
                            serverTimestamp()
                    }
                );

            } catch (
                notificationError
            ) {

                console.warn(
                    "Notification failed:",
                    notificationError
                );
            }


            // Go dashboard after 2 sec
            setTimeout(
                function() {

                    window.location.href =
                        "dashboard.html";

                },
                2000
            );


        } catch (error) {

            console.error(
                "❌ Wallet payment failed:",
                error
            );


            payButton.disabled =
                false;

            payButton.textContent =
                "Pay ₹" +
                fare.toFixed(2);


            showMessage(
                "❌ Payment failed: " +
                error.message,
                "error"
            );


            // Reload wallet/ride
            try {

                await loadRide();

                await loadWallet();

            } catch (
                reloadError
            ) {

                console.error(
                    reloadError
                );
            }
        }

    }
);