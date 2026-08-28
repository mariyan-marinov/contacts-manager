import { defineConfig, devices } from '@playwright/test';

const apiUrl = 'http://localhost:5272';
const appUrl = 'http://localhost:4200';

export default defineConfig({
  testDir: './specs',
  // One database, shared by every spec, so they run in sequence.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: appUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Compose supplies Postgres; Playwright starts the two applications itself. --no-launch-profile
  // so launchSettings.json cannot override the environment or the port.
  webServer: [
    {
      command:
        'dotnet run --project ../../src/ContactsManager.Api --no-launch-profile -c Release',
      url: `${apiUrl}/api/contacts?size=1`,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Test',
        ASPNETCORE_URLS: apiUrl,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
    },
    {
      command: 'npm start --prefix ../../web',
      url: appUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});

export { apiUrl, appUrl };
