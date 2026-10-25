import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        outDir: "dist/client",
        manifest: false,
        includeAssets: ["favicon.png", "icons/icon-192.png", "icons/icon-512.png"],
        devOptions: { enabled: false },
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          navigateFallback: null,
          importScripts: ["/push-worker.js"],
          globPatterns: ["assets/**/*.{js,css,png,jpg,jpeg,svg,webp,woff2}"],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkOnly",
            },
            {
              urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co"),
              handler: "NetworkOnly",
            },
            {
              urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/src/"),
              handler: "CacheFirst",
              options: {
                cacheName: "thelawala-build-assets",
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
            {
              urlPattern: () => true,
              handler: "NetworkOnly",
            },
          ],
        },
      }),
    ],
  },
});
