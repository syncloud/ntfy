import { test, expect, Page } from '@playwright/test'
import { shoot } from '../helpers/screenshot'

test.describe.configure({ mode: 'serial' })

const drawerId = (page: Page) =>
  (page.viewportSize()?.width ?? 0) >= 600 ? 'nav-drawer-desktop' : 'nav-drawer-mobile'

const nav = (page: Page, id: string) => page.getByTestId(drawerId(page)).getByTestId(id)

async function open(page: Page) {
  await page.goto('/')
  if (drawerId(page) === 'nav-drawer-mobile') {
    await page.getByTestId('nav-mobile-toggle').click()
  }
  await expect(nav(page, 'nav-settings')).toBeVisible()
}

test('all notifications', async ({ page }, testInfo) => {
  await open(page)
  await shoot(page, testInfo, '01-all-notifications')
})

test('subscribe dialog', async ({ page }, testInfo) => {
  await open(page)
  await nav(page, 'nav-subscribe').click()
  await expect(page.getByTestId('subscribe-dialog')).toBeVisible()
  await shoot(page, testInfo, '02-subscribe-dialog')
})

test('topic page', async ({ page }, testInfo) => {
  await open(page)
  await nav(page, 'nav-subscribe').click()
  await expect(page.getByTestId('subscribe-dialog')).toBeVisible()
  await page.getByTestId('subscribe-topic').fill('syncloud')
  await page.getByTestId('subscribe-submit').click()
  await expect(page.getByTestId('subscribe-dialog')).toBeHidden()
  await shoot(page, testInfo, '03-topic')
})

test('publish dialog', async ({ page }, testInfo) => {
  await open(page)
  await nav(page, 'nav-publish').click()
  await expect(page.getByTestId('publish-dialog')).toBeVisible()
  await shoot(page, testInfo, '04-publish-dialog')
})

test('settings', async ({ page }, testInfo) => {
  await open(page)
  await nav(page, 'nav-settings').click()
  await expect(page).toHaveURL(/settings/)
  await shoot(page, testInfo, '05-settings')
})

test('account', async ({ page }, testInfo) => {
  await open(page)
  await nav(page, 'nav-account').click()
  await expect(page).toHaveURL(/account/)
  await shoot(page, testInfo, '06-account')
})
