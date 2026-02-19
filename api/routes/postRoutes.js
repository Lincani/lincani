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

function guessMediaTypeFromUrl(url) {
  const u = String(url || "").toLowerCase().trim();
  if (!u) return null;
  if (u.endsWith(".mp4") || u.endsWith(".webm") || u.endsWith(".mov")) return "video";
  if (u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".webp") || u.endsWith(".gif"))
    return "image";
  return null;
}

// ✅ Accept absolute or relative; store relative "/uploads/..."
function normalizeUploadsUrl(input) {
  const u = String(input || "").trim();
  if (!u) return "";

  // Relative
  if (u.startsWith("/uploads/")) return u;

  // Absolute -> extract /uploads/...
  if (u.startsWith("http://") || u.startsWith("https://")) {
    const idx = u.indexOf("/uploads/");
    if (idx === -1) return "";
    return u.slice(idx);
  }

  return "";
}

function allowedTagsSet() {
  return new Set(["Litter Update", "Stud Available", "Looking for match", "Health Test Results", "Advice"]);
}

// ✅ POST /posts/upload (PREMIUM: upload ONE file first)
router.post("/upload", requireAuth, upload.array("files", 1), (req, res) => {
  try {
    const files = (req.files || []).map((f) => ({
      type: getMediaTypeFromMime(f.mimetype),
      url: `/uploads/${f.filename}`,
      name: f.originalname,
      size: f.size,
    }));

    return res.json({ files });
  } catch (e) {
    return res.status(500).json({ error: "Upload failed" });
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

    const nextCursor = hasNext ? `${page[page.length - 1].created_at}:${page[page.length - 1].id}` : null;

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
    }));

    return res.json({ posts, nextCursor });
  } catch (e) {
    return res.status(500).json({ error: "Failed to load posts" });
  }
});

// ✅ POST /posts (Premium JSON OR multipart fallback)
router.post("/", requireAuth, (req, res) => {
  const ct = String(req.headers["content-type"] || "");

  if (ct.includes("multipart/form-data")) {
    return upload.single("media")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || "Upload error" });
      return handleCreatePost(req, res);
    });
  }

  return handleCreatePost(req, res);
});

function handleCreatePost(req, res) {
  try {
    const userId = Number(req.user.id);

    const text = String(req.body?.text || "").trim();
    const tag = String(req.body?.tag || "").trim();

    const allowedTags = allowedTagsSet();
    if (!text) return res.status(400).json({ error: "Text is required" });
    if (!allowedTags.has(tag)) return res.status(400).json({ error: "Invalid tag" });

    const createdAt = Date.now();

    let mediaUrl = "";
    let mediaType = null;

    // --- JSON premium flow ---
    const incomingMediaUrl = typeof req.body?.mediaUrl === "string" ? req.body.mediaUrl : "";

    if (incomingMediaUrl) {
      mediaUrl = normalizeUploadsUrl(incomingMediaUrl);
      mediaType = mediaUrl ? guessMediaTypeFromUrl(mediaUrl) : null;

      if (!mediaUrl) {
        return res.status(400).json({
          error: "Invalid mediaUrl. Must be /uploads/... or an absolute URL containing /uploads/...",
        });
      }
    }

    // --- Multipart fallback ---
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
      mediaType = getMediaTypeFromMime(req.file.mimetype);
    }

    const location = ""; // omitted for premium flow

    const info = db
      .prepare(
        `
        INSERT INTO posts (user_id, text, tag, location, media_url, views, likes, comments, shares, created_at)
        VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?)
      `
      )
      .run(userId, text, tag, location, mediaUrl, createdAt);

    return res.status(201).json({
      post: {
        id: String(info.lastInsertRowid),
        createdAt,
        text,
        tag,
        location: undefined,
        mediaUrl: mediaUrl || undefined,
        mediaType,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to create post" });
  }
}

/* ===========================
   ✅ NEW: DELETE /posts/:id
   Owner-only + best-effort file cleanup
   =========================== */
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const userId = Number(req.user.id);
    const postId = Number(req.params.id);

    if (!Number.isFinite(postId)) return res.status(400).json({ error: "Invalid post id" });

    const row = db.prepare(`SELECT id, user_id, media_url FROM posts WHERE id = ?`).get(postId);

    if (!row) return res.status(404).json({ error: "Post not found" });
    if (Number(row.user_id) !== userId) return res.status(403).json({ error: "Not allowed" });

    // delete file if it’s in /uploads
    const mediaUrl = String(row.media_url || "");
    if (mediaUrl.startsWith("/uploads/")) {
      const filename = mediaUrl.replace("/uploads/", "").trim();
      if (filename) {
        const filePath = path.join(uploadDir, filename);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {
          // ignore file deletion errors
        }
      }
    }

    db.prepare(`DELETE FROM posts WHERE id = ?`).run(postId);

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Failed to delete post" });
  }
});

// ✅ GET /posts (Community feed)
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

    const nextCursor = hasNext ? `${page[page.length - 1].created_at}:${page[page.length - 1].id}` : null;

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

    return res.json({ posts, nextCursor });
  } catch (e) {
    return res.status(500).json({ error: "Failed to load feed" });
  }
});

module.exports = router;
