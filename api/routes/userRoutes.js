const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();

/** Shared: select the full "me" shape */
function selectMe(userId) {
  return db
    .prepare(
      `SELECT
        id,
        username,
        email,
        display_name,
        bio,
        location,
        avatar_url,
        email_verified,
        verified_account,
        phone_verified,
        profile_completed,
        created_at
      FROM users
      WHERE id = ?`
    )
    .get(userId);
}

/** Shared: SQLite 0/1 -> boolean */
function normalizeBooleans(user) {
  user.email_verified = !!user.email_verified;
  user.verified_account = !!user.verified_account;
  user.phone_verified = !!user.phone_verified;
  user.profile_completed = !!user.profile_completed;
  return user;
}

/** Shared: compute completeness (same rules as frontend) */
function computeCompleted(user) {
  return (
    !!user.email_verified &&
    !!String(user.display_name || "").trim() &&
    !!String(user.bio || "").trim() &&
    !!String(user.location || "").trim() &&
    !!String(user.avatar_url || "").trim()
  );
}

/**
 * ✅ GET /users/me (private)
 * Returns the currently logged-in user's full profile
 */
router.get("/me", requireAuth, (req, res) => {
  const user = selectMe(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json({ user: normalizeBooleans(user) });
});

/**
 * ✅ PUT /users/me (private)
 * Update my profile + auto-update profile_completed based on DB truth
 */
router.put("/me", requireAuth, (req, res) => {
  const { display_name, bio, location, avatar_url } = req.body || {};

  const current = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!current) return res.status(404).json({ message: "User not found" });

  const nextDisplay = display_name ?? current.display_name ?? "";
  const nextBio = bio ?? current.bio ?? "";
  const nextLocation = location ?? current.location ?? "";
  const nextAvatar = avatar_url ?? current.avatar_url ?? "";

  // Update profile fields
  db.prepare(
    `UPDATE users
     SET display_name = ?, bio = ?, location = ?, avatar_url = ?
     WHERE id = ?`
  ).run(nextDisplay, nextBio, nextLocation, nextAvatar, req.user.id);

  // Re-read and compute completion using DB truth
  const fresh = selectMe(req.user.id);
  if (!fresh) return res.status(404).json({ message: "User not found" });

  const completed = computeCompleted(fresh);

  // Persist completion flag
  db.prepare(`UPDATE users SET profile_completed = ? WHERE id = ?`).run(completed ? 1 : 0, req.user.id);

  // Final response
  const updated = selectMe(req.user.id);
  if (!updated) return res.status(404).json({ message: "User not found" });

  res.json({ user: normalizeBooleans(updated) });
});

/**
 * ✅ POST /users/me/verify-email (private)
 * DEV ONLY: marks the logged-in user as email verified
 * ALSO recomputes profile_completed so UI updates immediately.
 * IMPORTANT: must be ABOVE "/:username" or it will get treated as a username.
 */
router.post("/me/verify-email", requireAuth, (req, res) => {
  db.prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(req.user.id);

  const fresh = selectMe(req.user.id);
  if (!fresh) return res.status(404).json({ message: "User not found" });

  const completed = computeCompleted(fresh);
  db.prepare(`UPDATE users SET profile_completed = ? WHERE id = ?`).run(completed ? 1 : 0, req.user.id);

  const user = selectMe(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json({ user: normalizeBooleans(user) });
});

/**
 * ✅ GET /users/:username (public)
 * Public profile lookup
 * IMPORTANT: keep this LAST.
 */
router.get("/:username", (req, res) => {
  const username = String(req.params.username || "").trim();

  const user = db
    .prepare(
      `SELECT
        username,
        display_name,
        bio,
        location,
        avatar_url,
        created_at
      FROM users
      WHERE username = ?`
    )
    .get(username);

  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
});

module.exports = router;
