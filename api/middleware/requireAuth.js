const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Your codebase likely signs tokens as { id: user.id }.
    // If yours uses userId instead, we handle both.
    const id = decoded.id ?? decoded.userId;
    if (!id) return res.status(401).json({ error: "Invalid token payload" });

    req.user = { id };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { requireAuth };
