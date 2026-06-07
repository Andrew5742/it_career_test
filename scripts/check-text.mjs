import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = ["src", "public", "index.html", "package.json", "vite.config.ts"];
const exts = new Set([".ts", ".tsx", ".css", ".html", ".json", ".md", ".mjs"]);
const badFragments = ["Ð", "Ñ"];
const issues = [];

function shouldCheck(filePath) {
  const base = path.basename(filePath);
  if (base === "index.html" || base === "package.json" || base === "vite.config.ts") return true;
  return exts.has(path.extname(filePath).toLowerCase());
}

function checkFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const rel = path.relative(root, filePath);

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    issues.push(`${rel}: знайдено BOM`);
  }

  const text = buffer.toString("utf8");

  if (text.includes("�")) {
    issues.push(`${rel}: знайдено символ заміни �`);
  }

  for (const fragment of badFragments) {
    if (text.includes(fragment)) {
      issues.push(`${rel}: знайдено підозрілу послідовність "${fragment}"`);
      break;
    }
  }

  if (/\?{5,}/.test(text)) {
    issues.push(`${rel}: знайдено послідовність із 5+ знаків питання`);
  }
}

function walk(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(targetPath)) {
      walk(path.join(targetPath, name));
    }
    return;
  }

  if (shouldCheck(targetPath)) {
    checkFile(targetPath);
  }
}

for (const target of targets) {
  walk(path.join(root, target));
}

if (issues.length > 0) {
  console.error("Помилки тексту/кодування:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log("text:check OK");
