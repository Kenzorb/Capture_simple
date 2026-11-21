import { defineConfig } from "@playwright/test";
import process from "node:process";

const baseURL = "http://127.0.0.1:3173";

export default defineConfig({
  testDir: "./tests/browser",
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  use: {
    baseURL,
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.CAPTURE_TEST_CHROMIUM_EXECUTABLE,
    },
  },
  webServer: {
    command: "pnpm --filter web dev --hostname 127.0.0.1 --port 3173",
    url: baseURL,
    reuseExistingServer: false,
  },
});
