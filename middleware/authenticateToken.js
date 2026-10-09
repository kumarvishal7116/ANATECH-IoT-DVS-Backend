
/*
 * Project: ANATECH IoT (DVS) JWT Middleware
 * Author: Vishal Kumar
 * Copyright (c) 2026 Vishal Kumar. All rights reserved.
 */

const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    // Require a Bearer token in the Authorization header.
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Authentication token is required."
        });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Authentication token is required."
        });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        // Configuration errors should not be treated as invalid user tokens.
        console.error("JWT_SECRET is missing from the environment configuration.");

        return res.status(500).json({
            success: false,
            message: "Internal server configuration error."
        });
    }

    jwt.verify(token, jwtSecret, (err, decodedToken) => {
        if (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Authentication token has expired."
                });
            }

            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        // Make the verified claims available to later middleware and controllers.
        req.user = decodedToken;

        return next();
    });
}

module.exports = authenticateToken;
