require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const path = require("path");

// 👇 NEW — Resend mailer import
const { sendTestEmail } = require("./mailerResend");

const app = express();

/**
 * CORS (Production-safe)
 * - Uses CORS_ORIGIN from env as comma-separated list
 * - Falls back to localhost + your main domains
 * - Allows Vercel preview URLs if you add them to CORS_ORIGIN
 */
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
      // allow requests like curl/postman/no-origin
      if (!origin) return cb(null, true);

      if (originAllowlist.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Preflight handler (NO "*" route)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

// Serve uploaded media
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Auth + User routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Lincani server is running 🐶");
});

// 👇 DEV email test endpoint
app.post("/dev/test-email", async (req, res) => {
  try {
    const { to } = req.body || {};
    if (!to) return res.status(400).json({ message: "Missing 'to' email" });

    const data = await sendTestEmail(to);
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// Dog data route
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
      imageUrl: "https://images.dog.ceo/breeds/germanshepherd/n02106662_5451.jpg",
    },
    {
      id: "2",
      name: "Luna",
      breed: "Siberian Husky",
      ageYears: 2,
      location: "Olympia, WA",
      verified: false,
      imageUrl: "https://images.dog.ceo/breeds/husky/n02110185_1469.jpg",
    },
  ]);
});

// ✅ Safe 404 fallback (also avoids wildcard routes)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
  console.log("CORS allowlist:", originAllowlist);
});
