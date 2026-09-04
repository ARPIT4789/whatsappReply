const jwt = require("jsonwebtoken");

function authenticateUser(req, res, next) {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {

            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });

        }

        // Expected:
        // Authorization: Bearer TOKEN

        const parts = authHeader.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer"
        ) {

            return res.status(401).json({
                success: false,
                error: "Invalid authorization format"
            });

        }

        const token = parts[1];

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        // Store authenticated user information
        // so routes can access it using req.user

        req.user = {
            userId: decoded.userId
        };

        next();

    } catch (error) {

        console.error(
            "❌ Authentication error:",
            error.message
        );

        return res.status(401).json({
            success: false,
            error: "Invalid or expired token"
        });

    }
}

module.exports = authenticateUser;