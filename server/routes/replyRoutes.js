const express = require("express");

const Memory = require("../models/Memory");
const UserProfile = require("../models/UserProfile");

const authenticateUser =
    require("../middleware/authMiddleware");

const {
    generateWithFallback
} = require("../services/geminiService");

const {
    updateLongTermMemory,
    getRelevantMemories
} = require("../services/memoryService");

const {
    updateWritingStyle
} = require("../services/styleService");

const router = express.Router();


// ============================================================
// GENERATE REPLY
// ============================================================

router.post(
    "/generate-reply",
    authenticateUser,
    async (req, res) => {

        const startTime = Date.now();

        try {

            const {
                chatName,
                conversation,
                newMessage,
                newMessageId
            } = req.body;


            // ============================================================
            // VALIDATE REQUEST
            // ============================================================

            if (
                !chatName ||
                !conversation ||
                !newMessage ||
                !newMessageId
            ) {

                return res.status(400).json({
                    error:
                        "chatName, conversation, newMessage and newMessageId are required"
                });

            }


            // ============================================================
            // GET USER WRITING STYLE
            // ============================================================

            let userProfile =
                await UserProfile.findOne({
                    userId: req.user.userId
                });


            // ============================================================
            // CREATE USER PROFILE IF IT DOES NOT EXIST
            // ============================================================

            if (!userProfile) {

                userProfile =
                    await UserProfile.create({

                        userId: req.user.userId,

                        writingStyle: {

                            language: "",

                            tone: "",

                            commonWords: [],

                            emojiUsage: "",

                            sentenceStyle: "",

                            examples: [],

                            lastAnalyzedMessageCount: 0

                        }

                    });


                console.log(
                    "👤 Created user writing profile"
                );

            } else {

                console.log(
                    "👤 Loaded user writing profile"
                );

            }


            // ============================================================
            // GET REPLY MODE
            // ============================================================

            const replyMode =
                userProfile.replySettings?.mode || "normal";


            console.log(
                "🎯 Reply mode:",
                replyMode
            );


            console.log(
                "⏱️ UserProfile loaded:",
                Date.now() - startTime,
                "ms"
            );

            // ============================================================
            // GET OR CREATE MEMORY FOR CURRENT CHAT
            // ============================================================

            const memoryStart = Date.now();

            let memory =
                await Memory.findOneAndUpdate(
                    {
                        userId: req.user.userId,
                        chatName: chatName
                    },

                    {
                        $setOnInsert: {
                            userId: req.user.userId,
                            chatName: chatName,
                            messages: [],
                            aiInteractions: [],
                            summary: "",
                            importantFacts: []
                        }
                    },

                    {
                        new: true,
                        upsert: true,
                        setDefaultsOnInsert: true
                    }
                );


            console.log(
                "🧠 Memory loaded/created for:",
                chatName
            );


            console.log(
                "⏱️ Memory loaded:",
                Date.now() - memoryStart,
                "ms"
            );


            console.log(
                "⏱️ Memory loaded:",
                Date.now() - startTime,
                "ms"
            );


            // ============================================================
            // PREVIOUS AI INTERACTIONS
            // ============================================================

            const memoryText =
                memory.aiInteractions
                    .slice(-10)
                    .map(interaction => {

                        return `
OTHER: ${interaction.incomingMessage}
AI REPLY: ${interaction.reply}
`;

                    })
                    .join("\n");


            // ============================================================
            // LONG-TERM MEMORY
            // ============================================================

            const longTermMemoryText = `

SUMMARY:
${memory.summary || "No long-term summary yet."}

IMPORTANT FACTS:
${memory.importantFacts.length > 0
                    ? memory.importantFacts
                        .map(fact => `- ${fact}`)
                        .join("\n")
                    : "No important facts yet."
                }

`;


            // ============================================================
            // FIND RELEVANT MEMORIES
            // ============================================================

            const relevantMemories =
                getRelevantMemories(
                    memory,
                    newMessage
                );


            console.log(
                "🧠 Relevant memories:",
                relevantMemories
            );


            // ============================================================
            // CONVERT CONVERSATION INTO READABLE TEXT
            // ============================================================

            const conversationText =
                conversation
                    .map(message => {

                        const speaker =
                            message.sender === "me"
                                ? "ME"
                                : "OTHER";


                        return `${speaker}: ${message.text}`;

                    })
                    .join("\n");


            // ============================================================
            // EXTRACT OWNER MESSAGES
            // ============================================================

            const allOwnerMessages =
                userProfile.ownerMessages
                    .filter(message => message.text);


            const ownerMessages =
                allOwnerMessages.slice(-100);


            // ============================================================
            // UPDATE WRITING STYLE IF NEEDED
            // ============================================================

            const styleStart =
                Date.now();


            await updateWritingStyle(
                userProfile,
                ownerMessages,
                allOwnerMessages.length
            );


            console.log(
                "⏱️ Writing style check:",
                Date.now() - styleStart,
                "ms"
            );


            // ============================================================
            // CHECK DUPLICATE REPLY
            // ============================================================

            const alreadyReplied =
                memory.aiInteractions.some(
                    interaction =>
                        interaction.triggerMessageId ===
                        newMessageId
                );


            if (alreadyReplied) {

                console.log(
                    "🚫 AI reply already exists for this message:",
                    newMessageId
                );


                return res.status(409).json({

                    error:
                        "Reply already generated for this message"

                });

            }


            // ============================================================
            // LOG MEMORY
            // ============================================================

            console.log("");

            console.log(
                "🧠 ================================"
            );

            console.log(
                "🧠 MEMORY FOR:",
                chatName
            );

            console.log(
                "🧠 ================================"
            );

            console.log(
                memoryText ||
                "No previous AI memory yet."
            );

            console.log(
                "🧠 ================================"
            );


            // ============================================================
            // MAIN GEMINI PROMPT
            // ============================================================

            const prompt = `

You generate a WhatsApp reply for the account owner.

Your job is NOT to behave like an AI assistant.

Your job is to generate the reply that the WhatsApp account owner
would naturally type.

Study the conversation carefully before generating the reply.


============================================================
NON-NEGOTIABLE RULES
============================================================

1. Understand the NEW MESSAGE first.

2. The language of the NEW MESSAGE has the highest priority when
   choosing the language of the reply.

3. If the NEW MESSAGE is clearly in English, the reply MUST be in
   English.

4. If the NEW MESSAGE is clearly in Serbian, the reply MUST be in
   Serbian.

5. If the NEW MESSAGE is clearly in Hindi, the reply MUST be in
   Hindi.

6. If the NEW MESSAGE is clearly in Hinglish, the reply MUST be in
   natural Hinglish.

7. If the NEW MESSAGE is clearly in Spanish, reply in Spanish.

8. If the NEW MESSAGE is clearly in French, reply in French.

9. If the NEW MESSAGE uses another language you understand, reply
   in that language.

10. If the NEW MESSAGE mixes languages, naturally follow the same
    mixture.

11. Only when the NEW MESSAGE is too short or ambiguous to identify
    its language should you use the recent conversation to infer it.

12. NEVER choose the reply language from the owner's stored language.

13. NEVER choose the reply language from the owner's common words.

14. NEVER choose the reply language from the owner's example messages.

15. The owner's writing style controls HOW the reply sounds.
    The current conversation controls WHICH LANGUAGE it uses.


============================================================
VERY IMPORTANT LANGUAGE EXAMPLE
============================================================

The owner's learned style may contain:

Language: Hinglish
Common words: bhai, haan, acha, sahi hai, kidhar

But if the NEW MESSAGE is:

"bro i have booked the bus"

the reply MUST be English.

Correct type of reply:

"Nice bro, where did you book it?"

Incorrect:

"Sahi hai bhai, kidhar ki hai?"

Do NOT copy Hindi/Hinglish words into an English reply merely because
they appear in the owner's style profile.

The exact reply must depend on the actual conversation.


============================================================
CONVERSATION
============================================================

${conversationText}


============================================================
RELEVANT MEMORIES
============================================================

${relevantMemories.length > 0
                    ? relevantMemories
                        .map(fact => `- ${fact}`)
                        .join("\n")
                    : "No specifically relevant memories."
                }


============================================================
PREVIOUS AI INTERACTIONS
============================================================

${memoryText || "No previous AI interactions."}


============================================================
LONG-TERM MEMORY
============================================================

${longTermMemoryText}


============================================================
OWNER'S WRITING STYLE
============================================================

This profile describes HOW the owner normally communicates.

It does NOT determine the language of the reply.

Tone:
${userProfile.writingStyle.tone}

Sentence style:
${userProfile.writingStyle.sentenceStyle}

Emoji usage:
${userProfile.writingStyle.emojiUsage}

Common expressions:
${userProfile.writingStyle.commonWords.join(", ")}

Known language pattern:
${userProfile.writingStyle.language}

Style examples:
${userProfile.writingStyle.examples.join("\n")}


STYLE INSTRUCTION:

Use the owner's:

- tone
- sentence length
- level of formality
- naturalness
- emoji behavior
- general communication style

However, do NOT force the owner's known language pattern onto
the current conversation.

The profile may contain examples from a language different from
the current conversation.

Do NOT copy language-specific words from those examples merely
because they appear in the profile.

If the current conversation is English, sound like the owner
in natural English.

If the current conversation is Serbian, sound like the owner
in natural Serbian.

If the current conversation is Hinglish, sound like the owner
in natural Hinglish.

Do NOT automatically insert words such as:

bhai
haan
acha
sahi hai
kidhar

into an English or other-language reply.


============================================================
REPLY MODE
============================================================

Selected mode:

${replyMode}

Rules:

- normal:
  Generate a natural reply of the usual length.

- short:
  Keep the reply very short and concise.

- detailed:
  Give a somewhat more complete reply when the context requires it.

The reply mode must NOT change the reply language.


============================================================
NEW MESSAGE
============================================================

THIS IS THE MESSAGE YOU ARE REPLYING TO:

${newMessage}


============================================================
FINAL LANGUAGE CHECK
============================================================

Before producing the reply, silently determine:

A. What language is the NEW MESSAGE written in?

B. Is the NEW MESSAGE language clear?

C. If clear, use that language for the reply.

D. If unclear, use the most likely language from the recent
   conversation.

E. Apply the owner's writing style only AFTER deciding the language.

PRIORITY:

NEW MESSAGE LANGUAGE
>
RECENT CONVERSATION LANGUAGE
>
OWNER WRITING STYLE

The owner's stored language is NEVER allowed to override a clearly
identified current-message language.

Do not output your language decision.

Do not output analysis.

Do not output explanations.

Do not add quotation marks.

Output ONLY the reply text.

`;


            // ====================================================
            // GEMINI REQUEST
            // ====================================================

            console.log(
                "⏱️ Starting main Gemini reply..."
            );


            const geminiStart =
                Date.now();


            console.log(
                "🚀 Trying Gemini 3.5 Flash lite..."
            );


            const response =
                await generateWithFallback(prompt);


            console.log(
                "✅ Gemini response received!"
            );


            let reply =
                response.text.trim();


            // ============================================================
            // CLEAN GEMINI RESPONSE
            // ============================================================

            reply =
                reply
                    .replace(/<\/p>/gi, "")
                    .replace(/<p>/gi, "")
                    .replace(
                        /<br\s*\/?>(?=\n|$)/gi,
                        "\n"
                    )
                    .trim();


            console.log(
                "⏱️ Main Gemini reply:",
                Date.now() - geminiStart,
                "ms"
            );


            // ============================================================
            // SAVE AI INTERACTION
            // ============================================================

            memory.aiInteractions.push({

                triggerMessageId:
                    newMessageId,

                incomingMessage:
                    newMessage,

                reply:
                    reply

            });


            await memory.save();


            console.log(
                "💾 AI interaction saved for:",
                chatName
            );


            // ============================================================
            // UPDATE LONG-TERM MEMORY
            // ============================================================

            await updateLongTermMemory(
                memory
            );


            console.log(
                "💾 Memory saved to MongoDB for:",
                chatName
            );


            // ============================================================
            // LOG FINAL REPLY
            // ============================================================

            console.log("");

            console.log(
                "================================"
            );

            console.log(
                "🤖 GEMINI REPLY"
            );

            console.log(
                "================================"
            );

            console.log(
                reply
            );

            console.log(
                "================================"
            );

            // ============================================================
            // RESPONSE
            // ============================================================

            res.json({

                reply:
                    reply

            });


        } catch (error) {

            console.error(
                "❌ GEMINI ERROR:",
                error
            );


            res.status(500).json({

                error:
                    "Failed to generate reply",

                details:
                    error.message

            });

        }

    }
);


module.exports = router;