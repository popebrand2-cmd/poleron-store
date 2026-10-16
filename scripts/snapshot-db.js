// Runs first on every start: keeps a raw copy of the SQLite database file next to it (the last 3 starts). A deleted row is not
// wiped from the file right away: its bytes stay in free pages until new data reuses them. These copies let Admin >
// Recuperar find a deleted order's details (name, address, products) even after the live file has moved on. Never blocks startup.
const fs = require("fs");
const path = require("path");

try {
  const url = process.env.DATABASE_URL || "";
  const m = /^file:(.+)$/.exec(url);
  if (m) {
    let file = m[1].split("?")[0];
    // Prisma resolves relative SQLite paths from the schema folder.
    if (!path.isAbsolute(file)) file = path.join(__dirname, "..", "prisma", file);
    if (fs.existsSync(file)) {
      const dir = path.dirname(file);
      const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
      fs.copyFileSync(file, path.join(dir, `recovery-${stamp}.db`));
      const old = fs
        .readdirSync(dir)
        .filter((n) => /^recovery-\d{8}-\d{6}\.db$/.test(n))
        .sort()
        .reverse()
        .slice(3);
      for (const n of old) fs.unlinkSync(path.join(dir, n));
      console.log(`[snapshot-db] copy saved (recovery-${stamp}.db)`);
    }
  }
} catch (e) {
  console.error("[snapshot-db] skipped:", e.message);
}
