import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    root: __dirname,
    envPrefix: "VITE_",
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: ["miapp.local", "localhost"],
      hmr: {
        host: "miapp.local",
        port: 5173,
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname),
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: isDev,
      assetsDir: "assets",
      assetsInlineLimit: 0,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
          checkout: path.resolve(__dirname, "src/pages/checkout.html"),
          checkoutSuccess: path.resolve(
            __dirname,
            "src/pages/checkout-success.html"
          ),
          checkoutFailed: path.resolve(
            __dirname,
            "src/pages/checkout-failed.html"
          ),
        },
      },
    },
  };
});
