#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const index = path.join(dist, "client", "index.html");
const worker = path.join(root, "worker", "index.js");
const hosting = path.join(root, ".openai", "hosting.json");

for (const file of [index, worker, hosting]) {
  if (!existsSync(file)) throw new Error("Missing Sites build input: " + file);
}

mkdirSync(path.join(dist, "server"), { recursive: true });
mkdirSync(path.join(dist, ".openai"), { recursive: true });
const appShell = readFileSync(index, "utf8");
const workerSource = readFileSync(worker, "utf8");
const appShellMarker = "/* __AT_ATTIN_APP_SHELL__ */ null";
if (!workerSource.includes(appShellMarker)) {
  throw new Error("Missing At Attin app-shell marker in Sites Worker");
}
writeFileSync(
  path.join(dist, "server", "index.js"),
  workerSource.replace(appShellMarker, JSON.stringify(appShell)),
);
writeFileSync(index, `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="0;url=/login" />
    <title>Opening At Attin</title>
  </head>
  <body>
    <p>Opening <a href="/login">At Attin</a>…</p>
    <script>location.replace("/login")</script>
  </body>
</html>
`);
copyFileSync(hosting, path.join(dist, ".openai", "hosting.json"));

console.log("Prepared Sites build: dist/server/index.js and dist/.openai/hosting.json");
