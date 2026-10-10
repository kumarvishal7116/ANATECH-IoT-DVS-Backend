
/*
 * Project: ANATECH IoT (DVS) Backend
 * Author: Vishal Kumar
 * Copyright (c) 2026 Vishal Kumar. All rights reserved.
 */

const pool = require("../../config/db");
const {
    buildOrderQuery,
    OrderFilterValidationError
} = require("./orderQueryBuilder");

const ORDER_URN_LOCK_NAME = "order_tracking_data_urn";

// POST /api/orders
// Accepts form data and inserts a new record into Order_Tracking_Data.
const submitOrder = async (req, res) => {
    let connection;
    let urnLockAcquired = false;

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

        connection = await pool.getConnection();

        const [lockRows] = await connection.execute(
            "SELECT GET_LOCK(?, 10) AS lock_acquired",
            [ORDER_URN_LOCK_NAME]
        );

        if (!lockRows[0] || lockRows[0].lock_acquired !== 1) {
            const error = new Error("Timed out waiting to generate the next order URN.");
            error.code = "ORDER_URN_LOCK_TIMEOUT";
            throw error;
        }

        urnLockAcquired = true;

        const [urnRows] = await connection.execute(
            "SELECT GREATEST(COALESCE(MAX(CAST(`URN` AS UNSIGNED)), 999), 999) + 1 AS next_urn FROM `Order_Tracking_Data`"
        );
        const urn = urnRows[0].next_urn;

        const [result] = await connection.execute(
            `
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
                    \`Expected Dispatch Date\`,
                    \`URN\`
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [...values, urn]
        );

        return res.status(201).json({
            success: true,
            message: "Order submitted successfully.",
            inserted_id: result.insertId
        });

    } catch (error) {
        console.error("Submit order error:", error.message);

        if (error.code === "ORDER_URN_LOCK_TIMEOUT") {
            return res.status(503).json({
                success: false,
                message: "Could not generate an order URN. Please retry."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    } finally {
        if (connection) {
            if (urnLockAcquired) {
                try {
                    const [releaseRows] = await connection.execute(
                        "SELECT RELEASE_LOCK(?) AS lock_released",
                        [ORDER_URN_LOCK_NAME]
                    );

                    if (!releaseRows[0] || releaseRows[0].lock_released !== 1) {
                        console.error("Order URN lock was not released by the database.");
                    }
                } catch (error) {
                    console.error("Failed to release order URN lock:", error.message);
                }
            }

            connection.release();
        }
    }
};

// GET /api/orders
// Fetches matching records from Order_Tracking_Data, or all records without filters.
const getOrders = async (req, res) => {
    try {
        const { sql, values } = buildOrderQuery(req.query);
        const [rows] = await pool.execute(sql, values);

        return res.status(200).json({
            success: true,
            data: rows
        });

    } catch (error) {
        if (error instanceof OrderFilterValidationError) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Fetch orders error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};

module.exports = { submitOrder, getOrders };
