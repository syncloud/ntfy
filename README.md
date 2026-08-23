# ntfy

[ntfy](https://ntfy.sh) packaged as a Syncloud app.

ntfy is an HTTP-based pub-sub notification service. Publish with a plain HTTP request:

```bash
curl -u <device-user>:<device-password> -d "backup finished" https://ntfy.<your-device>/alerts
```

and receive it in the browser, the [ntfy Android app](https://f-droid.org/en/packages/io.heckel.ntfy/), or any script.

It is also a [UnifiedPush](https://unifiedpush.org) distributor, so Android apps such as Element,
Tusky and FindMyDevice can receive push notifications through this device instead of through Google.

## Authentication

ntfy has no LDAP or OIDC support, so the app delegates authentication to the platform's Authelia
via nginx `auth_request`. The `auth-request` authz endpoint accepts both a portal cookie and an
`Authorization: Basic` header, so browsers and the Android app authenticate the same way, with
Syncloud device credentials.

Users are not managed inside ntfy. They are created on their first request from the `Remote-User`
header, and membership of the `syncloud` group in `Remote-Groups` maps to the ntfy admin role and is
re-synced on every request. This needs the `auth-user-header` support in
[cyberb/ntfy](https://github.com/cyberb/ntfy/tree/auth-user-header-autocreate), a fork of ntfy
carrying the server side of [ntfy#1579](https://github.com/binwiederhier/ntfy/pull/1579) plus
auto-provisioning and group-to-role mapping.

Two paths stay unauthenticated because the protocols give the sender nowhere to put credentials:

- `/up<12 chars>` — UnifiedPush endpoints. The application server (a Matrix homeserver, a Mastodon
  instance) only ever receives a URL. Authorization is the URL's entropy, as
  [RFC8030](https://www.rfc-editor.org/rfc/rfc8030) capability URLs, and the payload is encrypted
  end-to-end per [RFC8291](https://www.rfc-editor.org/rfc/rfc8291), so the device never sees it.
- `/_matrix/push/v1/notify` — the Matrix push gateway.

Both strip `Remote-User` and `Remote-Groups` before proxying, so those headers cannot be spoofed to
gain an identity. `auth-default-access` is `deny-all`, so anonymous access to any other topic is
refused.

## Not yet done

- Web Push (browser notifications while the tab is closed) needs a VAPID keypair generated at install
  time via `ntfy webpush keys` and persisted in `$SNAP_DATA`.
- The app has no UI of its own; the ntfy web app is served directly.
- Playwright e2e specs.
