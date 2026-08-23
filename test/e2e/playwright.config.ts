import { defineConfig, devices } from '@playwright/test'
import { required } from './helpers/env'

const appDomain = required('PLAYWRIGHT_APP_DOMAIN')
const artifactDir = required('PLAYWRIGHT_ARTIFACT_DIR')

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  maxFailures: 1,
  reporter: [['list']],
  outputDir: `${artifactDir}/playwright/test-results`,
  globalTeardown: './globalTeardown.ts',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: `https://${appDomain}`,
    ignoreHTTPSErrors: true,
    permissions: ['notifications'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'on',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 960 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
})
