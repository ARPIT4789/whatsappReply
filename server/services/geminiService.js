async function generateWithFallback(contents) {
    try {
        return await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents
        });
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
            "Trying Gemini 3.6 Flash..."
        );

        return await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents
        });
    }
}