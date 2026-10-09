
/*
 * Project: ANATECH IoT (DVS) Backend
 * Author: Vishal Kumar
 * Copyright (c) 2026 Vishal Kumar. All rights reserved.
 */

const pool = require("../../config/db");

// POST /api/orders
// Accepts form data and inserts a new record into Order_Tracking_Data.
const submitOrder = async (req, res) => {
    try {
        const {
            order_received_date,
            buyer_code,
            style_code_name,
            colour,
            yarn_colour,
            wool_grade_micron,
            product_name_style_description,
            order_qty,
            production_start_date,
            expected_dispatch_date
        } = req.body;

        // Validate required fields (non-nullable columns).
        if (
            !order_received_date ||
            !yarn_colour ||
            order_qty === undefined || order_qty === null || order_qty === "" ||
            !production_start_date ||
            !expected_dispatch_date
        ) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: order_received_date, yarn_colour, order_qty, production_start_date, expected_dispatch_date."
            });
        }

        const sql = `
            INSERT INTO \`Order_Tracking_Data\`
            (
                \`Order Received Date\`,
                \`Buyer Code\`,
                \`Style Code/ Name\`,
                \`Colour\`,
                \`Which colour of yarn should be used\`,
                \`Wool Grade/ Micron\`,
                \`Product name or Style Description\`,
                \`Order Qty\`,
                \`Production Start Date\`,
                \`Expected Dispatch Date\`
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            order_received_date,
            buyer_code || null,
            style_code_name || null,
            colour || null,
            yarn_colour,
            wool_grade_micron || null,
            product_name_style_description || null,
            Number(order_qty),
            production_start_date,
            expected_dispatch_date
        ];

        const [result] = await pool.execute(sql, values);

        return res.status(201).json({
            success: true,
            message: "Order submitted successfully.",
            inserted_id: result.insertId
        });

    } catch (error) {
        console.error("Submit order error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};

// GET /api/orders
// Fetches all records from Order_Tracking_Data.
const getOrders = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT * FROM \`Order_Tracking_Data\` ORDER BY id DESC`
        );

        return res.status(200).json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error("Fetch orders error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};

module.exports = { submitOrder, getOrders };
