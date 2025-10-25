import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Global test timeout - increased for async rainfall data fetching */
  timeout: 60000,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Navigation timeout - increased for server-side data fetching */
    navigationTimeout: 60000,
  },

  /* Run your local dev server before starting the tests */
  /* Note: Next.js automatically loads .env.local, so tokens are available */
  webServer: {
    command: "pnpm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },

  /* Configure projects for major browsers */
  /*
   * By default, run only Chromium for speed (6 tests vs 18 tests).
   * To test all browsers, run: PLAYWRIGHT_ALL_BROWSERS=1 pnpm test:e2e
   */
  projects: process.env.PLAYWRIGHT_ALL_BROWSERS
    ? [
        // Full browser coverage
        {
          name: "chromium",
          use: {
            ...devices["Desktop Chrome"],
            launchOptions: {
              args: [
                "--use-gl=swiftshader",
                "--enable-webgl",
                "--enable-accelerated-2d-canvas",
              ],
            },
          },
        },
        {
          name: "firefox",
          use: {
            ...devices["Desktop Firefox"],
            launchOptions: {
              firefoxUserPrefs: {
                "webgl.force-enabled": true,
              },
            },
          },
        },
        {
          name: "webkit",
          use: {
            ...devices["Desktop Safari"],
          },
        },
      ]
    : [
        // Chromium only (default, for speed)
        {
          name: "chromium",
          use: {
            ...devices["Desktop Chrome"],
            launchOptions: {
              args: [
                "--use-gl=swiftshader",
                "--enable-webgl",
                "--enable-accelerated-2d-canvas",
              ],
            },
          },
        },
      ],

  /* Test against mobile viewports. */
  // {
  //   name: 'Mobile Chrome',
  //   use: { ...devices['Pixel 5'] },
  // },
  // {
  //   name: 'Mobile Safari',
  //   use: { ...devices['iPhone 12'] },
  // },

  /* Test against branded browsers. */
  // {
  //   name: 'Microsoft Edge',
  //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
  // },
  // {
  //   name: 'Google Chrome',
  //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
  // },
});
