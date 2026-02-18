const express = require("express");
const router = express.Router();
const db = require("../db");

// simple admin protection
function requireAdmin(req, res, next) {
  const key = req.header("x-admin-key");
  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ message: "ADMIN_KEY not set." });
  }
  if (key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ message: "Unauthorized." });
  }
  next();
}

// View users
router.get("/users", requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, email, email_verified, created_at
      FROM users
      ORDER BY id DESC
      LIMIT 200
    `).all();

    res.json({ users });
  } catch (err) {
    console.error("ADMIN_USERS_ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
