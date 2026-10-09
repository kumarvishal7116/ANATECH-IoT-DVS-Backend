
/*
 * Project: ANATECH IoT (DVS) Login API
 * Author: Vishal Kumar
 * Copyright (c) 2026 Vishal Kumar. All rights reserved.
 */

const express = require("express");
const { login } = require("./authController");

const router = express.Router();

router.post("/login", login);

module.exports = router;
