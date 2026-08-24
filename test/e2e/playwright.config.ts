import { defineConfig } from '@playwright/test'
import { required } from './helpers/env'

const appDomain = required('PLAYWRIGHT_APP_DOMAIN')
const artifactDir = required('PLAYWRIGHT_ARTIFACT_DIR')
const pushServer = required('PLAYWRIGHT_PUSH_SERVER')

const firefox = {
  browserName: 'firefox' as const,
  launchOptions: {
    firefoxUserPrefs: {
      'dom.push.serverURL': `ws://${pushServer}/`,
      'dom.push.testing.allowInsecureServerURL': true,
      'dom.push.loglevel': 'debug',
      'dom.webnotifications.enabled': true,
      'dom.serviceWorkers.testing.enabled': true,
      'dom.push.connection.enabled': true,
    },
  },
}

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
      use: { ...firefox, viewport: { width: 1440, height: 960 } },
    },
    {
      name: 'mobile',
      use: { ...firefox, viewport: { width: 412, height: 915 } },
    },
  ],
})
