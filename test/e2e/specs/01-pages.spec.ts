import { test, expect, Page } from '@playwright/test'
import { shoot } from '../helpers/screenshot'

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 600

const drawer = (page: Page) =>
  page.getByTestId(isMobile(page) ? 'nav-drawer-mobile' : 'nav-drawer-desktop')

async function clickNav(page: Page, id: string) {
  if (isMobile(page)) {
    await page.getByTestId('nav-mobile-toggle').click()
  }
  await drawer(page).getByTestId(id).click()
}

test('a user works through the app', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByTestId('splash')).toHaveCount(0)
  await expect(drawer(page)).toBeAttached()
  await shoot(page, testInfo, '01-all-notifications')

  await clickNav(page, 'nav-subscribe')
  await expect(page.getByTestId('subscribe-dialog')).toBeVisible()
  await shoot(page, testInfo, '02-subscribe-dialog')

  await page.getByTestId('subscribe-topic').fill('syncloud')
  await page.getByTestId('subscribe-submit').click()
  await expect(page.getByTestId('subscribe-dialog')).toBeHidden()
  await expect(page).toHaveURL(/syncloud/)
  await shoot(page, testInfo, '03-topic')

  await clickNav(page, 'nav-publish')
  await expect(page.getByTestId('publish-dialog')).toBeVisible()
  await shoot(page, testInfo, '04-publish-dialog')

  await page.keyboard.press('Escape')
  await expect(page.getByTestId('publish-dialog')).toBeHidden()

  await clickNav(page, 'nav-settings')
  await expect(page).toHaveURL(/settings/)
  await shoot(page, testInfo, '05-settings')

  await clickNav(page, 'nav-all')
  await expect(page).not.toHaveURL(/settings/)
})
