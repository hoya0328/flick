import { createRequire } from "node:module";
import {
  readFileSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const query = require("query-string");
const expoRequire = createRequire(require.resolve("expo/package.json"));
const cliRoot = path.dirname(expoRequire.resolve("@expo/cli/package.json"));
const cliRequire = createRequire(path.join(cliRoot, "package.json"));
const metroRoot = path.dirname(require.resolve("metro/package.json"));
const metroRequire = createRequire(path.join(metroRoot, "package.json"));
const xcodeRequire = createRequire(
  expoRequire.resolve("@expo/config-plugins/package.json"),
);

function isolated(source: string) {
  const result = spawnSync(
    process.execPath,
    ["--max-old-space-size=192", "-e", source],
    { cwd: process.cwd(), encoding: "utf8", timeout: 4000, maxBuffer: 20000 },
  );
  expect(result.error?.message).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}
describe("fixed URL decoder: actual Expo query-string consumer", () => {
  it("keeps Korean titles, spaces, emoji and multi-byte search values intact", () => {
    const original = {
      title: "극장판 체인소 맨: 레제편",
      query: "사랑 & 우정 🎬",
      space: "a b",
      percent: "100%",
    };
    expect({ ...query.parse(query.stringify(original)) }).toEqual(original);
    expect(query.parse("space=a+b").space).toBe("a b");
  });
  it("preserves one-pass decoding, encoded return paths and synthetic auth params", () => {
    const original = {
      returnTo: "/people/00000000-0000-4000-8000-000000000001",
      redirect_to: "https://flick-film-journal--beta.expo.app/reset-password",
      code: "synthetic-code",
    };
    expect({ ...query.parse(query.stringify(original)) }).toEqual(original);
    expect(query.parse("value=%252Fadmin").value).toBe("%2Fadmin");
    expect(query.parse("a=1&a=2").a).toEqual(["1", "2"]);
  });
  it("finishes hostile malformed UTF-8 decoding in an isolated timeout-limited child", () => {
    expect(
      isolated(
        "const q=require('query-string');const result=q.parse('x='+ '%C2'.repeat(20000)+'%');if(typeof result.x!=='string')throw Error('decode failed');console.log('bounded');",
      ),
    ).toBe("bounded");
  });
  it("checks the reviewed source/decoder version without modifying dependency files", () => {
    const before = readFileSync(require.resolve("query-string"), "utf8");
    const output = execFileSync(
      process.execPath,
      ["scripts/security-compat.mjs", "--check"],
      { encoding: "utf8" },
    );
    expect(output).toContain("decode-uri-component 0.5.0");
    expect(readFileSync(require.resolve("query-string"), "utf8")).toBe(before);
  });
  it("fails closed on missing adaptation and changed upstream source, without rewriting either", () => {
    const base = path.resolve("tmp/security-compat-fixtures");
    mkdirSync(base, { recursive: true });
    const fixture = mkdtempSync(path.join(base, "case-"));
    try {
      const queryDir = path.join(fixture, "node_modules/query-string"),
        decoderDir = path.join(fixture, "node_modules/decode-uri-component"),
        scriptDir = path.join(fixture, "scripts");
      for (const dir of [queryDir, decoderDir, scriptDir])
        mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(fixture, "package.json"), "{}");
      writeFileSync(
        path.join(queryDir, "package.json"),
        JSON.stringify({
          name: "query-string",
          version: "7.1.3",
          main: "index.js",
        }),
      );
      writeFileSync(
        path.join(decoderDir, "package.json"),
        JSON.stringify({
          name: "decode-uri-component",
          version: "0.5.0",
          type: "module",
          main: "index.js",
        }),
      );
      writeFileSync(
        path.join(decoderDir, "index.js"),
        "export default value => value;",
      );
      const script = path.join(scriptDir, "security-compat.mjs");
      writeFileSync(script, readFileSync("scripts/security-compat.mjs"));
      const original = readFileSync(
        require.resolve("query-string"),
        "utf8",
      ).replace(
        "const decodeComponent = require('decode-uri-component').default; // FLICK: patched ESM decoder interop",
        "const decodeComponent = require('decode-uri-component');",
      );
      const file = path.join(queryDir, "index.js");
      writeFileSync(file, original);
      const missing = spawnSync(process.execPath, [script, "--check"], {
        encoding: "utf8",
        timeout: 4000,
      });
      expect(missing.status).not.toBe(0);
      expect(missing.stderr).toContain("Security interop is missing");
      expect(readFileSync(file, "utf8")).toBe(original);
      const changed = original + "\n// synthetic upstream change\n";
      writeFileSync(file, changed);
      const tampered = spawnSync(process.execPath, [script], {
        encoding: "utf8",
        timeout: 4000,
      });
      expect(tampered.status).not.toBe(0);
      expect(tampered.stderr).toContain("Dependency source differs");
      expect(readFileSync(file, "utf8")).toBe(changed);
    } finally {
      const resolved = path.resolve(fixture);
      if (
        !resolved.startsWith(base + path.sep) ||
        !path.basename(resolved).startsWith("case-")
      )
        throw new Error("Unsafe synthetic fixture cleanup");
      rmSync(resolved, { recursive: true, force: true });
    }
  });
});

