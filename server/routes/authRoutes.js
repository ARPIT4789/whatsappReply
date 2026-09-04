const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();


// ============================================================
// REGISTER
// ============================================================

router.post("/register", async (req, res) => {

    try {

        const { name, email, password } = req.body;

        // Check required fields
        if (!name || !email || !password) {

            return res.status(400).json({
                success: false,
                error: "Name, email and password are required"
            });

        }


        // Check password length
        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                error: "Password must be at least 6 characters"
            });

        }


        // Check if user already exists
        const existingUser =
            await User.findOne({
                email: email.toLowerCase()
            });

        if (existingUser) {

            return res.status(409).json({
                success: false,
                error: "User already exists"
            });

        }


        // Hash password
        const hashedPassword =
            await bcrypt.hash(password, 10);


        // Create user
        const user =
            await User.create({

                name: name.trim(),

                email: email.toLowerCase(),

                password: hashedPassword

            });


        console.log(
            "👤 New user registered:",
            user.email
        );


        return res.status(201).json({

            success: true,

            message: "Registration successful",

            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }

        });

    } catch (error) {

        console.error(
            "❌ Registration error:",
            error
        );

        return res.status(500).json({

            success: false,

            error: "Registration failed"

        });

    }

});


// ============================================================
// LOGIN
// ============================================================

router.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {

            return res.status(400).json({
                success: false,
                error: "Email and password are required"
            });

        }

        // Find user
        const user =
            await User.findOne({
                email: email.toLowerCase()
            });

        if (!user) {

            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });

        }

        // Compare password
        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });

        }

        // Create JWT token
        const token =
            jwt.sign(
                {
                    userId: user._id.toString()
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );

        console.log(
            "🔐 User logged in:",
            user.email
        );

        return res.json({

            success: true,

            message: "Login successful",

            token: token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }

        });

    } catch (error) {

        console.error(
            "❌ Login error:",
            error
        );

        return res.status(500).json({

            success: false,

            error: "Login failed"

        });

    }

});



const authenticateUser =
    require("../middleware/authMiddleware");


// ============================================================
// TEST AUTHENTICATION
// ============================================================

router.get(
    "/me",
    authenticateUser,
    async (req, res) => {

        return res.json({
            success: true,
            message: "Authentication working",
            userId: req.user.userId
        });

    }
);

module.exports = router;