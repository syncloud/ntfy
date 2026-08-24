import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'

const port = Number(process.env.PUSH_SERVER_PORT ?? 8090)

function ownAddress() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address
      }
    }
  }
  return '127.0.0.1'
}

const host = `${ownAddress()}:${port}`
const sockets = new Map()
const delivered = []

const server = createServer((request, response) => {
  const url = new URL(request.url, `http://${host}`)

  if (request.method === 'GET' && url.pathname === '/deliveries') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify(delivered))
    return
  }

  const channelID = url.pathname.startsWith('/push/') ? url.pathname.slice('/push/'.length) : null
  if (!channelID || request.method !== 'POST') {
    response.writeHead(404).end()
    return
  }

  const chunks = []
  request.on('data', (chunk) => chunks.push(chunk))
  request.on('end', () => {
    const body = Buffer.concat(chunks)
    delivered.push({
      channelID,
      bytes: body.length,
      encoding: request.headers['content-encoding'] ?? '',
      vapid: (request.headers.authorization ?? '').startsWith('vapid'),
      ttl: request.headers.ttl ?? '',
    })
    const socket = sockets.get(channelID)
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(
        JSON.stringify({
          messageType: 'notification',
          channelID,
          version: randomUUID(),
          headers: { encoding: request.headers['content-encoding'] ?? 'aes128gcm' },
          data: body.toString('base64url'),
        })
      )
    }
    response.writeHead(201).end()
  })
})

new WebSocketServer({ server }).on('connection', (socket) => {
  socket.on('message', (raw) => {
    let message
    try {
      message = JSON.parse(raw.toString())
    } catch {
      return
    }

    if (message.messageType === 'hello') {
      socket.send(
        JSON.stringify({
          messageType: 'hello',
          uaid: message.uaid || randomUUID(),
          status: 200,
          use_webpush: true,
        })
      )
    } else if (message.messageType === 'register') {
      sockets.set(message.channelID, socket)
      socket.send(
        JSON.stringify({
          messageType: 'register',
          channelID: message.channelID,
          status: 200,
          pushEndpoint: `http://${host}/push/${message.channelID}`,
        })
      )
    } else if (message.messageType === 'unregister') {
      sockets.delete(message.channelID)
      socket.send(JSON.stringify({ messageType: 'unregister', channelID: message.channelID, status: 200 }))
    } else if (message.messageType === 'ping' || Object.keys(message).length === 0) {
      socket.send('{}')
    }
  })
})

server.listen(port, '0.0.0.0', () => {
  process.stdout.write(`push server on ${host}\n`)
})
