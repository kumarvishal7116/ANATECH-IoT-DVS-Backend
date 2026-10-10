/*
 * Project: ANATECH IoT (DVS) Backend
 * Author: Vishal Kumar
 * Copyright (c) 2026 Vishal Kumar. All rights reserved.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const {
    buildOrderQuery,
    OrderFilterValidationError
} = require("./orderQueryBuilder");

test("returns every order when no filters are supplied", () => {
    assert.deepEqual(buildOrderQuery({}), {
        sql: "SELECT * FROM `Order_Tracking_Data` ORDER BY id DESC",
        values: []
    });
});

test("ignores empty filters and matches text as a literal substring", () => {
    const result = buildOrderQuery({
        buyer_code: "  ",
        colour: "navy%_blue"
    });

    assert.equal(
        result.sql,
        "SELECT * FROM `Order_Tracking_Data` WHERE `Colour` LIKE ? ORDER BY id DESC"
    );
    assert.deepEqual(result.values, ["%navy\\%\\_blue%"]);
});

test("rejects unrecognized filter names instead of querying all orders", () => {
    assert.throws(
        () => buildOrderQuery({ buyer: "ACME" }),
        /Unknown filter "buyer"/
    );
});

test("accepts camelCase filter names without dropping the filter", () => {
    const result = buildOrderQuery({ buyerCode: "ACME" });

    assert.match(result.sql, /WHERE `Buyer Code` LIKE \?/);
    assert.deepEqual(result.values, ["%ACME%"]);
});

test("combines exact, date-range, and quantity-range filters", () => {
    const result = buildOrderQuery({
        buyer_code: "ACME",
        order_received_date_from: "2026-01-01",
        order_received_date_to: "2026-01-31",
        order_qty_min: "10",
        order_qty_max: "50"
    });

    assert.equal(
        result.sql,
        "SELECT * FROM `Order_Tracking_Data` WHERE `Buyer Code` LIKE ? AND `Order Received Date` >= ? AND `Order Received Date` <= ? AND `Order Qty` >= ? AND `Order Qty` <= ? ORDER BY id DESC"
    );
    assert.deepEqual(result.values, ["%ACME%", "2026-01-01", "2026-01-31", 10, 50]);
});

test("rejects invalid dates and reversed ranges", () => {
    assert.throws(
        () => buildOrderQuery({ production_start_date: "2026-02-30" }),
        OrderFilterValidationError
    );
    assert.throws(
        () => buildOrderQuery({
            expected_dispatch_date_from: "2026-03-01",
            expected_dispatch_date_to: "2026-02-28"
        }),
        OrderFilterValidationError
    );
});

test("rejects non-integer quantities", () => {
    assert.throws(
        () => buildOrderQuery({ order_qty: "2.5" }),
        OrderFilterValidationError
    );
});
