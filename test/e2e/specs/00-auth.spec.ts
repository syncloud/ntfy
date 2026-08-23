import { test, expect, request } from '@playwright/test'

test('a browser with no credentials is sent to the login portal', async ({ baseURL }) => {
  const context = await request.newContext({ baseURL, ignoreHTTPSErrors: true })
  try {
    const response = await context.get('/', { maxRedirects: 0 })
    expect(response.status()).toBe(302)
    expect(response.headers()['location']).toMatch(/^https:\/\/auth\./)
  } finally {
    await context.dispose()
  }
})

test('a client that sent credentials is challenged', async ({ baseURL }) => {
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
