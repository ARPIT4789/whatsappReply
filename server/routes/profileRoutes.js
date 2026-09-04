const express = require("express");
const UserProfile = require("../models/UserProfile");

const router = express.Router();

const authenticateUser =
    require("../middleware/authMiddleware");

// ============================================================
// UPDATE REPLY MODE
// ============================================================

router.post(
    "/update-reply-mode",
    authenticateUser,
    async (req, res) => {
    try {
        const { mode } = req.body;

        if (!["normal", "short", "detailed"].includes(mode)) {
            return res.status(400).json({
                success: false,
                error: "Invalid reply mode"
            });
        }

        let userProfile =
            await UserProfile.findOne({
                userId: req.user.userId
            });

        if (!userProfile) {
            userProfile =
                await UserProfile.create({
                   userId: req.user.userId,
                    ownerMessages: [],
                    writingStyle: {
                        language: "",
                        tone: "",
                        commonWords: [],
                        emojiUsage: "",
                        sentenceStyle: "",
                        examples: []
                    },
                    replySettings: {
                        mode: mode
                    }
                });
        } else {
            userProfile.replySettings.mode = mode;
            await userProfile.save();
        }

        console.log("🎯 Reply mode updated:", mode);

        res.json({
            success: true,
            mode: mode
        });

    } catch (error) {
        console.error(
            "❌ Reply mode update error:",
            error
        );

        res.status(500).json({
            success: false,
            error: "Failed to update reply mode"
        });
    }
});
// ========================================================
// GET USER REPLY SETTINGS
// ========================================================

router.get("/reply-settings", authenticateUser, async (req, res) => {

    try {

        const userId = req.user.userId;

        const userProfile =
            await UserProfile.findOne({ userId });

        if (!userProfile) {

            return res.json({
                success: true,
                replyMode: "normal",
                sendMode: "manual"
            });
        }

        res.json({
            success: true,

            replyMode:
                userProfile.replySettings?.mode || "normal",

            sendMode:
                userProfile.replySettings?.sendMode || "manual"
        });

    } catch (error) {

        console.error(
            "❌ Get reply settings error:",
            error
        );

        res.status(500).json({
            success: false,
            error: "Failed to get reply settings"
        });

    }

});

router.post("/update-send-mode", authenticateUser, async (req, res) => {
    try {
        const { sendMode } = req.body;

        if (!["manual", "auto"].includes(sendMode)) {
            return res.status(400).json({
                success: false,
                error: "Invalid send mode"
            });
        }

        const userId = req.user.userId;

        const userProfile = await UserProfile.findOneAndUpdate(
            { userId },
            {
                $set: {
                    "replySettings.sendMode": sendMode
                }
            },
            {
                new: true,
                upsert: true
            }
        );

        console.log(
            `⚙️ User ${userId} send mode → ${sendMode}`
        );

        res.json({
            success: true,
            sendMode: userProfile.replySettings.sendMode
        });

    } catch (error) {
        console.error("❌ Update send mode error:", error);

        res.status(500).json({
            success: false,
            error: "Failed to update send mode"
        });
    }
});

module.exports = router;
