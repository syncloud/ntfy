import { test, expect } from '@playwright/test'
import { shoot } from '../helpers/screenshot'

test.describe.configure({ mode: 'serial' })

test('all notifications', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByTestId('nav-settings')).toBeVisible()
  await shoot(page, testInfo, '01-all-notifications')
})

test('subscribe dialog', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByTestId('nav-subscribe').click()
  await expect(page.getByTestId('subscribe-dialog')).toBeVisible()
  await shoot(page, testInfo, '02-subscribe-dialog')
})

test('topic page', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByTestId('nav-subscribe').click()
  await expect(page.getByTestId('subscribe-dialog')).toBeVisible()
  await page.getByTestId('subscribe-topic').fill('syncloud')
  await page.getByTestId('subscribe-submit').click()
  await expect(page.getByTestId('subscribe-dialog')).toBeHidden()
  await expect(page.getByTestId('nav-publish')).toBeVisible()
  await shoot(page, testInfo, '03-topic')
})

test('publish dialog', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByTestId('nav-publish').click()
  await expect(page.getByTestId('publish-dialog')).toBeVisible()
  await shoot(page, testInfo, '04-publish-dialog')
})

test('settings', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByTestId('nav-settings').click()
  await expect(page).toHaveURL(/settings/)
  await shoot(page, testInfo, '05-settings')
})

test('account', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByTestId('nav-account').click()
  await expect(page).toHaveURL(/account/)
  await shoot(page, testInfo, '06-account')
})
