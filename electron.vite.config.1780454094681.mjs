// electron.vite.config.ts
import { resolve } from "node:path";
import { existsSync, createReadStream } from "node:fs";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
var __electron_vite_injected_dirname = "C:\\Users\\C\\Desktop\\lumen-studio";
function mediaServePlugin() {
  const dirs = [
    resolve(process.env.APPDATA || "", "lumen-studio", "generated"),
    resolve(__electron_vite_injected_dirname, "test-output")
  ];
  return {
    name: "lumen-media-serve",
    configureServer(server) {
      server.middlewares.use("/media", (req, res, next) => {
        const filename = decodeURIComponent((req.url || "").replace(/^\//, "").split("?")[0]);
        if (!filename) return next();
        for (const dir of dirs) {
          const full = resolve(dir, filename);
          if (existsSync(full)) {
            const ext = filename.split(".").pop()?.toLowerCase();
            const mime = ext === "mp4" ? "video/mp4" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "application/octet-stream";
            res.setHeader("Content-Type", mime);
            createReadStream(full).pipe(res);
            return;
          }
        }
        next();
      });
    }
  };
}
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__electron_vite_injected_dirname, "electron/main/index.ts") }
      }
    },
    resolve: {
      alias: {
        "@shared": resolve(__electron_vite_injected_dirname, "shared"),
        "@main": resolve(__electron_vite_injected_dirname, "electron/main"),
        "@services": resolve(__electron_vite_injected_dirname, "electron/services")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__electron_vite_injected_dirname, "electron/preload/index.ts") }
      }
    },
    resolve: {
      alias: { "@shared": resolve(__electron_vite_injected_dirname, "shared") }
    }
  },
  renderer: {
    root: resolve(__electron_vite_injected_dirname, "src"),
    build: {
      rollupOptions: {
        input: { index: resolve(__electron_vite_injected_dirname, "src/index.html") }
      }
    },
    resolve: {
      alias: {
        "@": resolve(__electron_vite_injected_dirname, "src"),
        "@shared": resolve(__electron_vite_injected_dirname, "shared")
      }
    },
    plugins: [react(), mediaServePlugin()]
  }
});
export {
  electron_vite_config_default as default
};
