import { defineConfig } from "vitest/config";
import { resolve } from "path";

const alias = { "@lib": resolve(__dirname, "src/lib") };
const sharedTest = {
  globals: true,
  setupFiles: [resolve(__dirname, "vitest-setup.ts")],
};

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          ...sharedTest,
          name: "node",
          environment: "node",
          include: [
            "src/lib/core/**/__tests__/**/*.test.ts",
            "src/lib/extensions/**/__tests__/**/*.test.ts",
            "src/lib/utils/__tests__/**/*.test.ts",
          ],
        },
        resolve: { alias },
      },
      {
        test: {
          ...sharedTest,
          name: "jsdom",
          environment: "jsdom",
          include: [
            "src/lib/components/**/__tests__/**/*.test.{ts,tsx}",
            "src/lib/utils/html/**/__tests__/**/*.test.ts",
            "src/lib/hooks/**/__tests__/**/*.test.{ts,tsx}",
          ],
        },
        resolve: { alias },
      },
    ],
  },
});
