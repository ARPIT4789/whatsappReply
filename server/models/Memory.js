const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema(
    {

        userId: {
            type: String,
            required: true
        },
        chatName: {
            type: String,
            required: true
        },

        // ========================================================
        // ACTUAL WHATSAPP CONVERSATION
        // ========================================================

        messages: [
            {
                messageId: {
                    type: String,
                    required: true
                },

                sender: {
                    type: String,
                    required: true
                },

                text: {
                    type: String,
                    required: true
                },

                timestamp: {
                    type: Date,
                    default: Date.now
                }
            }
        ],


        // ========================================================
        // AI INTERACTIONS
        // ========================================================

        aiInteractions: [
            {
                triggerMessageId: {
                    type: String,
                    required: true
                },

                incomingMessage: {
                    type: String,
                    required: true
                },

                reply: {
                    type: String,
                    required: true
                },

                timestamp: {
                    type: Date,
                    default: Date.now
                }
            }
        ],


        // ========================================================
        // LONG-TERM MEMORY
        // ========================================================

        summary: {
            type: String,
            default: ""
        },

        importantFacts: [
            {
                type: String
            }
        ]
    },

    {
        timestamps: true
    }
);

memorySchema.index(
    { userId: 1, chatName: 1 },
    { unique: true }
);

module.exports =
    mongoose.model("Memory", memorySchema);