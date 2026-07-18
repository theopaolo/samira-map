import { defineConfig } from "vite";
import { pinsDevPlugin } from "./scripts/pins-dev-plugin.mjs";

export default defineConfig({
  plugins: [pinsDevPlugin()],
  build: {
    // lightningcss (Vite 8 default) rejects custom property names containing "/"
    // (e.g. --size-1/2 in piloti/variables.css). Disable minification until
    // upstream fixes the variable names.
    cssMinify: false,
  },
});
