console.log("🤖 WhatsApp AI Reply started!");

async function getAuthToken() {
    const result = await chrome.storage.local.get("token");

    if (!result.token) {
        console.log("🔐 No login token found.");
        return null;
    }

    return result.token;
}


// ============================================================
// CURRENT WHATSAPP CHAT
// ============================================================

// ============================================================
// GET CURRENT WHATSAPP CHAT NAME
// ============================================================

// ============================================================
// GET CURRENT WHATSAPP CHAT NAME
// ============================================================

function getCurrentChatName() {

    const conversationHeader =
        document.querySelector(
            '[data-testid="conversation-header"]'
        );

    if (!conversationHeader) {

        console.log(
            "⚠️ Conversation header not found."
        );

        return null;
    }


    // ========================================================
    // Find the contact name
    // ========================================================

    const spans =
        conversationHeader.querySelectorAll("span");


    for (const span of spans) {

        const text =
            span.innerText?.trim();

        if (
            text &&
            text.length > 0 &&
            text.length < 100
        ) {

            return text;
        }
    }


    return null;
}

function logCurrentChat() {

    const chatName =
        getCurrentChatName();

    if (chatName) {

        console.log(
            "👤 Current WhatsApp chat:",
            chatName
        );

        return chatName;
    }

    return null;
}


// ============================================================
// Find the WhatsApp message container
// ============================================================

function findMessageContainer(element) {

    let current = element;

    for (let i = 0; i < 12 && current; i++) {

        if (current.hasAttribute("data-id")) {
            return current;
        }

        current = current.parentElement;
    }

    return null;
}


// ============================================================
// Find the visual message bubble
// ============================================================

function findBubble(element, messageContainer) {

    let current = element;

    let bestElement = null;
    let bestWidth = Infinity;

    while (
        current &&
        current !== messageContainer
    ) {

        const rect =
            current.getBoundingClientRect();

        /*
         * We want the smallest visible element
         * that contains the actual message text.
         */

        if (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.width < bestWidth
        ) {

            bestElement = current;
            bestWidth = rect.width;
        }

        current = current.parentElement;
    }

    return bestElement;
}


// ============================================================
// Extract messages
// ============================================================

function getMessages() {

    const textElements =
        document.querySelectorAll(
            'span.selectable-text.copyable-text'
        );

    const messages = [];

    textElements.forEach((textElement) => {

        const text =
            textElement.innerText?.trim();

        if (!text) {
            return;
        }


        // Find actual WhatsApp message container
        const messageContainer =
            findMessageContainer(textElement);

        if (!messageContainer) {
            return;
        }


        // Find the bubble
        const bubble =
            findBubble(
                textElement,
                messageContainer
            );

        if (!bubble) {
            return;
        }


        const containerRect =
            messageContainer.getBoundingClientRect();

        const bubbleRect =
            bubble.getBoundingClientRect();


        if (
            containerRect.width === 0 ||
            bubbleRect.width === 0
        ) {
            return;
        }


        // Centers
        const containerCenter =
            containerRect.left +
            containerRect.width / 2;

        const bubbleCenter =
            bubbleRect.left +
            bubbleRect.width / 2;


        /*
         * If the bubble center is to the right
         * of its message container center,
         * we consider it an outgoing message.
         */

        const sender =
            bubbleCenter > containerCenter
                ? "me"
                : "other";


        messages.push({

            id:
                messageContainer.getAttribute(
                    "data-id"
                ),

            sender: sender,

            text: text,

            bubbleLeft:
                Math.round(bubbleRect.left),

            bubbleRight:
                Math.round(bubbleRect.right),

            containerLeft:
                Math.round(containerRect.left),

            containerRight:
                Math.round(containerRect.right)
        });

    });


    // Remove duplicates
    const unique = [];

    const seen = new Set();

    messages.forEach((message) => {

        const key =
            message.id ||
            message.text +
            "|" +
            message.bubbleLeft +
            "|" +
            message.bubbleRight;

        if (!seen.has(key)) {

            seen.add(key);

            unique.push(message);
        }

    });


    return unique;
}


// ============================================================
// Print conversation
// ============================================================

function printConversation() {

    const messages =
        getMessages();


    // ========================================================
    // CURRENT CHAT
    // ========================================================

    const chatName =
        getCurrentChatName();

    console.log(
        "👤 Current WhatsApp chat:",
        chatName
    );


    console.log("");


    messages.forEach((message, index) => {

        console.log(
            `${index + 1}. [${message.sender}] ${message.text}`
        );

    });


    console.log(
        "======================================"
    );

    console.log(
        "Total messages:",
        messages.length
    );

    return messages;
}


