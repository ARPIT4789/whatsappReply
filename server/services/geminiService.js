const ai = require("../config/ai");

async function generateWithFallback(contents) {

    // ================================
    // PRIMARY MODEL
    // Gemini 3.6 Flash
    // ================================

    try {

        console.log(
            "🚀 Trying Gemini 3.6 Flash..."
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

    } catch (error) {

        console.error(
            "❌ Gemini 3.6 Flash FAILED"
        );

        console.error(
            "Status:",
            error.status
        );

        console.error(
            "Message:",
            error.message
        );


        // ================================
        // FALLBACK MODEL
        // Gemini 3.5 Flash-Lite
        // ================================

        try {

            console.log(
                "🔄 Trying Gemini 3.5 Flash-Lite..."
            );

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

        } catch (fallbackError) {

            console.error(
                "❌ Gemini 3.5 Flash-Lite ALSO FAILED"
            );

            console.error(
                "Status:",
                fallbackError.status
            );

            console.error(
                "Message:",
                fallbackError.message
            );

            throw fallbackError;
        }
    }
}


module.exports = {
    ai,
    generateWithFallback
};