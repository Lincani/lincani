const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const db = require("../db");
const { requireAuth } = require("../middleware/requireAuth");

// Ensure uploads folder exists (you already serve /uploads in server.js)
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer setup for story uploads (image/video)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `story_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const nowMs = () => Date.now();
const hoursToMs = (h) => Number(h) * 60 * 60 * 1000;

// -----------------------------
// POST /stories
// Create a story:
// - type=media: upload file (field name "media"), optional caption
// - type=post:  provide postId, optional caption
// optional: expiresInHours (default 24)
// -----------------------------
router.post("/", requireAuth, upload.single("media"), (req, res) => {
  try {
    const userId = req.user.id;

    const type = String(req.body.type || "").trim(); // 'media' | 'post'
    const caption = String(req.body.caption || "");
    const expiresInHours = req.body.expiresInHours ? Number(req.body.expiresInHours) : 24;

    const createdAt = nowMs();
    const expiresAt = createdAt + hoursToMs(Number.isFinite(expiresInHours) ? expiresInHours : 24);

    if (type !== "media" && type !== "post") {
      return res.status(400).json({ message: "type must be 'media' or 'post'." });
    }

    let mediaType = "";
    let mediaUrl = "";
    let postId = null;

    if (type === "media") {
      if (!req.file) return res.status(400).json({ message: "Missing media file." });

      const mimetype = req.file.mimetype || "";
      mediaType = mimetype.startsWith("video/") ? "video" : "image";
      mediaUrl = `/uploads/${req.file.filename}`;
    }

    if (type === "post") {
      const postIdRaw = req.body.postId;
      postId = postIdRaw ? Number(postIdRaw) : null;

      if (!postId || !Number.isFinite(postId)) {
        return res.status(400).json({ message: "Missing or invalid postId." });
      }

      // validate post exists
      const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
      if (!post) return res.status(404).json({ message: "Post not found." });
    }

    const stmt = db.prepare(`
      INSERT INTO stories (user_id, type, caption, media_type, media_url, post_id, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(userId, type, caption, mediaType, mediaUrl, postId, createdAt, expiresAt);

    return res.json({
      story: {
        id: info.lastInsertRowid,
        user_id: userId,
        type,
        caption,
        media_type: mediaType,
        media_url: mediaUrl,
        post_id: postId,
        created_at: createdAt,
        expires_at: expiresAt,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error creating story." });
  }
});

// -----------------------------
// GET /stories/feed
// Active stories grouped by user (for the story bar with avatar rings)
// -----------------------------
router.get("/feed", requireAuth, (req, res) => {
  try {
    const now = nowMs();

    const rows = db.prepare(`
      SELECT
        s.id as story_id,
        s.user_id,
        s.type,
        s.caption,
        s.media_type,
        s.media_url,
        s.post_id,
        s.created_at,
        s.expires_at,
        u.username,
        u.avatar_url,
        u.display_name
      FROM stories s
      JOIN users u ON u.id = s.user_id
      WHERE s.expires_at > ?
      ORDER BY s.user_id, s.created_at DESC
    `).all(now);

    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.user_id)) {
        map.set(r.user_id, {
          user: {
            id: r.user_id,
            username: r.username,
            display_name: r.display_name || "",
            avatar_url: r.avatar_url || "",
          },
          stories: [],
        });
      }

      map.get(r.user_id).stories.push({
        id: r.story_id,
        type: r.type,
        caption: r.caption,
        media_type: r.media_type,
        media_url: r.media_url,
        post_id: r.post_id,
        created_at: r.created_at,
        expires_at: r.expires_at,
      });
    }

    return res.json({ feed: Array.from(map.values()) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error fetching stories feed." });
  }
});

// -----------------------------
// GET /stories/user/:userId
// Active stories for one user (for the viewer modal)
// -----------------------------
router.get("/user/:userId", requireAuth, (req, res) => {
  try {
    const now = nowMs();
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return res.status(400).json({ message: "Invalid userId." });

    const stories = db.prepare(`
      SELECT id, user_id, type, caption, media_type, media_url, post_id, created_at, expires_at
      FROM stories
      WHERE user_id = ? AND expires_at > ?
      ORDER BY created_at ASC
    `).all(userId, now);

    return res.json({ stories });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error fetching user stories." });
  }
});

// -----------------------------
// DELETE /stories/:id (owner only)
// -----------------------------
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id." });

    const story = db.prepare(`SELECT * FROM stories WHERE id = ?`).get(id);
    if (!story) return res.status(404).json({ message: "Story not found." });
    if (story.user_id !== userId) return res.status(403).json({ message: "Not allowed." });

    // Optional: delete media file if it exists
    if (story.type === "media" && story.media_url) {
      const filename = String(story.media_url).replace("/uploads/", "");
      const filePath = path.join(uploadsDir, filename);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    }

    db.prepare(`DELETE FROM stories WHERE id = ?`).run(id);

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error deleting story." });
  }
});

module.exports = router;
