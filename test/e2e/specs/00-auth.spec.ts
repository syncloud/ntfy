import { test, expect, request } from '@playwright/test'

test('a browser without valid credentials is challenged', async ({ baseURL }) => {
  const context = await request.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    httpCredentials: { username: 'nobody', password: 'wrong' },
  })
  try {
    const response = await context.get('/', { maxRedirects: 0 })
    expect(response.status()).toBe(401)
    expect(response.headers()['www-authenticate']).toMatch(/^Basic /)
  } finally {
    await context.dispose()
  }
})

test('device credentials are accepted', async ({ baseURL }) => {
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
