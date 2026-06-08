const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".css", ".md", ".sql"]);
const MOJIBAKE_MARKERS = ["Ð", "Ñ", "Ã", "Â", "�"];

const explicitFiles = [
  path.join(ROOT, "src", "App.tsx"),
  path.join(ROOT, "src", "index.css"),
  path.join(ROOT, "src", "App.css"),
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const filesToCheck = new Map();

for (const file of explicitFiles) {
  if (fs.existsSync(file)) {
    filesToCheck.set(file, file);
  }
}

for (const dirName of ["docs", "src"]) {
  for (const file of walk(path.join(ROOT, dirName))) {
    filesToCheck.set(file, file);
  }
}

const failedFiles = [];

for (const file of filesToCheck.values()) {
  const content = fs.readFileSync(file, "utf8");
  if (MOJIBAKE_MARKERS.some((marker) => content.includes(marker))) {
    failedFiles.push(path.relative(ROOT, file));
  }
}

if (failedFiles.length > 0) {
  console.error("Mojibake detected in:");
  for (const file of failedFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("Encoding check passed");
