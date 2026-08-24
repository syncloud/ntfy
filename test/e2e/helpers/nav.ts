import { expect, Page } from '@playwright/test'

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 600

export const drawer = (page: Page) =>
  page.getByTestId(isMobile(page) ? 'nav-drawer-mobile' : 'nav-drawer-desktop')

export async function clickNav(page: Page, id: string) {
  const item = drawer(page).getByTestId(id)
  if (!(await item.isVisible())) {
    await page.getByTestId('nav-mobile-toggle').click()
  }
  await item.click()
}

// The mobile drawer stays open after navigating and its overlay swallows clicks on the page
// behind it. Only call this when no dialog is open, since Escape closes the topmost modal.
export async function closeDrawer(page: Page) {
  if (!isMobile(page)) {
    return
  }
  const item = drawer(page).getByTestId('nav-settings')
  if (await item.isVisible()) {
    await page.keyboard.press('Escape')
    await expect(item).toBeHidden()
  }
}
