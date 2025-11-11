// scripts/seed-if-empty.js
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const adminJson = path.join(DATA_DIR, "users", "admin.json");

(async () => {
  try {
    if (!fs.existsSync(adminJson)) {
      console.log("🟠 Aucun utilisateur admin trouvé, génération...");
      const res = spawnSync("npm", ["run", "seed"], { stdio: "inherit" });
      if (res.status !== 0) process.exit(res.status);
      console.log("✅ Données initiales générées avec succès !");
    } else {
      console.log("✅ Données déjà présentes, aucun seed nécessaire");
    }
  } catch (err) {
    console.error("❌ Erreur seed:", err);
    process.exit(1);
  }
})();
