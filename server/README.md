# WhatsApp AI Reply - Server Modularization

This is the server.js split into smaller files while keeping the current behavior and the current `owner` user identity unchanged.

## Structure

server.js
config/ai.js
routes/authRoutes.js        # keep your existing file
routes/conversationRoutes.js
routes/profileRoutes.js
routes/replyRoutes.js
services/geminiService.js
services/memoryService.js
services/styleService.js
models/                    # keep your existing models
middleware/                 # keep your existing middleware

## Route mapping

Old POST /sync-conversation       -> POST /conversation/sync
Old POST /update-reply-mode       -> POST /profile/reply-mode
Old POST /generate-reply          -> POST /reply/generate

IMPORTANT: This modularization intentionally does NOT implement the multi-user/JWT migration yet. The current `userId: "owner"` and current Memory lookup behavior are preserved so we can refactor structure first, then do authentication/data isolation as the next step.

Before replacing your current server, back up the existing server.js.
