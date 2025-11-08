// scripts/gen-proxy.js
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(process.cwd(), "app", "app"); // vrai contenu
const OUT_DIR = path.join(process.cwd(), "app");        // proxys

const exts = new Set([".ts", ".tsx"]);
const known = new Set([
  "page.tsx", "layout.tsx", "template.tsx",
  "loading.tsx", "error.tsx", "not-found.tsx",
  "head.tsx", "default.tsx",
  "route.ts", "route.tsx"
]);

const isRouteFile = (n) => n === "route.ts" || n === "route.tsx";

function walk(dir, relBase = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = path.join(relBase, e.name);
    if (e.isDirectory()) { walk(abs, rel); continue; }

    const ext = path.extname(e.name);
    if (!exts.has(ext)) continue;
    if (!known.has(e.name)) continue;

    const relFromInner = rel.replace(/\\/g, "/"); // ex: "series/page.tsx"
    const outFile = path.join(OUT_DIR, relFromInner);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });

    // ⬇️ IMPORT VERS app/app/** (évite l’auto-import des proxys)
    const srcImport = `@/app/app/${relFromInner}`;
    const content = isRouteFile(e.name)
      ? `export * from '${srcImport}';\n`
      : `export { default } from '${srcImport}';\nexport * from '${srcImport}';\n`;

    fs.writeFileSync(outFile, content, "utf8");
    console.log("→ proxy:", path.posix.join("app", relFromInner), "=>", srcImport);
  }
}

if (!fs.existsSync(SRC_DIR)) {
  console.log("No app/app directory found. Nothing to mirror.");
  process.exit(0);
}

walk(SRC_DIR);
fs.writeFileSync(path.join(process.cwd(), ".proxy-lock"), Date.now().toString());
console.log("✅ Proxies generated from app/app/* to app/*");
