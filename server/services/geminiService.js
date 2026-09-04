const ai = require("../config/ai");

async function generateWithFallback(contents) {

    try {

        console.log("🚀 Trying Gemini 3.5 Flash-Lite...");

        const response =
            await ai.models.generateContent({
                model: "gemini-3.5-flash-lite",
                contents,

                config: {
                    thinkingConfig: {
                        thinkingLevel: "minimal"
                    }
                }
            });

        console.log(
            "✅ Gemini 3.5 Flash-Lite response received!"
        );

        return response;

    } catch (error) {

        console.error(
            "❌ Gemini 3.5 Flash-Lite FAILED"
        );

        console.error(
            "Status:",
            error.status
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "Full error:",
            error
        );

        console.log(
            "🔄 Trying Gemini 3.6 Flash..."
        );

        const response =
            await ai.models.generateContent({
                model: "gemini-3.6-flash",
                contents,

                config: {
                    thinkingConfig: {
                        thinkingLevel: "minimal"
                    }
                }
            });

        console.log(
            "✅ Gemini 3.6 Flash response received!"
        );

        return response;
    }
}


// IMPORTANT:
// replyRoutes.js imports generateWithFallback()
// so this MUST remain here.

module.exports = {
    ai,
    generateWithFallback
};