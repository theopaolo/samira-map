import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // lightningcss (Vite 8 default) rejects custom property names containing "/"
    // (e.g. --size-1/2 in piloti/variables.css). Disable minification until
    // upstream fixes the variable names.
    cssMinify: false,
  },
});
