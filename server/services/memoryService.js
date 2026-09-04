const { generateWithFallback } = require("./geminiService");

async function updateLongTermMemory(memory) {
    try {
        // Don't update until we have enough interactions
        if (
            memory.aiInteractions.length === 0 ||
            memory.aiInteractions.length % 5 !== 0
        ) {
            return;
        }

        console.log("");
        console.log("🧠 ================================");
        console.log("🧠 UPDATING LONG-TERM MEMORY:", memory.chatName);
        console.log("🧠 ================================");

        const recentMessages =
            memory.messages
                .slice(-80)
                .map(message => {
                    const speaker =
                        message.sender === "me"
                            ? "ME"
                            : "OTHER";

                    return `${speaker}: ${message.text}`;
                })
                .join("\n");

        const existingFacts =
            memory.importantFacts.length > 0
                ? memory.importantFacts.join("\n")
                : "None";

        const memoryPrompt = `

You are maintaining long-term memory for a WhatsApp conversation.

Your job is to remember ONLY useful information that is
actually supported by the conversation.

Do NOT invent facts.

Do NOT make assumptions.

Do NOT store temporary or meaningless statements.

Do NOT store sensitive personal information.

Focus especially on information that the person explicitly tells us.

IMPORTANT:

If the person directly states something about themselves,
preserve it as an important fact.

Examples:

"Movie dekhna meri hobby hai"
→ "Likes watching movies."

"Mujhe cricket bahut pasand hai"
→ "Likes cricket."

"Main Sunday ko free hota hu"
→ "Usually free on Sundays."

"Coffee pasand nahi hai"
→ "Does not like coffee."

Do NOT remove a directly stated preference just because it
appears only once.

Do NOT invent facts.

Do NOT infer facts that were never stated.

Keep important facts concise and factual.

Existing summary:

${memory.summary || "No summary yet."}


Existing important facts:

${existingFacts}


Recent WhatsApp conversation:

${recentMessages}


Update the long-term memory.

Return ONLY valid JSON in exactly this format:

{
    "summary": "short summary",
    "importantFacts": [
        "fact 1",
        "fact 2"
    ]
}

Keep the summary concise.

Keep only genuinely useful facts.

Only remove an existing fact if the conversation clearly
contradicts or corrects that fact.

Do not remove a fact merely because it was not mentioned
recently.
`;

        const response = await generateWithFallback(memoryPrompt);

        let memoryText = response.text.trim();

        memoryText = memoryText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        const updatedMemory = JSON.parse(memoryText);

        if (
            typeof updatedMemory.summary !== "string" ||
            !Array.isArray(updatedMemory.importantFacts)
        ) {
            throw new Error("Invalid memory format returned by Gemini");
        }

        memory.summary = updatedMemory.summary.trim();

        memory.importantFacts =
            updatedMemory.importantFacts
                .filter(
                    fact =>
                        typeof fact === "string" &&
                        fact.trim().length > 0
                )
                .map(fact => fact.trim());

        await memory.save();

        console.log("✅ Long-term memory updated!");
        console.log("📝 Summary:", memory.summary);
        console.log("📌 Important facts:", memory.importantFacts);

    } catch (error) {
        console.error("❌ Long-term memory error:", error.message);
    }
}

function getRelevantMemories(memory, newMessage) {
    if (
        !memory.importantFacts ||
        memory.importantFacts.length === 0
    ) {
        return [];
    }

    const messageWords =
        new Set(
            newMessage
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 2)
        );

    const scoredFacts =
        memory.importantFacts.map(fact => {
            const factWords =
                fact
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(word => word.length > 2);

            let score = 0;

            for (const word of factWords) {
                if (messageWords.has(word)) {
                    score++;
                }
            }

            return {
                fact,
                score
            };
        });

    return scoredFacts
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.fact);
}

module.exports = {
    updateLongTermMemory,
    getRelevantMemories
};
