import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = resolve(root, "desk/index.html");
const jsPath = resolve(root, "desk/desk.js");
const html = readFileSync(htmlPath, "utf8");
const js = readFileSync(jsPath, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
assert(ids.length === new Set(ids).size, "desk/index.html contains duplicate ids");

for (const route of ["today", "projects", "library", "study", "notes", "toolbox"]) {
  assert(html.includes(`data-route="${route}"`), `missing navigation route: ${route}`);
  assert(html.includes(`data-view="${route}"`), `missing module view: ${route}`);
}

for (const match of js.matchAll(/\$\("#([^"]+)"\)/g)) {
  assert(ids.includes(match[1]), `desk.js references missing id: ${match[1]}`);
}

const syntax = spawnSync(process.execPath, ["--check", jsPath], { encoding: "utf8" });
assert(syntax.status === 0, syntax.stderr || "desk.js syntax check failed");

const feed = JSON.parse(readFileSync(resolve(root, "desk/data/feeds.json"), "utf8"));
assert(Array.isArray(feed.items), "feeds.json must contain an items array");
assert(feed.items.every((item) => item.title && item.url && item.source), "feed item is incomplete");

console.log(`Desk check passed: ${ids.length} ids, 6 routes, ${feed.items.length} feed items.`);
