import { test, expect } from '@playwright/test'
import { shoot } from '../helpers/screenshot'

test.use({ httpCredentials: undefined })

test('unauthenticated browser is challenged for credentials', async ({ page }, testInfo) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(401)
  expect(await response?.headerValue('www-authenticate')).toMatch(/^Basic /)
  await shoot(page, testInfo, '00-unauthenticated')
})
