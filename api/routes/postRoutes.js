const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const db = require("../db");
const { requireAuth } = require("../middleware/requireAuth");

// ---------- Upload setup ----------
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `post_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ok = file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");
  if (!ok) return cb(new Error("Only image/video uploads allowed"));
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// Cursor format: "createdAt:id"
function parseCursor(cursor) {
  if (!cursor) return null;
  const [createdAtStr, idStr] = String(cursor).split(":");
  const createdAt = Number(createdAtStr);
  const id = Number(idStr);
  if (!Number.isFinite(createdAt) || !Number.isFinite(id)) return null;
  return { createdAt, id };
}

function getMediaTypeFromMime(mime) {
  if (!mime) return null;
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  return null;
}

// ✅ POST /posts/upload  (upload images/videos FIRST)
// Send as multipart/form-data:
// - files (File)  <-- you can add multiple
router.post("/upload", requireAuth, upload.array("files", 10), (req, res) => {
  try {
    const files = (req.files || []).map((f) => ({
      type: getMediaTypeFromMime(f.mimetype),
      url: `/uploads/${f.filename}`,
      name: f.originalname,
      size: f.size,
    }));

    res.json({ files });
  } catch (e) {
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET /posts/me?cursor=createdAt:id&limit=10
router.get("/me", requireAuth, (req, res) => {
  try {
    const userId = Number(req.user.id);
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 30);
    const cursor = parseCursor(req.query.cursor);

    let rows;

    if (!cursor) {
      rows = db
        .prepare(
          `
          SELECT id, user_id, text, tag, location, media_url, views, likes, comments, shares, created_at
          FROM posts
          WHERE user_id = ?
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        `
        )
        .all(userId, limit + 1);
    } else {
      rows = db
        .prepare(
          `
          SELECT id, user_id, text, tag, location, media_url, views, likes, comments, shares, created_at
          FROM posts
          WHERE user_id = ?
            AND (
              created_at < ?
              OR (created_at = ? AND id < ?)
            )
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        `
        )
        .all(userId, cursor.createdAt, cursor.createdAt, cursor.id, limit + 1);
    }

    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;

    const nextCursor = hasNext
      ? `${page[page.length - 1].created_at}:${page[page.length - 1].id}`
      : null;

    const posts = page.map((p) => ({
      id: String(p.id),
      createdAt: Number(p.created_at),
      text: p.text,
      tag: p.tag,
      location: p.location || undefined,
      mediaUrl: p.media_url || undefined,
      mediaType: p.media_url ? null : null, // not used in /me right now
      views: Number(p.views || 0),
      likes: Number(p.likes || 0),
      comments: Number(p.comments || 0),
      shares: Number(p.shares || 0),
    }));

    res.json({ posts, nextCursor });
  } catch (e) {
    res.status(500).json({ error: "Failed to load posts" });
  }
});

// ✅ POST /posts  (supports single photo/video upload)
// Send as multipart/form-data:
// - text (string)
// - tag (string)
// - location (string optional)
// - media (file optional)
router.post("/", requireAuth, upload.single("media"), (req, res) => {
  try {
    const userId = Number(req.user.id);

    const text = String(req.body?.text || "").trim();
    const tag = String(req.body?.tag || "").trim();
    const location = String(req.body?.location || "").trim();

    const allowedTags = new Set([
      "Litter Update",
      "Stud Available",
      "Looking for match",
      "Health Test Results",
      "Advice",
    ]);

    if (!text) return res.status(400).json({ error: "Text is required" });
    if (!allowedTags.has(tag)) return res.status(400).json({ error: "Invalid tag" });

    const createdAt = Date.now();

    let mediaUrl = "";
    let mediaType = null;

    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
      mediaType = getMediaTypeFromMime(req.file.mimetype);
    }

    const info = db
      .prepare(
        `
        INSERT INTO posts (user_id, text, tag, location, media_url, views, likes, comments, shares, created_at)
        VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?)
      `
      )
      .run(userId, text, tag, location, mediaUrl, createdAt);

    const newPost = {
      id: String(info.lastInsertRowid),
      createdAt,
      text,
      tag,
      location: location || undefined,
      mediaUrl: mediaUrl || undefined,
      mediaType, // "image" | "video" | null
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };

    res.status(201).json({ post: newPost });
  } catch (e) {
    res.status(500).json({ error: "Failed to create post" });
  }
});

// ✅ GET /posts (Community feed: all posts, infinite scroll)
router.get("/", requireAuth, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 30);
    const cursor = parseCursor(req.query.cursor);

    let rows;

    if (!cursor) {
      rows = db
        .prepare(
          `
          SELECT p.id, p.user_id, p.text, p.tag, p.location, p.media_url,
                 p.views, p.likes, p.comments, p.shares, p.created_at,
                 u.username, u.display_name, u.avatar_url, u.location as user_location
          FROM posts p
          JOIN users u ON u.id = p.user_id
          ORDER BY p.created_at DESC, p.id DESC
          LIMIT ?
        `
        )
        .all(limit + 1);
    } else {
      rows = db
        .prepare(
          `
          SELECT p.id, p.user_id, p.text, p.tag, p.location, p.media_url,
                 p.views, p.likes, p.comments, p.shares, p.created_at,
                 u.username, u.display_name, u.avatar_url, u.location as user_location
          FROM posts p
          JOIN users u ON u.id = p.user_id
          WHERE (
            p.created_at < ?
            OR (p.created_at = ? AND p.id < ?)
          )
          ORDER BY p.created_at DESC, p.id DESC
          LIMIT ?
        `
        )
        .all(cursor.createdAt, cursor.createdAt, cursor.id, limit + 1);
    }

    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;

    const nextCursor = hasNext
      ? `${page[page.length - 1].created_at}:${page[page.length - 1].id}`
      : null;

    const posts = page.map((p) => ({
      id: String(p.id),
      createdAt: Number(p.created_at),
      text: p.text,
      tag: p.tag,
      location: p.location || undefined,
      mediaUrl: p.media_url || undefined,
      views: Number(p.views || 0),
      likes: Number(p.likes || 0),
      comments: Number(p.comments || 0),
      shares: Number(p.shares || 0),

      author: {
        id: Number(p.user_id),
        username: p.username,
        display_name: p.display_name || null,
        avatar_url: p.avatar_url || null,
        location: p.user_location || null,
      },
    }));

    res.json({ posts, nextCursor });
  } catch (e) {
    res.status(500).json({ error: "Failed to load feed" });
  }
});

module.exports = router;
