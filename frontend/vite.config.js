import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@firebase/auth/"))
            return "firebase-auth";
          if (id.includes("/node_modules/@firebase/firestore/"))
            return "firebase-firestore";
          if (id.includes("/node_modules/@firebase/database/"))
            return "firebase-database";
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
});
