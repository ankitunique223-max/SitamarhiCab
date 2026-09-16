import { auth, db } from "./firebase.js";

import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


let currentUser = null;

let transactions = [];


const balanceElement =
    document.getElementById("walletBalance");

const transactionList =
    document.getElementById("transactionList");

const refreshButton =
    document.getElementById("refreshButton");


// ==========================================
// AUTH
// ==========================================

auth.onAuthStateChanged(async function(user) {

    if (!user) {

        window.location.href =
            "login.html";

        return;
    }

    currentUser = user;

    await loadWallet();

    await loadTransactions();

});


// ==========================================
// LOAD WALLET
// ==========================================

async function loadWallet() {

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


        balanceElement.textContent =
            "₹" + balance.toFixed(2);


    } catch (error) {

        console.error(
            "Wallet loading error:",
            error
        );

        balanceElement.textContent =
            "₹0.00";

    }

}


// ==========================================
// LOAD TRANSACTIONS
// ==========================================

async function loadTransactions() {

    transactionList.innerHTML = `

        <div class="empty-wallet">

            <div class="empty-wallet-icon">
                ⏳
            </div>

            <p>
                Loading transactions...
            </p>

        </div>

    `;


    try {

        const transactionQuery =
            query(
                collection(
                    db,
                    "wallet_transactions"
                ),
                where(
                    "userId",
                    "==",
                    currentUser.uid
                )
            );


        const snapshot =
            await getDocs(
                transactionQuery
            );


        transactions = [];


        snapshot.forEach(function(docSnap) {

            transactions.push({

                id: docSnap.id,

                ...docSnap.data()

            });

        });


        // Sort in JavaScript.
        // No Firestore composite index required.
        transactions.sort(function(a, b) {

            return (
                getTimestamp(b.createdAt) -
                getTimestamp(a.createdAt)
            );

        });


        renderTransactions();


    } catch (error) {

        console.error(
            "Transaction loading error:",
            error
        );


        transactionList.innerHTML = `

            <div class="error-message">

                ❌ Unable to load transactions.

                <br><br>

                ${escapeHTML(
                    error.message
                )}

            </div>

        `;

    }

}


// ==========================================
// RENDER
// ==========================================

function renderTransactions() {

    if (transactions.length === 0) {

        transactionList.innerHTML = `

            <div class="empty-wallet">

                <div class="empty-wallet-icon">
                    💳
                </div>

                <h3>
                    No transactions yet
                </h3>

                <p>
                    Your wallet transactions will appear here.
                </p>

            </div>

        `;

        return;
    }


    transactionList.innerHTML =
        transactions.map(function(transaction) {

            const type =
                transaction.type === "credit"
                    ? "credit"
                    : "debit";


            const isCredit =
                type === "credit";


            const icon =
                isCredit
                    ? "➕"
                    : "➖";


            const amount =
                Number(
                    transaction.amount || 0
                );


            const title =
                transaction.description ||
                (
                    isCredit
                        ? "Money Added"
                        : "Wallet Payment"
                );


            const date =
                formatDate(
                    transaction.createdAt
                );


            const balanceAfter =
                Number(
                    transaction.balanceAfter || 0
                );


            return `

                <div class="transaction-item">

                    <div class="transaction-left">

                        <div
                            class="
                                transaction-icon
                                ${type}-icon
                            "
                        >
                            ${icon}
                        </div>


                        <div>

                            <div class="transaction-title">
                                ${escapeHTML(title)}
                            </div>

                            <div class="transaction-date">
                                ${date}
                            </div>

                            <div class="transaction-date">
                                ID: ${escapeHTML(
                                    transaction.id
                                )}
                            </div>

                        </div>

                    </div>


                    <div>

                        <div
                            class="${type}"
                        >
                            ${
                                isCredit
                                    ? "+"
                                    : "-"
                            }
                            ₹${amount.toFixed(2)}
                        </div>


                        <div class="transaction-balance">
                            Balance:
                            ₹${balanceAfter.toFixed(2)}
                        </div>

                    </div>

                </div>

            `;

        }).join("");

}


// ==========================================
// REFRESH
// ==========================================

if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        async function() {

            refreshButton.disabled =
                true;

            refreshButton.textContent =
                "⏳ Loading...";


            await loadWallet();

            await loadTransactions();


            refreshButton.disabled =
                false;

            refreshButton.textContent =
                "🔄 Refresh";

        }
    );

}


// ==========================================
// TIMESTAMP
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


    const time =
        new Date(value).getTime();


    return Number.isNaN(time)
        ? 0
        : time;

}


// ==========================================
// DATE FORMAT
// ==========================================

function formatDate(value) {

    const timestamp =
        getTimestamp(value);


    if (!timestamp) {
        return "Recently";
    }


    return new Date(
        timestamp
    ).toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

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