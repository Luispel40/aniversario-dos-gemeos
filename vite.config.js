import { defineConfig } from "vite";

// base "./" deixa o build funcionar em qualquer hospedagem ou subpasta.
export default defineConfig({
  base: "./",
  build: { target: "es2019", assetsInlineLimit: 0 },
});
