import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

function resolveAllowedHosts(): string[] {
  const raw = process.env.VITE_ALLOWED_HOSTS?.trim();
  if (!raw) return [".net"];
  return raw.split(",").map((host) => host.trim()).filter(Boolean);
}

export default defineConfig({
  server: {
    allowedHosts: resolveAllowedHosts(),
  },
  resolve: {
    tsconfigPaths: true,
  },
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          input: "./server/app.ts",
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
  ],
});
