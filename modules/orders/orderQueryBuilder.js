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

const allowedFilterNames = new Set([
    ...Object.keys(textFilters),
    ...Object.keys(dateFilters),
    ...Object.keys(dateFilters).flatMap((name) => [`${name}_from`, `${name}_to`]),
    "order_qty",
    "order_qty_min",
    "order_qty_max"
]);

const filterAliases = {
    buyerCode: "buyer_code",
    styleCodeName: "style_code_name",
    yarnColour: "yarn_colour",
    woolGradeMicron: "wool_grade_micron",
    productNameStyleDescription: "product_name_style_description",
    orderReceivedDate: "order_received_date",
    orderReceivedDateFrom: "order_received_date_from",
    orderReceivedDateTo: "order_received_date_to",
    productionStartDate: "production_start_date",
    productionStartDateFrom: "production_start_date_from",
    productionStartDateTo: "production_start_date_to",
    expectedDispatchDate: "expected_dispatch_date",
    expectedDispatchDateFrom: "expected_dispatch_date_from",
    expectedDispatchDateTo: "expected_dispatch_date_to",
    orderQty: "order_qty",
    orderQtyMin: "order_qty_min",
    orderQtyMax: "order_qty_max"
};

function normalizeFilterNames(query) {
    const normalizedQuery = {};

    for (const [name, value] of Object.entries(query)) {
        const normalizedName = filterAliases[name] || name;

        if (Object.hasOwn(normalizedQuery, normalizedName)) {
            throw new OrderFilterValidationError(
                `Filter "${normalizedName}" was provided more than once.`
            );
        }

        normalizedQuery[normalizedName] = value;
    }

    return normalizedQuery;
}

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
    const normalizedQuery = normalizeFilterNames(query);

    for (const name of Object.keys(normalizedQuery)) {
        if (!allowedFilterNames.has(name)) {
            throw new OrderFilterValidationError(
                `Unknown filter "${name}". Check the supported filter parameter names.`
            );
        }
    }

    const conditions = [];
    const values = [];

    for (const [filterName, columnName] of Object.entries(textFilters)) {
        const value = readFilter(normalizedQuery, filterName);

        if (value !== undefined) {
            conditions.push(`${columnName} LIKE ?`);
            values.push(`%${escapeLikeValue(value)}%`);
        }
    }

    for (const [filterName, columnName] of Object.entries(dateFilters)) {
        const exactValue = readFilter(normalizedQuery, filterName);
        const fromValue = readFilter(normalizedQuery, `${filterName}_from`);
        const toValue = readFilter(normalizedQuery, `${filterName}_to`);

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

    const orderQty = readFilter(normalizedQuery, "order_qty");
    const minOrderQty = readFilter(normalizedQuery, "order_qty_min");
    const maxOrderQty = readFilter(normalizedQuery, "order_qty_max");

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
