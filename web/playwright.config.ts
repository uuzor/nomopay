import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 8000 },
  reporter: 'dot',
  use: {
    baseURL: 'http://localhost:3001',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
