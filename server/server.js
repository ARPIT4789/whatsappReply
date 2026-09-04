const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const authRoutes = require("./routes/authRoutes");
const memoryRoutes = require("./routes/memoryRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const profileRoutes = require("./routes/profileRoutes");
const replyRoutes = require("./routes/replyRoutes");

const app = express();

// ============================================================
// MONGODB
// ============================================================

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("🍃 MongoDB connected successfully!");
    })
    .catch((error) => {
        console.error("❌ MongoDB connection failed:", error.message);
    });

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json());

// ============================================================
// ROUTES
// ============================================================

app.use("/auth", authRoutes);
app.use("/", conversationRoutes);
app.use("/", profileRoutes);
app.use("/", replyRoutes);
app.use("/", memoryRoutes);

// ============================================================
// SERVER HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
    res.json({
        status: "WhatsApp AI server is running",
        ai: "Gemini"
    });
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
