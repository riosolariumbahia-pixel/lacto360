import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    tanstackStart({
      server: { entry: "src/server.ts" },
    }),
    react(),
    tsconfigPaths(),
    nitro({
      preset: "vercel",
    }),
  ],
});
