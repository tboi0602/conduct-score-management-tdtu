import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const sourceRoot = fileURLToPath(new URL("./src/", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@(config|controllers|middleware|metrics|modules|producers|rabbitmq|realtime|redis|routes|services|utils|workers)(\/.*)?$/,
        replacement: `${sourceRoot}$1$2`,
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
