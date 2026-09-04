const ai = require("../config/ai");

async function generateWithFallback(contents) {
    try {
        return await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents
        });
    } catch (error) {
        console.log("⚠️ Gemini 3.5 Flash lite unavailable.");
        console.log("Trying Gemini 3.6 Flash...");

        return await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents
        });
    }
}

module.exports = {
    ai,
    generateWithFallback
};
