import { defineConfig } from "vite";
import { chmodSync } from "node:fs";
import { builtinModules } from "node:module";
import pkg from "./package.json" with { type: "json" };

// CLI shebang — necháme ho jen na vstupním souboru (dist/index.js).
const SHEBANG = "#!/usr/bin/env node\n";

// Externalizujeme node builtiny i všechny závislosti — bundlujeme jen NÁŠ
// src/, balíčky zůstávají required za běhu (stejně jako to dělal tsc build).
const external = [
  /^node:/,
  ...builtinModules,
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.devDependencies),
];

export default defineConfig({
  build: {
    target: "node20",
    outDir: "dist",
    minify: false,
    sourcemap: false,
    rollupOptions: {
      input: "src/index.ts",
      external,
      output: {
        format: "es",
        // Zachovat strukturu souborů (ne jeden bundle) — benchmark harness
        // importuje jednotlivé soubory z dist/ (např. dist/llm/budget.js).
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
  },
  plugins: [
    {
      name: "cli-shebang",
      renderChunk(code, chunk) {
        if (!chunk.isEntry) return null;
        // odstraň případný starý shebang a dej čistý jen na vstup
        const body = code.replace(/^#![^\n]*\n/, "");
        return { code: SHEBANG + body, map: null };
      },
      // dist/index.js musí být spustitelný (jako CLI) — po buildu nastav +x.
      writeBundle() {
        chmodSync("dist/index.js", 0o755);
      },
    },
  ],
});
