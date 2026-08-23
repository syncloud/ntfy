import { test, expect, request } from '@playwright/test'

test('unauthenticated request is challenged for credentials', async ({ baseURL }) => {
  const context = await request.newContext({ baseURL, ignoreHTTPSErrors: true })
  try {
    const response = await context.get('/', { maxRedirects: 0 })
    expect(response.status()).toBe(401)
    expect(response.headers()['www-authenticate']).toMatch(/^Basic /)
  } finally {
    await context.dispose()
  }
})

test('credentials are accepted', async ({ baseURL }) => {
  const context = await request.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    httpCredentials: {
      username: process.env.PLAYWRIGHT_DEVICE_USER ?? 'user',
      password: process.env.PLAYWRIGHT_DEVICE_PASSWORD ?? 'Password1',
    },
  })
  try {
    const response = await context.get('/')
    expect(response.status()).toBe(200)
  } finally {
    await context.dispose()
  }
})
