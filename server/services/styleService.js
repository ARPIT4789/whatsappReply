const { generateWithFallback } = require("./geminiService");

async function updateWritingStyle(
    userProfile,
    ownerMessages,
    totalOwnerMessageCount
) {
    try {
        if (ownerMessages.length < 10) {
            return;
        }

        const lastAnalyzed =
            userProfile.writingStyle.lastAnalyzedMessageCount || 0;

        
          const newMessagesSinceAnalysis =
    totalOwnerMessageCount - lastAnalyzed;

        if (newMessagesSinceAnalysis < 10) {

            console.log(
                `📝 Only ${newMessagesSinceAnalysis} new owner messages since last style analysis.`
            );

            return;
        }
        console.log("");
        console.log("🧠 ================================");
        console.log("🧠 ANALYZING YOUR WRITING STYLE");
        console.log("🧠 ================================");

        const recentOwnerMessages =
            ownerMessages.slice(-100);

        const messagesText =
            recentOwnerMessages
                .map(
                    (message, index) =>
                        `${index + 1}. ${message.text}`
                )
                .join("\n");

        const existingStyle =
            JSON.stringify(userProfile.writingStyle);

        const stylePrompt = `

You are analyzing the writing style of the owner of a WhatsApp account.

These are messages actually written by the owner:

${messagesText}


Existing writing-style profile:

${existingStyle}


Analyze ONLY the owner's actual writing.

Do NOT invent characteristics.

Identify:

1. Main language
2. Tone
3. Common words or expressions
4. Emoji usage
5. Sentence style
6. A few representative examples

Return ONLY valid JSON in exactly this format:

{
    "language": "",
    "tone": "",
    "commonWords": [],
    "emojiUsage": "",
    "sentenceStyle": "",
    "examples": []
}

Important:

- Preserve Hinglish if the messages use Hinglish.
- Keep common words natural.
- Do not make the writing sound more polished than it actually is.
- Short/informal messages should remain short/informal.
- Do not infer personal information.
- Do not invent words the owner does not use.

`;

        const response = await generateWithFallback(stylePrompt);

        let styleText = response.text.trim();

        styleText = styleText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        const updatedStyle = JSON.parse(styleText);

        userProfile.writingStyle.language =
            updatedStyle.language || "";

        userProfile.writingStyle.tone =
            updatedStyle.tone || "";

        userProfile.writingStyle.commonWords =
            Array.isArray(updatedStyle.commonWords)
                ? updatedStyle.commonWords
                : [];

        userProfile.writingStyle.emojiUsage =
            updatedStyle.emojiUsage || "";

        userProfile.writingStyle.sentenceStyle =
            updatedStyle.sentenceStyle || "";

        userProfile.writingStyle.examples =
            Array.isArray(updatedStyle.examples)
                ? updatedStyle.examples.slice(0, 10)
                : [];


       userProfile.writingStyle.lastAnalyzedMessageCount =
    totalOwnerMessageCount;

        await userProfile.save();

        console.log("✅ Writing style updated!");
        console.log(
            "📝 Language:",
            userProfile.writingStyle.language
        );
        console.log(
            "📝 Tone:",
            userProfile.writingStyle.tone
        );
        console.log(
            "📊 Style analyzed at message count:",
            ownerMessages.length
        );
        console.log(
            "📝 Common words:",
            userProfile.writingStyle.commonWords
        );

    } catch (error) {
        console.error(
            "❌ Writing style analysis failed:",
            error.message
        );
    }
}

module.exports = {
    updateWritingStyle
};