// ============================================================
// Wait for WhatsApp messages
// ============================================================

function waitForMessages() {

    const messages =
        getMessages();

    if (messages.length > 0) {

        console.log(
            "✅ Found",
            messages.length,
            "WhatsApp messages."
        );

        printConversation();

        return;

    }


    console.log(
        "⏳ Waiting for WhatsApp messages..."
    );

    setTimeout(
        waitForMessages,
        1000
    );
}


// ============================================================
// Start
// ============================================================

setTimeout(() => {

    console.log(
        "🔍 Looking for WhatsApp conversation..."
    );

    waitForMessages();

}, 3000);


// ============================================================
// NEW MESSAGE DETECTOR
// ============================================================

// ============================================================
// WHATSAPP → GEMINI AI
// ============================================================

let previousLastMessageKey = null;
let watcherInitialized = false;
let generatingReply = false;


let currentChatName = null;

let lastSyncedConversationKey = null;


// ============================================================
// REMEMBER PROCESSED INCOMING MESSAGES
// ============================================================

const processedIncomingMessages =
    new Set();


// ============================================================
// REMEMBER GENERATED REPLIES
// ============================================================

const generatedReplies =
    new Map();


// ============================================================
// CURRENT CHAT
// ============================================================

let currentChatKey = null;

// ============================================================
// Create unique message key
// ============================================================

function getMessageKey(message) {

    if (message.id) {
        return message.id;
    }

    return `${message.sender}|${message.text}`;
}


// ============================================================
// Ask our Node.js server for an AI reply
// ============================================================

