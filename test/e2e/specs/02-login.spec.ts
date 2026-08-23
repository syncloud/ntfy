import { test, expect } from '@playwright/test'
import { shoot } from '../helpers/screenshot'

const deviceUser = process.env.PLAYWRIGHT_DEVICE_USER ?? 'user'
const devicePassword = process.env.PLAYWRIGHT_DEVICE_PASSWORD ?? 'Password1'

test('a signed out user is taken to the portal and back', async ({ page }, testInfo) => {
  await page.goto('/')

  await expect(page.locator('#username-textfield')).toBeVisible()
  await shoot(page, testInfo, '06-login-portal')

  await page.locator('#username-textfield').fill(deviceUser)
  await page.locator('#password-textfield').fill(devicePassword)
  await page.locator('#sign-in-button').click()

  await expect(page).toHaveURL(new RegExp(`^https://${process.env.PLAYWRIGHT_APP_DOMAIN}`))
  await expect(page.getByTestId('splash')).toHaveCount(0)
  await shoot(page, testInfo, '07-after-login')
})
