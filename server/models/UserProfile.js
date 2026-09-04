const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            unique: true
        },

        // ========================================================
        // OWNER'S ACTUAL WHATSAPP MESSAGES
        // ========================================================

        ownerMessages: [
            {
                messageId: {
                    type: String,
                    required: true
                },

                chatName: {
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
        // LEARNED WRITING STYLE
        // ========================================================

           writingStyle: {

            language: {
                type: String,
                default: ""
            },

            tone: {
                type: String,
                default: ""
            },

            commonWords: [
                {
                    type: String
                }
            ],

            emojiUsage: {
                type: String,
                default: ""
            },

            sentenceStyle: {
                type: String,
                default: ""
            },

            examples: [
                {
                    type: String
                }
            ],
            lastAnalyzedMessageCount: {
    type: Number,
    default: 0
}
        },

        // ========================================================
        // REPLY SETTINGS
        // ========================================================

        replySettings: {
    mode: {
        type: String,
        enum: ["normal", "short", "detailed"],
        default: "normal"
    },

    sendMode: {
        type: String,
        enum: ["manual", "auto"],
        default: "manual"
    }
}
    },

    {
        timestamps: true
    }
);

module.exports =
    mongoose.model("UserProfile", userProfileSchema);