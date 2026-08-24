import { test, expect } from '@playwright/test'
import { shoot } from '../helpers/screenshot'
import { required } from '../helpers/env'
import { clickNav, closeDrawer, drawer } from '../helpers/nav'

const deviceUser = required('PLAYWRIGHT_DEVICE_USER')
const devicePassword = required('PLAYWRIGHT_DEVICE_PASSWORD')

test('a user signs in and works through the app', async ({ page }, testInfo) => {
  await page.goto('/')

  await expect(page.locator('#username-textfield')).toBeVisible()
  await shoot(page, testInfo, '01-login')

  await page.locator('#username-textfield').fill(deviceUser)
  await page.locator('#password-textfield').fill(devicePassword)
  await page.locator('#sign-in-button').click()

  await expect(page).toHaveURL(new RegExp(`^https://${required('PLAYWRIGHT_APP_DOMAIN')}`))
  await expect(drawer(page)).toBeAttached()
  await expect(page.getByTestId('splash')).toHaveCount(0)
  await shoot(page, testInfo, '02-all-notifications')

  await clickNav(page, 'nav-subscribe')
  await expect(page.getByTestId('subscribe-dialog')).toBeVisible()
  await shoot(page, testInfo, '03-subscribe-dialog')

  await page.getByTestId('subscribe-topic').fill('syncloud')
  await page.getByTestId('subscribe-submit').click()
  await expect(page.getByTestId('subscribe-dialog')).toBeHidden()
  await expect(page).toHaveURL(/syncloud/)
  await closeDrawer(page)
  await shoot(page, testInfo, '04-topic')

  await clickNav(page, 'nav-publish')
  await expect(page.getByTestId('publish-dialog')).toBeVisible()
  await shoot(page, testInfo, '05-publish-dialog')

  await page.keyboard.press('Escape')
  await expect(page.getByTestId('publish-dialog')).toBeHidden()

  await clickNav(page, 'nav-settings')
  await expect(page).toHaveURL(/settings/)
  await closeDrawer(page)
  await shoot(page, testInfo, '06-settings')

  await clickNav(page, 'nav-all')
  await expect(page).not.toHaveURL(/settings/)

  await clickNav(page, 'nav-logout')
  await expect(page.locator('#username-textfield')).toBeVisible()
  await shoot(page, testInfo, '07-logged-out')
})
