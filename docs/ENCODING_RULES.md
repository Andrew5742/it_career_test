# Encoding Rules

- All project text files must be UTF-8.
- Do not use PowerShell `Get-Content` or `Set-Content` when editing Ukrainian text.
- For automated changes, use Node:

```js
const content = fs.readFileSync(path, "utf8");
fs.writeFileSync(path, content, "utf8");
```

- Before each build, run the mojibake check:

```bash
npm run check:mojibake
```
