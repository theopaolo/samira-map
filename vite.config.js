import { defineConfig } from "vite";
import { pinsDevPlugin } from "./scripts/pins-dev-plugin.mjs";

export default defineConfig({
  plugins: [pinsDevPlugin()],
});
