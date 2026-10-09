
/*
 * Project: ANATECH IoT (DVS) Login API
 * Author: Vishal Kumar
 * Copyright (c) 2026 Vishal Kumar. All rights reserved.
 */

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find the user in MySQL
        const [users] = await pool.execute(
            `SELECT id, name, email, password_hash, role, is_active
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [email.trim()]
        );

        // Reject unknown users
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        // Reject disabled accounts
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "This account is inactive"
            });
        }

        // Compare the submitted password with its bcrypt hash
        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Ensure JWT configuration is available
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");

            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }

        // Generate JWT with the user's ID and role
        const token = jwt.sign(
            {
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                subject: String(user.id),
                expiresIn: process.env.JWT_EXPIRES_IN || "1h"
            }
        );

        // Return the token and safe user details
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = { login };
