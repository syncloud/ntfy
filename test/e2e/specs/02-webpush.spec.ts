import { test, expect, Page } from '@playwright/test'
import { shoot } from '../helpers/screenshot'
import { required } from '../helpers/env'

const deviceUser = required('PLAYWRIGHT_DEVICE_USER')
const devicePassword = required('PLAYWRIGHT_DEVICE_PASSWORD')
const pushServer = required('PLAYWRIGHT_PUSH_SERVER')
const appDomain = required('PLAYWRIGHT_APP_DOMAIN')

const topic = 'webpush'

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 600

const drawer = (page: Page) =>
  page.getByTestId(isMobile(page) ? 'nav-drawer-mobile' : 'nav-drawer-desktop')

async function clickNav(page: Page, id: string) {
  const item = drawer(page).getByTestId(id)
  if (!(await item.isVisible())) {
    await page.getByTestId('nav-mobile-toggle').click()
  }
  await item.click()
}

async function deliveries(page: Page) {
  const response = await page.request.get(`http://${pushServer}/deliveries`)
  return response.json()
}

test('a background notification reaches the push server', async ({ page }, testInfo) => {
  await page.goto('/')

  await page.locator('#username-textfield').fill(deviceUser)
  await page.locator('#password-textfield').fill(devicePassword)
  await page.locator('#sign-in-button').click()

  await expect(page).toHaveURL(new RegExp(`^https://${appDomain}`))
  await expect(drawer(page)).toBeAttached()
  await expect(page.getByTestId('splash')).toHaveCount(0)

  await clickNav(page, 'nav-settings')
  await expect(page).toHaveURL(/settings/)
  await page.getByTestId('pref-web-push').click()
  await page.getByTestId('pref-web-push-enabled').click()
  await shoot(page, testInfo, '08-web-push-enabled')

  await clickNav(page, 'nav-subscribe')
  await expect(page.getByTestId('subscribe-dialog')).toBeVisible()
  await page.getByTestId('subscribe-topic').fill(topic)
  await page.getByTestId('subscribe-submit').click()
  await expect(page.getByTestId('subscribe-dialog')).toBeHidden()

  await expect(async () => {
    const before = await deliveries(page)
    const response = await page.request.post(`https://${appDomain}/${topic}`, {
      data: 'background hello',
      headers: { authorization: `Basic ${btoa(`${deviceUser}:${devicePassword}`)}` },
    })
    expect(response.status()).toBe(200)

    const after = await deliveries(page)
    expect(after.length).toBeGreaterThan(before.length)
    const delivery = after[after.length - 1]
    expect(delivery.vapid).toBe(true)
    expect(delivery.bytes).toBeGreaterThan(0)
  }).toPass({ timeout: 60_000 })
})
