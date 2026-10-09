
/*
 * Project: ANATECH IoT (DVS) Backend
 * Author: Vishal Kumar
 * Copyright (c) 2026 Vishal Kumar. All rights reserved.
 */

require("dotenv").config();

const express = require("express");
const authRoutes = require("./modules/auth/authRoutes");
const orderRoutes = require("./modules/orders/orderRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Public health endpoint.
app.get("/api/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "ANATECH IoT (DVS) Backend is running."
    });
});

// Login API routes.
app.use("/api/auth", authRoutes);

// Order Tracking API routes.
app.use("/api/orders", orderRoutes);


// Handle unknown endpoints.
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

// Central error handler.
app.use((err, req, res, next) => {
    console.error("Unhandled application error:", err.message);

    if (res.headersSent) {
        return next(err);
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error."
    });
});

app.listen(PORT, () => {
    console.log(`ANATECH IoT (DVS) Backend running on port ${PORT}`);
});
