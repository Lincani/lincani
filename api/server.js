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

app.use(cors());
app.use(express.json());

// Serve uploaded media
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Auth + User routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("BreedLink server is running 🐶");
});

// 👇 NEW — DEV email test endpoint
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

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port 5000");
});
