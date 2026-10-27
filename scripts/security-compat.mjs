// One reviewed interop adaptation, not a vulnerability suppression or a fork.
// query-string 7 expects a CJS callable; patched decode-uri-component 0.5 is ESM.
import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(new URL("../package.json", import.meta.url));
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 12))
  throw new Error(
    "Use Node 22.12+ or Node 24+ for the patched ESM dependency.",
  );
const index = await realpath(require.resolve("query-string"));
const modules = await realpath(path.join(root, "node_modules"));
const relative = path.relative(modules, index);
if (relative.startsWith("..") || path.isAbsolute(relative))
  throw new Error("Refusing to patch a dependency outside this workspace.");
const metadata = JSON.parse(
  await readFile(path.join(path.dirname(index), "package.json"), "utf8"),
);
if (metadata.version !== "7.1.3")
  throw new Error(
    "Review security interop before changing query-string version.",
  );
const decoderEntry = createRequire(index).resolve("decode-uri-component");
const decoderPackage = JSON.parse(
  await readFile(path.join(path.dirname(decoderEntry), "package.json"), "utf8"),
);
if (
  decoderPackage.name !== "decode-uri-component" ||
  decoderPackage.version !== "0.5.0"
)
  throw new Error("The reviewed fixed decoder 0.5.0 is required.");

const original = "const decodeComponent = require('decode-uri-component');";
const adapted =
  "const decodeComponent = require('decode-uri-component').default; // FLICK: patched ESM decoder interop";
const expectedHash =
  "caa3f2c8b45dfe1e91db22ae10743af68de8d96f26515132bb52485ec0f037fa";
const source = await readFile(index, "utf8");
const before = source.includes(adapted)
  ? source.replace(adapted, original)
  : source;
if (createHash("sha256").update(before).digest("hex") !== expectedHash)
  throw new Error(
    "Dependency source differs from the reviewed query-string 7.1.3 release.",
  );
const next = before.replace(original, adapted);
if (next === before) throw new Error("Decoder interop location was not found.");
if (source !== next) {
  if (process.argv.includes("--check"))
    throw new Error(
      "Security interop is missing. Run npm ci without --ignore-scripts.",
    );
  await writeFile(index, next);
}
// Test the decoder actually used by query-string, not just its version string.
const query = require("query-string");
if (
  query.parse("title=%EC%98%81%ED%99%94&space=a+b").title !== "영화" ||
  query.parse("space=a+b").space !== "a b"
)
  throw new Error("Query-string decoder compatibility failed.");
console.log(
  "Verified patched URL decoder interop (query-string 7.1.3 / decode-uri-component 0.5.0).",
);
