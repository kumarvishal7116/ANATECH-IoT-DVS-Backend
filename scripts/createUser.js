
/*
 * Project: ANATECH IoT (DVS) Login API
 * Author: Vishal Kumar
 * Copyright (c) 2026 Vishal Kumar. All rights reserved.
 */

require("dotenv").config();

const bcrypt = require("bcrypt");
const { read } = require("read");
const pool = require("../config/db");


async function prompt(question, options = {}) {
    return await read({
        prompt: question,
        silent: options.silent || false,
        replace: options.silent ? "" : undefined
    });
}


async function createUser() {
    try {
        console.log("\n=== ANATECH User Creation ===\n");

        const name = (await prompt("Enter user's name: ")).trim();
        const email = (await prompt("Enter user's email: "))
            .trim()
            .toLowerCase();
        const password = await prompt("Enter initial password: ", {
            silent: true
        });
        console.log("");

        const role = (
            await prompt("Enter role (employee/manager): ")
        ).trim().toLowerCase();

        // Validate required fields
        if (!name || !email || !password) {
            throw new Error("Name, email and password are required.");
        }

        // Basic email format validation
       if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
}

        // Only allow supported roles
        if (!["employee", "manager"].includes(role)) {
            throw new Error("Role must be employee or manager.");
        }

        // Require a strong initial password
        if (password.length < 12) {
            throw new Error(
                "Password must contain at least 12 characters."
            );
        }

        // Check whether the email already exists
        const [existingUsers] = await pool.execute(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (existingUsers.length > 0) {
            throw new Error("A user with this email already exists.");
        }

        // Hash the password before storing it
        const passwordHash = await bcrypt.hash(password, 12);

        // Insert the approved account into MySQL
        const [result] = await pool.execute(
            `INSERT INTO users
                (name, email, password_hash, role, is_active)
             VALUES (?, ?, ?, ?, TRUE)`,
            [name, email, passwordHash, role]
        );

        console.log("\nUser created successfully!");
        console.log("User ID:", result.insertId);
        console.log("Email:", email);
        console.log("Role:", role);
        console.log("Account status: Active");
        console.log("Password stored as a bcrypt hash.");

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            console.error("\nError: This email already exists.");
        } else {
            console.error("\nUser creation failed:", error.message);
        }

        process.exitCode = 1;

    } finally {
        await pool.end();
    }
}

createUser();
