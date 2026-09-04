const express = require("express");
const router = express.Router();

const Memory = require("../models/Memory");
const authenticateUser = require("../middleware/authMiddleware");


// ==========================================
// GET ALL MEMORIES FOR CURRENT USER
// ==========================================

router.get("/memories", authenticateUser, async (req, res) => {
    try {

        const userId = req.user.userId;

        const memories = await Memory.find(
            { userId },
            {
                chatName: 1,
                messages: 1,
                importantFacts: 1,
                summary: 1
            }
        ).sort({ updatedAt: -1 });

        const chats = memories.map(memory => ({
            chatName: memory.chatName,

            messageCount:
                memory.messages?.length || 0,

            importantFacts:
                memory.importantFacts || [],

            summary:
                memory.summary || ""
        }));

        res.json({
            success: true,
            chats
        });

    } catch (error) {

        console.error(
            "❌ Get memories error:",
            error
        );

        res.status(500).json({
            success: false,
            error: "Failed to get memories"
        });
    }
});


// ==========================================
// GET MEMORY FOR ONE CHAT
// ==========================================

router.get(
    "/memories/:chatName",
    authenticateUser,
    async (req, res) => {

        try {

            const userId = req.user.userId;
            const chatName = req.params.chatName;

            const memory = await Memory.findOne({
                userId,
                chatName
            });

            if (!memory) {
                return res.status(404).json({
                    success: false,
                    error: "Memory not found"
                });
            }

            res.json({
                success: true,

                memory: {
                    chatName: memory.chatName,

                    messageCount:
                        memory.messages?.length || 0,

                    messages:
                        memory.messages || [],

                    aiInteractions:
                        memory.aiInteractions || [],

                    summary:
                        memory.summary || "",

                    importantFacts:
                        memory.importantFacts || []
                }
            });

        } catch (error) {

            console.error(
                "❌ Get single memory error:",
                error
            );

            res.status(500).json({
                success: false,
                error: "Failed to get memory"
            });
        }
    }
);


module.exports = router;