async function generateAIReply(
    conversation,
    newMessage,
    chatName,
    newMessageId
) {

    if (generatingReply) {

        console.log(
            "⏳ Already generating a reply..."
        );

        return;

    }

    generatingReply = true;

    try {

        const token = await getAuthToken();

        if (!token) {
            return;
        }

        console.log("🔐 AI request has authentication token");

        console.log("");
        console.log(
            "🚀 Sending conversation to Gemini..."
        );


        // Only send the most recent 15 messages
        const recentConversation =
            conversation.slice(-15);


        console.log(
            "📚 Context messages:",
            recentConversation.length
        );

        console.log(
            "🆕 New message:",
            newMessage
        );


        const response = await fetch(
            "https://whatsappreply.onrender.com/generate-reply",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify({

                    chatName:
                        chatName,

                    conversation:
                        conversation,

                    newMessage:
                        newMessage,

                    newMessageId:
                        newMessageId

                })

            }
        );


        if (!response.ok) {

            throw new Error(
                `Server returned HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.reply) {

            throw new Error(
                "No reply received from server"
            );

        }


        console.log("");
        console.log(
            "===================================="
        );

        console.log(
            "🤖 AI SUGGESTED REPLY"
        );

        console.log(
            "===================================="
        );

        console.log(
            data.reply
        );

        console.log(
            "===================================="
        );


        return data.reply;


    } catch (error) {

        console.error(
            "❌ AI REPLY ERROR:",
            error
        );

    } finally {

        generatingReply = false;

    }

}


// ============================================================
// PUT AI REPLY INTO WHATSAPP MESSAGE BOX
// ============================================================

function insertReplyIntoWhatsApp(reply) {

    console.log("📝 Looking for WhatsApp message box...");

    const inputs = [
        '[contenteditable="true"][role="textbox"]',
        '[contenteditable="true"]'
    ];

    let inputBox = null;

    for (const selector of inputs) {

        const elements =
            document.querySelectorAll(selector);

        for (const element of elements) {

            const rect =
                element.getBoundingClientRect();

            if (
                rect.width > 0 &&
                rect.height > 0
            ) {
                inputBox = element;
                break;
            }
        }

        if (inputBox) {
            break;
        }
    }

    if (!inputBox) {

        console.error(
            "❌ WhatsApp message box not found"
        );

        return false;
    }

    console.log(
        "✅ WhatsApp message box found"
    );


    // ========================================================
    // IMPORTANT: Don't insert the same reply twice
    // ========================================================

    const currentText =
        inputBox.innerText?.trim() || "";

    if (currentText === reply.trim()) {

        console.log(
            "⚠️ Reply is already in the message box. Skipping."
        );

        return false;
    }


    // ========================================================
    // Focus textbox
    // ========================================================

    inputBox.focus();


    // ========================================================
    // Select existing text
    // ========================================================

    const selection =
        window.getSelection();

    const range =
        document.createRange();

    range.selectNodeContents(inputBox);

    selection.removeAllRanges();

    selection.addRange(range);


    // ========================================================
    // Insert ONLY ONCE
    // ========================================================

    const inserted =
        document.execCommand(
            "insertText",
            false,
            reply
        );


    console.log(
        "🤖 Reply inserted:",
        reply
    );


    return true;
}





function watchChatChange() {

    const chatName = getCurrentChatName();

    if (!chatName) {
        return;
    }

    // First detected chat
    if (currentChatName === null) {

        currentChatName = chatName;

        console.log(
            "👤 Current WhatsApp chat:",
            currentChatName
        );

        return;
    }

    // Nothing changed
    if (chatName === currentChatName) {
        return;
    }

    // Chat changed
    console.log("");
    console.log("🔄 WHATSAPP CHAT CHANGED");
    console.log(
        "Previous:",
        currentChatName
    );
    console.log(
        "New:",
        chatName
    );

    currentChatName = chatName;

    // Reset message watcher for the new chat
    previousLastMessageKey = null;
    watcherInitialized = false;

    console.log(
        "🧠 Switched memory context to:",
        currentChatName
    );
}


// ============================================================
// SYNC WHATSAPP CONVERSATION TO MONGODB
// ============================================================

async function syncConversationToMongoDB(
    chatName,
    messages
) {

    if (!chatName) {
        return;
    }

    if (!messages || messages.length === 0) {
        return;
    }
    const result = await chrome.storage.local.get("token");
    console.log("🔐 Token from storage:", result.token);

    if (!result.token) {
        console.log("🔐 No login token found. Skipping MongoDB sync.");
        return;
    }

    try {

        const response =
            await fetch(
                "https://whatsappreply.onrender.com/sync-conversation",
                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${result.token}`
                    },
                    body: JSON.stringify({

                        chatName:
                            chatName,

                        messages:
                            messages.map(message => ({

                                id:
                                    message.id,

                                sender:
                                    message.sender,

                                text:
                                    message.text

                            }))

                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                `Server returned HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (data.added > 0) {

            console.log(
                "💾 MongoDB conversation sync:",
                chatName,
                "→",
                data.added,
                "new messages"
            );

        }

    } catch (error) {

        console.error(
            "❌ MongoDB sync failed:",
            error
        );

    }

}

// ============================================================
// Watch for a NEW incoming message
// ============================================================

// ============================================================
// WATCH FOR A NEW INCOMING MESSAGE
// ============================================================
async function getSendMode() {

    try {

        const result =
            await chrome.storage.local.get("sendMode");

        const sendMode =
            result.sendMode || "manual";

        console.log(
            "⚙️ Current send mode:",
            sendMode
        );

        return sendMode;

    } catch (error) {

        console.error(
            "❌ Could not get send mode:",
            error
        );

        // Safe default
        return "manual";
    }
}

function sendReplyInWhatsApp() {

    console.log(
        "📤 Looking for WhatsApp Send button..."
    );

    const sendSelectors = [
        'button[data-testid="send"]',
        'button[aria-label="Send"]',
        'button[title="Send"]'
    ];

    let sendButton = null;

    for (const selector of sendSelectors) {

        const button =
            document.querySelector(selector);

        if (button) {

            const rect =
                button.getBoundingClientRect();

            if (
                rect.width > 0 &&
                rect.height > 0
            ) {

                sendButton = button;
                break;
            }
        }
    }

    if (!sendButton) {

        console.error(
            "❌ WhatsApp Send button not found"
        );

        return false;
    }

    console.log(
        "✅ WhatsApp Send button found"
    );

    sendButton.click();

    console.log(
        "📤 AI reply sent automatically!"
    );

    return true;
}

function checkForNewMessage() {


    // ========================================================
    // GET CURRENT CHAT MESSAGES
    // ========================================================

    const messages =
        getMessages();


    const chatName =
        getCurrentChatName();

    if (
        chatName &&
        messages.length > 0
    ) {

        const latestMessage =
            messages[messages.length - 1];

        const conversationKey =
            `${chatName}|${getMessageKey(latestMessage)}`;


        if (
            conversationKey !==
            lastSyncedConversationKey
        ) {

            lastSyncedConversationKey =
                conversationKey;

            syncConversationToMongoDB(
                chatName,
                messages
            );

        }

    }

    if (messages.length === 0) {
        return;
    }




    /*
     * The extractor returns messages in conversation order.
     * The final message should therefore be the latest one.
     */

    const latestMessage =
        messages[messages.length - 1];


    const latestKey =
        getMessageKey(latestMessage);


    // ========================================================
    // FIRST RUN / NEW CHAT
    // ========================================================

    if (!watcherInitialized) {

        previousLastMessageKey =
            latestKey;

        watcherInitialized = true;

        console.log(
            "👀 AI message watcher initialized."
        );

        console.log(
            "Latest existing message:",
            latestMessage.sender,
            latestMessage.text
        );

        return;
    }


    // ========================================================
    // NOTHING CHANGED
    // ========================================================

    if (
        latestKey ===
        previousLastMessageKey
    ) {

        return;
    }


    // ========================================================
    // SOMETHING CHANGED
    // ========================================================

    previousLastMessageKey =
        latestKey;


    console.log("");
    console.log(
        "🆕 NEW WHATSAPP MESSAGE"
    );

    console.log(
        "Sender:",
        latestMessage.sender
    );

    console.log(
        "Text:",
        latestMessage.text
    );


    // ========================================================
    // ONLY REACT TO INCOMING MESSAGES
    // ========================================================

    if (
        latestMessage.sender !== "other"
    ) {

        console.log(
            "👤 This is your message. Ignoring."
        );

        return;
    }


    console.log(
        "🤖 Incoming message detected!"
    );


    // ========================================================
    // GENERATE AI REPLY
    // ========================================================

    // ============================================================
    // CAPTURE THE CHAT THAT CAUSED THIS AI REQUEST
    // ============================================================

    const requestChatName =
        getCurrentChatName();

    if (!requestChatName) {

        console.log(
            "⚠️ Could not identify current chat."
        );

        return;
    }

    console.log(
        "📌 AI request belongs to:",
        requestChatName
    );


    generateAIReply(
        messages,
        latestMessage.text,
        requestChatName,
        latestMessage.id
    )
        .then(reply => {

            if (!reply) {

                console.error(
                    "❌ No AI reply received"
                );

                return;
            }


            console.log(
                "📥 AI reply received by extension:"
            );

            console.log(reply);


            // ========================================================
            // CRITICAL SAFETY CHECK
            // ========================================================

            const activeChatName =
                getCurrentChatName();


            console.log(
                "🔍 Chat when reply arrived:",
                activeChatName
            );

            console.log(
                "🔍 Chat that requested reply:",
                requestChatName
            );


            if (
                activeChatName !==
                requestChatName
            ) {

                console.log("");
                console.log(
                    "🚨 CHAT CHANGED DURING AI GENERATION"
                );

                console.log(
                    "Reply belongs to:",
                    requestChatName
                );

                console.log(
                    "Current chat:",
                    activeChatName
                );

                console.log(
                    "🚫 REPLY DISCARDED — NOT INSERTED"
                );

                return;
            }


            // ========================================================
            // SAME CHAT → SAFE TO INSERT
            // ========================================================

           console.log(
    "✅ Same chat confirmed. Inserting reply..."
);

const inserted =
    insertReplyIntoWhatsApp(reply);

if (!inserted) {

    console.log(
        "❌ Reply could not be inserted."
    );

    return;
}


// ========================================================
// CHECK AUTO / MANUAL MODE
// ========================================================

getSendMode()
    .then(sendMode => {

        if (sendMode === "auto") {

            console.log(
                "🚀 AUTO MODE → Sending reply..."
            );

            // Small delay so WhatsApp can process
            // the inserted text before sending.
            setTimeout(() => {

                sendReplyInWhatsApp();

            }, 300);

        } else {

            console.log(
                "📝 MANUAL MODE → Reply inserted. Waiting for user."
            );

        }

    });
        });
}


// ============================================================
// Start watcher
// ============================================================

console.log(
    "👀 Starting WhatsApp → Gemini watcher..."
);


// ============================================================
// START WATCHERS
// ============================================================

setInterval(
    checkForNewMessage,
    1000
);

setInterval(
    watchChatChange,
    1000
);