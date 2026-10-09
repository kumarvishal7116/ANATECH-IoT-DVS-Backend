
/*
 * Project: ANATECH IoT (DVS) Backend
 * Author: Vishal Kumar
 * Copyright (c) 2026 Vishal Kumar. All rights reserved.
 */

const express = require("express");
const { submitOrder, getOrders } = require("./orderController");

const router = express.Router();

// POST /api/orders  — submit new order form data.
router.post("/", submitOrder);

// GET /api/orders   — fetch all order tracking records.
router.get("/", getOrders);

module.exports = router;
