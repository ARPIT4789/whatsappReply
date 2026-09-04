const express = require("express");
const Memory = require("../models/Memory");
const UserProfile = require("../models/UserProfile");
const authenticateUser =
    require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// SYNC WHATSAPP CONVERSATION TO MONGODB
// ============================================================

router.post(
    "/sync-conversation",
    authenticateUser,
    async (req, res) => {
    try {
        const { chatName, messages } = req.body;

        if (!chatName || !Array.isArray(messages)) {
            return res.status(400).json({
                error: "chatName and messages are required"
            });
        }

        // ========================================================
        // FIND OR CREATE MEMORY
        // ========================================================

        let memory =
    await Memory.findOne({
        userId: req.user.userId,
        chatName: chatName
    });

        if (!memory) {
    memory =
        await Memory.create({

            userId: req.user.userId,

            chatName: chatName,

            messages: [],

            aiInteractions: [],

            summary: "",

            importantFacts: []
        });

    console.log(
        "🧠 Created memory for:",
        chatName
    );
}

        // ========================================================
        // EXISTING MESSAGE IDS
        // ========================================================

        const existingIds =
            new Set(
                memory.messages.map(
                    message => message.messageId
                )
            );

        let addedCount = 0;

        // ============================================================
        // GET OWNER PROFILE
        // ============================================================

        let userProfile = await UserProfile.findOne({ userId: "owner" });

        if (!userProfile) {
            userProfile =
                await UserProfile.create({
                    userId: "owner",
                    ownerMessages: [],
                    writingStyle: {
                        language: "",
                        tone: "",
                        commonWords: [],
                        emojiUsage: "",
                        sentenceStyle: "",
                        examples: []
                    }
                });

            console.log("👤 Created owner profile");
        }

        const existingOwnerMessageIds =
            new Set(
                userProfile.ownerMessages.map(
                    message => message.messageId
                )
            );

        // ========================================================
        // ADD ONLY NEW MESSAGES
        // ========================================================

        for (const message of messages) {
            if (!message.id) {
                continue;
            }

            // ========================================================
            // SAVE TO PERSON'S CONVERSATION MEMORY
            // ========================================================

            if (!existingIds.has(message.id)) {
                memory.messages.push({
                    messageId: message.id,
                    sender: message.sender,
                    text: message.text
                });

                existingIds.add(message.id);
                addedCount++;
            }

            // ========================================================
            // SAVE OWNER'S MESSAGE TO GLOBAL PROFILE
            // ========================================================

            if (
                message.sender === "me" &&
                !existingOwnerMessageIds.has(message.id)
            ) {
                userProfile.ownerMessages.push({
                    messageId: message.id,
                    chatName: chatName,
                    text: message.text
                });

                existingOwnerMessageIds.add(message.id);

                console.log(
                    "👤 Owner message learned:",
                    message.text
                );
            }
        }

        // ========================================================
        // SAVE
        // ========================================================

        if (addedCount > 0) {
            await memory.save();
        }

        await userProfile.save();

        console.log(
            `💾 ${chatName}: ${addedCount} new messages synced`
        );

        res.json({
            success: true,
            chatName: chatName,
            added: addedCount,
            total: memory.messages.length
        });

    } catch (error) {
        console.error(
            "❌ Conversation sync error:",
            error
        );

        res.status(500).json({
            error: "Failed to sync conversation",
            details: error.message
        });
    }
});

module.exports = router;
