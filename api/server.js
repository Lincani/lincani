require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const storyRoutes = require("./routes/storyRoutes");

const { sendTestEmail } = require("./mailerResend");

const app = express();

/* ===============================
   CORS (Production Safe)
================================ */
const fallbackOrigins = [
  "https://lincani.com",
  "https://www.lincani.com",
  "http://localhost:3000",
];

const allowedOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const originAllowlist = allowedOrigins.length ? allowedOrigins : fallbackOrigins;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origin.endsWith(".vercel.app")) return cb(null, true);
      if (originAllowlist.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* Handle OPTIONS cleanly */
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

/* ===============================
   STATIC UPLOADS FIX (IMPORTANT)
================================ */
const uploadsDir = path.resolve(process.cwd(), "uploads");
console.log("UPLOADS DIR:", uploadsDir);

app.use("/uploads", express.static(uploadsDir, { fallthrough: false }));

app.get("/uploads-test", (req, res) => {
  res.send("uploads route is alive");
});

app.get("/uploads-debug", (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    res.json({ uploadsDir, count: files.length, files });
  } catch (e) {
    res.status(500).json({
      uploadsDir,
      error: String(e?.message || e),
    });
  }
});

/* ===============================
   DEBUG ROUTES
================================ */
app.get("/stories-ping", (req, res) => {
  res.json({ ok: true, msg: "stories ping working" });
});

/* ===============================
   API ROUTES
================================ */
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/admin", adminRoutes);
app.use("/stories", storyRoutes);

app.get("/", (req, res) => {
  res.send("Lincani server running 🐶");
});

/* ===============================
   DEV Email Test Endpoint
================================ */
app.post("/dev/test-email", async (req, res) => {
  try {
    const { to } = req.body || {};
    if (!to) return res.status(400).json({ message: "Missing 'to' email" });

    const data = await sendTestEmail(to);
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: String(e?.message || e),
    });
  }
});

/* ===============================
   EXAMPLE DATA ROUTES
================================ */
app.get("/dogs", (req, res) => {
  res.json([
    {
      name: "Rocky",
      breed: "Husky",
      age: 3,
      image: "https://images.dog.ceo/breeds/husky/n02110185_1469.jpg",
    },
    {
      name: "Bella",
      breed: "Golden Retriever",
      age: 2,
      image: "https://images.dog.ceo/breeds/retriever-golden/n02099601_3004.jpg",
    },
  ]);
});

app.get("/api/dogs", (req, res) => {
  res.json([
    {
      id: "1",
      name: "Koda",
      breed: "German Shepherd",
      ageYears: 3,
      location: "Tacoma, WA",
      verified: true,
      imageUrl:
        "https://images.dog.ceo/breeds/germanshepherd/n02106662_5451.jpg",
    },
    {
      id: "2",
      name: "Luna",
      breed: "Siberian Husky",
      ageYears: 2,
      location: "Olympia, WA",
      verified: false,
      imageUrl:
        "https://images.dog.ceo/breeds/husky/n02110185_1469.jpg",
    },
  ]);
});

/* ===============================
   SAFE 404
================================ */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ===============================
   START SERVER
================================ */
app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
  console.log("CORS allowlist:", originAllowlist);
});
