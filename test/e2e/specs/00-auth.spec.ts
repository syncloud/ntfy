import { test, expect } from '@playwright/test'
import { shoot } from '../helpers/screenshot'

test('unauthenticated browser is challenged for credentials', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  const page = await context.newPage()
  try {
    const response = await page.goto(baseURL!)
    expect(response?.status()).toBe(401)
    expect(await response?.headerValue('www-authenticate')).toMatch(/^Basic /)
    await shoot(page, testInfo, '00-unauthenticated')
  } finally {
    await context.close()
  }
})
