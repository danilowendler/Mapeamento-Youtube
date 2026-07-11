import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Carrega credenciais locais para os testes de integração
// (ausentes no CI → esses testes são pulados automaticamente).
config({ path: ".env.local" });

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next"],
    testTimeout: 15000,
  },
});
