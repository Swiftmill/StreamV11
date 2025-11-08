// scripts/gen-proxy.js
// Miroir des routes depuis app/app/* vers app/* (re-export)
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(process.cwd(), "app", "app");
const OUT_DIR = path.join(process.cwd(), "app");

// extensions de fichiers à prendre en compte
const exts = new Set([".ts", ".tsx"]);
const isRouteFile = (name) => /^route\.(ts|tsx)$/.test(name);

function walk(dir, relBase = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = path.join(relBase, e.name);
    if (e.isDirectory()) {
      walk(abs, rel);
    } else {
      const ext = path.extname(e.name);
      if (!exts.has(ext)) continue;

      // On ne gère que fichiers Next “app router”
      const base = path.basename(e.name);
      const known = new Set([
        "page.tsx", "layout.tsx", "template.tsx",
        "loading.tsx", "error.tsx", "not-found.tsx",
        "head.tsx", "default.tsx",
        "route.ts", "route.tsx"
      ]);
      if (!known.has(base)) continue;

      const relFromInner = rel; // ex: movies/page.tsx
      const outRel = path.join(relBase); // même structure
      const outDir = path.join(OUT_DIR, path.dirname(relFromInner));
      fs.mkdirSync(outDir, { recursive: true });

      const srcImport = `./app/${relFromInner.replace(/\\/g, "/")}`;
      const outFile = path.join(OUT_DIR, relFromInner);

      // route.ts(x) n'a pas de default → export *
      const content = isRouteFile(base)
        ? `export * from '${srcImport}';\n`
        : `export { default } from '${srcImport}';\nexport * from '${srcImport}';\n`;

      fs.writeFileSync(outFile, content, "utf8");
    }
  }
}

if (!fs.existsSync(SRC_DIR)) {
  console.error("No app/app directory found. Nothing to mirror.");
  process.exit(0);
}

walk(SRC_DIR);
console.log("✅ Proxies generated from app/app/* to app/*");
// force sync disk pour éviter race condition Next.js
fs.writeFileSync(path.join(process.cwd(), ".proxy-lock"), Date.now().toString());

