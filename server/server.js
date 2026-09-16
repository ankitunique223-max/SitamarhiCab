import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import Razorpay from "razorpay";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

const app = express();

app.use(cors());
app.use(express.json());

console.log("=================================");
console.log("🚕 SitamarhiCab Payment Server");
console.log("=================================");

console.log("KEY ID:", process.env.RAZORPAY_KEY_ID || "MISSING");
console.log(
    "KEY SECRET:",
    process.env.RAZORPAY_KEY_SECRET ? "LOADED ✅" : "MISSING ❌"
);

if (
    !process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET
) {
    console.error("❌ Razorpay credentials missing");
    process.exit(1);
}

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "SitamarhiCab Payment Server is Running"
    });
});

app.post("/create-order", async (req, res) => {

    console.log("\n📦 CREATE ORDER");

    try {

        const amount = Number(req.body.amount);
        const rideId = String(req.body.rideId || "");

        console.log("Amount:", amount);
        console.log("Ride ID:", rideId);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount"
            });
        }

        if (!rideId) {
            return res.status(400).json({
                success: false,
                message: "Ride ID is required"
            });
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: "ride_" + rideId.substring(0, 30)
        });

        console.log("✅ ORDER CREATED:", order.id);

        return res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error) {

        console.error("❌ RAZORPAY ERROR");
        console.error("Message:", error?.message);
        console.error("Status:", error?.statusCode);
        console.error("Code:", error?.error?.code);
        console.error("Description:", error?.error?.description);

        return res.status(500).json({
            success: false,
            message:
                error?.error?.description ||
                error?.message ||
                "Order creation failed"
        });
    }
});

app.post("/verify-payment", (req, res) => {

    try {

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment data missing"
            });
        }

        const body =
            razorpay_order_id +
            "|" +
            razorpay_payment_id;

        const expectedSignature =
            crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(body)
                .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment signature"
            });
        }

        console.log("✅ PAYMENT VERIFIED");

        return res.json({
            success: true,
            message: "Payment verified successfully",
            paymentId: razorpay_payment_id
        });

    } catch (error) {

        console.error("❌ VERIFY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Payment verification failed"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("");
    console.log("=================================");
    console.log(`🚕 Server: http://127.0.0.1:${PORT}`);
    console.log("=================================");
});