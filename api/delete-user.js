const db = require("./db");

const email = process.argv[2];

if (!email) {
  console.log("Usage: node deleteUser.js user@email.com");
  process.exit(1);
}

try {
  const info = db.prepare("DELETE FROM users WHERE email = ?").run(email);
  console.log(`Deleted rows: ${info.changes}`);
} catch (e) {
  console.error("Delete failed:", e);
}
