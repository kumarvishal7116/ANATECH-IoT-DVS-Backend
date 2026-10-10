/*
 * Project: ANATECH IoT (DVS) Backend
 * Author: Vishal Kumar
 * Copyright (c) 2026 Vishal Kumar. All rights reserved.
 */

class OrderFilterValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "OrderFilterValidationError";
    }
}

const textFilters = {
    buyer_code: "`Buyer Code`",
    style_code_name: "`Style Code/ Name`",
    colour: "`Colour`",
    yarn_colour: "`Which colour of yarn should be used`",
    wool_grade_micron: "`Wool Grade/ Micron`",
    product_name_style_description: "`Product name or Style Description`"
};

const dateFilters = {
    order_received_date: "`Order Received Date`",
    production_start_date: "`Production Start Date`",
    expected_dispatch_date: "`Expected Dispatch Date`"
};

function readFilter(query, name) {
    const value = query[name];

    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value !== "string") {
        throw new OrderFilterValidationError(`${name} must be a single value.`);
    }

    const trimmedValue = value.trim();
    return trimmedValue === "" ? undefined : trimmedValue;
}

function escapeLikeValue(value) {
    return value.replace(/[\\%_]/g, "\\$&");
}

function parseDate(value, name) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new OrderFilterValidationError(`${name} must use YYYY-MM-DD format.`);
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        throw new OrderFilterValidationError(`${name} must be a valid date.`);
    }

    return value;
}

function parseInteger(value, name) {
    if (!/^-?\d+$/.test(value)) {
        throw new OrderFilterValidationError(`${name} must be an integer.`);
    }

    const parsedValue = Number(value);

    if (!Number.isSafeInteger(parsedValue)) {
        throw new OrderFilterValidationError(`${name} must be a safe integer.`);
    }

    return parsedValue;
}

function buildOrderQuery(query) {
    const conditions = [];
    const values = [];

    for (const [filterName, columnName] of Object.entries(textFilters)) {
        const value = readFilter(query, filterName);

        if (value !== undefined) {
            conditions.push(`${columnName} LIKE ?`);
            values.push(`%${escapeLikeValue(value)}%`);
        }
    }

    for (const [filterName, columnName] of Object.entries(dateFilters)) {
        const exactValue = readFilter(query, filterName);
        const fromValue = readFilter(query, `${filterName}_from`);
        const toValue = readFilter(query, `${filterName}_to`);

        if (exactValue !== undefined) {
            conditions.push(`${columnName} = ?`);
            values.push(parseDate(exactValue, filterName));
        }

        if (fromValue !== undefined) {
            conditions.push(`${columnName} >= ?`);
            values.push(parseDate(fromValue, `${filterName}_from`));
        }

        if (toValue !== undefined) {
            conditions.push(`${columnName} <= ?`);
            values.push(parseDate(toValue, `${filterName}_to`));
        }

        if (fromValue !== undefined && toValue !== undefined && fromValue > toValue) {
            throw new OrderFilterValidationError(
                `${filterName}_from must not be later than ${filterName}_to.`
            );
        }
    }

    const orderQty = readFilter(query, "order_qty");
    const minOrderQty = readFilter(query, "order_qty_min");
    const maxOrderQty = readFilter(query, "order_qty_max");

    if (orderQty !== undefined) {
        conditions.push("`Order Qty` = ?");
        values.push(parseInteger(orderQty, "order_qty"));
    }

    if (minOrderQty !== undefined) {
        conditions.push("`Order Qty` >= ?");
        values.push(parseInteger(minOrderQty, "order_qty_min"));
    }

    if (maxOrderQty !== undefined) {
        conditions.push("`Order Qty` <= ?");
        values.push(parseInteger(maxOrderQty, "order_qty_max"));
    }

    if (
        minOrderQty !== undefined &&
        maxOrderQty !== undefined &&
        parseInteger(minOrderQty, "order_qty_min") > parseInteger(maxOrderQty, "order_qty_max")
    ) {
        throw new OrderFilterValidationError(
            "order_qty_min must not be greater than order_qty_max."
        );
    }

    const whereClause = conditions.length > 0
        ? ` WHERE ${conditions.join(" AND ")}`
        : "";

    return {
        sql: `SELECT * FROM \`Order_Tracking_Data\`${whereClause} ORDER BY id DESC`,
        values
    };
}

module.exports = { buildOrderQuery, OrderFilterValidationError };