describe("patched image-size: actual Metro consumer", () => {
  it("retains the default-function API used by Metro and reads existing PNG/SVG assets", () => {
    const imageSize = metroRequire("image-size").default;
    expect(typeof imageSize).toBe("function");
    expect(imageSize(readFileSync("public/icons/flick-192.png"))).toMatchObject(
      { width: 192, height: 192 },
    );
  });
  it("reads PNG dimensions through Metro Assets without changing bundled assets", () => {
    const assets = require(path.join(metroRoot, "src/Assets.js"));
    expect(
      assets.getAssetSize(
        "png",
        readFileSync("public/icons/flick-192.png"),
        "flick-192.png",
      ),
    ).toEqual({ width: 192, height: 192 });
    expect(
      assets.getAssetSize(
        "svg",
        readFileSync("assets/figma-vectors/symbol.svg"),
        "symbol.svg",
      ),
    ).toEqual({ width: 28, height: 28 });
  });
  it("rejects a zero-length ICNS entry instead of hanging, in an isolated child", () => {
    expect(
      isolated(
        "const {createRequire}=require('module');const r=createRequire(require.resolve('metro/package.json'));const imageSize=r('image-size').default;const bytes=Buffer.alloc(16);bytes.write('icns');bytes.writeUInt32BE(16,4);bytes.write('ic07',8);try{imageSize(bytes);throw Error('invalid input accepted')}catch(e){if(!String(e.message).includes('Invalid ICNS'))throw e;}console.log('rejected');",
      ),
    ).toBe("rejected");
  });
  it("rejects a zero-size HEIF box instead of scanning forever", () => {
    expect(
      isolated(
        "const {createRequire}=require('module');const r=createRequire(require.resolve('metro/package.json'));const imageSize=r('image-size').default;const bytes=Buffer.alloc(24);bytes.write('ftyp',4);bytes.write('heic',8);let failed=false;try{imageSize(bytes)}catch{failed=true}if(!failed)throw Error('invalid HEIF accepted');console.log('rejected');",
      ),
    ).toBe("rejected");
  });
});

describe("patched Zod: actual Expo CLI validation and MCP schema contracts", () => {
  const schemas = cliRequire(
    path.join(cliRoot, "build/src/start/server/DevToolsPlugin.schema.js"),
  );
  const { createMCPDevToolsExtensionSchema } = cliRequire(
    path.join(
      cliRoot,
      "build/src/start/server/createMCPDevToolsExtensionSchema.js",
    ),
  );
  const plugin = {
    packageName: "synthetic-plugin",
    packageRoot: "/synthetic",
    cliExtensions: {
      description: "test only",
      entryPoint: "unused.js",
      commands: [
        {
          name: "inspect",
          title: "Inspect",
          environments: ["cli", "mcp"],
          parameters: [
            { name: "text", type: "text" },
            { name: "count", type: "number" },
            { name: "confirm", type: "confirm" },
          ],
        },
      ],
    },
  };
  it("uses Zod4 fixed code, not a vulnerable v3 compatibility export", () => {
    expect(cliRequire("zod").core.version).toMatchObject({
      major: 4,
      minor: 6,
      patch: 6,
    });
  });
  it("accepts supported plugin and output shapes and rejects invalid ones", () => {
    expect(schemas.PluginSchema.safeParse(plugin).success).toBe(true);
    expect(
      schemas.PluginSchema.safeParse({ ...plugin, packageName: "" }).success,
    ).toBe(false);
    expect(
      schemas.DevToolsPluginOutputSchema.safeParse([
        { type: "text", text: "test", level: "info" },
        { type: "image", url: "https://example.invalid/synthetic.png" },
      ]).success,
    ).toBe(true);
    expect(
      schemas.DevToolsPluginOutputSchema.safeParse([{ type: "text", text: 5 }])
        .success,
    ).toBe(false);
  });
  it("preserves strict generated MCP parameter types without starting any tool server", () => {
    const schema = createMCPDevToolsExtensionSchema(plugin);
    expect(
      schema.safeParse({
        command: "inspect",
        text: "value",
        count: 2,
        confirm: false,
      }).success,
    ).toBe(true);
    for (const input of [
      { command: "unknown" },
      { command: "inspect", count: "2" },
      { command: "inspect", extra: "no" },
    ])
      expect(schema.safeParse(input).success).toBe(false);
  });
  it("handles bounded invalid collections without crashing the CLI process", () => {
    expect(
      isolated(
        `const path=require('path');const {createRequire}=require('module');const er=createRequire(require.resolve('expo/package.json'));const root=path.dirname(er.resolve('@expo/cli/package.json'));const {DevToolsPluginOutputSchema:s}=require(path.join(root,'build/src/start/server/DevToolsPlugin.schema.js'));const r=s.safeParse(Array.from({length:2000},()=>({type:'text',text:42})));if(r.success||!r.error.issues.length)throw Error('invalid collection accepted');console.log('rejected');`,
      ),
    ).toBe("rejected");
  });
});

describe("patched UUID and security maintenance gate", () => {
  it("preserves Xcode project v4-based 24-hex IDs without writing project files", () => {
    const xcode = xcodeRequire("xcode"),
      project = xcode.project("/synthetic/project.pbxproj");
    project.hash = { project: { objects: {} } };
    const values = Array.from({ length: 10 }, () => project.generateUuid());
    expect(values.every((value) => /^[0-9A-F]{24}$/.test(value))).toBe(true);
    expect(new Set(values).size).toBe(10);
  });
  it("rejects undersized v5 output buffers in the actual Xcode UUID dependency", () => {
    const fromXcode = createRequire(xcodeRequire.resolve("xcode"));
    expect(() =>
      fromXcode("uuid").v5(
        "synthetic",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        new Uint8Array(1),
      ),
    ).toThrow(RangeError);
  });
  it("pins reviewed replacements and checks compatibility before builds", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.overrides["image-size"]).toBe("2.0.3");
    expect(pkg.overrides.zod).toBe("4.6.6");
    expect(pkg.overrides["query-string@7.1.3"]["decode-uri-component"]).toBe(
      "0.5.0",
    );
    expect(pkg.scripts["build:web"]).toContain("security-compat.mjs --check");
  });
});
