const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("../db");
const { createToken, requireAuth } = require("../auth");
const { Resend } = require("resend");

const router = express.Router();

const normalize = (s) => String(s || "").trim().toLowerCase();
const resend = new Resend(process.env.RESEND_API_KEY);

function sender() {
  // ✅ MUST be set in Render env now (you fixed this)
  return process.env.RESEND_FROM || "Lincani <verify@lincani.com>";
}
function appUrl() {
  // ✅ should be your real site
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function sendVerifyEmail(toEmail, token) {
 const verifyLink = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;

 

  try {
    const result = await resend.emails.send({
      from: sender(),
      to: [toEmail],
      subject: "Verify your Lincani email",
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6;">
          <h2>Verify your email</h2>
          <p>Thanks for signing up for Lincani. Click the button below to verify your email.</p>
          <p style="margin: 18px 0;">
            <a href="${verifyLink}"
               style="display:inline-block;padding:12px 16px;border-radius:12px;background:#4681f4;color:white;text-decoration:none;font-weight:700;">
              Verify Email
            </a>
          </p>
          <p style="color:#666;font-size:12px;">
            This link expires in 24 hours. If you didn’t create this account, you can ignore this email.
          </p>
        </div>
      `,
    });

    // Resend sometimes returns { data, error } style
    if (result?.error) throw result.error;
    return { ok: true };
  } catch (err) {
    console.error("RESEND_SEND_VERIFY_ERROR:", err);
    return { ok: false, error: err };
  }
}

/* ================= SIGNUP ================= */

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, agreedToTerms } = req.body;

    if (!agreedToTerms) {
      return res.status(400).json({ message: "You must agree to the Terms of Service." });
    }
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const e = normalize(email);

    const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(e);
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 12);

    const info = db
      .prepare("INSERT INTO users (username, email, password, display_name) VALUES (?, ?, ?, ?)")
      .run(name, e, hashed, name);

    const userId = info.lastInsertRowid;

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    db.prepare(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at, used)
       VALUES (?, ?, ?, 0)`
    ).run(userId, token, expiresAt);

    // ✅ IMPORTANT: Do NOT fail signup if email sending fails
    const mail = await sendVerifyEmail(e, token);

    return res.status(201).json({
      ok: true,
      message: mail.ok
        ? "Signup successful. Please verify your email to continue."
        : "Account created, but verification email could not be sent. Use 'Resend verification' on the login screen.",
      emailStatus: mail.ok ? "sent" : "failed",
    });
  } catch (err) {
    console.error("SIGNUP_ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ================= VERIFY EMAIL ================= */
/**
 * Your frontend Verify page calls:
 *   `${API_BASE}/auth/verify-email?token=...`
 * so this must be /verify-email (NOT /verify-email on the frontend route)
 */
router.get("/verify-email", (req, res) => {
  try {
    const token = String(req.query.token || "").trim();
    if (!token) return res.status(400).json({ message: "Missing token" });

    const row = db
      .prepare(
        `SELECT id, user_id, expires_at, used
         FROM email_verification_tokens
         WHERE token = ?`
      )
      .get(token);

    if (!row) return res.status(400).json({ message: "Invalid or expired token" });
    if (row.used) return res.status(400).json({ message: "This verification link was already used" });

    if (Number(row.expires_at) < Date.now()) {
      return res.status(400).json({ message: "Verification link expired. Please request a new one." });
    }

    db.prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(row.user_id);
    db.prepare(`UPDATE email_verification_tokens SET used = 1 WHERE id = ?`).run(row.id);

    return res.json({ ok: true, message: "Email verified. You can now log in." });
  } catch (err) {
    console.error("VERIFY_EMAIL_ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ================= RESEND VERIFICATION ================= */

router.post("/resend-verification", async (req, res) => {
  try {
    const e = normalize(req.body?.email);
    if (!e) return res.status(400).json({ message: "Email is required" });

    const user = db.prepare("SELECT id, email_verified FROM users WHERE email = ?").get(e);

    // ✅ Always return 200 to avoid email enumeration
    if (!user) {
      return res.status(200).json({
        ok: true,
        message: "If that email exists, we sent a verification link.",
      });
    }

    if (user.email_verified) {
      return res.status(200).json({
        ok: true,
        message: "Email already verified. You can log in.",
      });
    }

    // Invalidate old tokens
    db.prepare(`UPDATE email_verification_tokens SET used = 1 WHERE user_id = ?`).run(user.id);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    db.prepare(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at, used)
       VALUES (?, ?, ?, 0)`
    ).run(user.id, token, expiresAt);

    const mail = await sendVerifyEmail(e, token);

    return res.status(200).json({
      ok: true,
      message: mail.ok
        ? "Verification email resent. Check your inbox."
        : "We couldn’t send the email right now. Try again in a minute.",
      emailStatus: mail.ok ? "sent" : "failed",
    });
  } catch (err) {
    console.error("RESEND_VERIFY_FATAL_ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ================= LOGIN ================= */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const e = normalize(email);

    const row = db
      .prepare(
        `SELECT id, username, email, password, created_at, email_verified
         FROM users
         WHERE email = ?`
      )
      .get(e);

    if (!row) return res.status(401).json({ message: "Invalid login" });

    const valid = await bcrypt.compare(password, row.password);
    if (!valid) return res.status(401).json({ message: "Invalid login" });

    if (!row.email_verified) {
      return res.status(403).json({
        message: "Email not verified. Please check your inbox or resend verification.",
      });
    }

    const user = {
      id: row.id,
      username: row.username,
      email: row.email,
      created_at: row.created_at,
    };

    const token = createToken(user);
    return res.json({ token, user });
  } catch (err) {
    console.error("LOGIN_ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ================= CURRENT USER ================= */

router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, username, email, created_at FROM users WHERE id = ?")
    .get(req.user.id);

  return res.json({ user });
});

module.exports = router;
