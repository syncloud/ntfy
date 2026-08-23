# ntfy

[ntfy](https://ntfy.sh) packaged as a Syncloud app.

Publish with an HTTP request, receive in a browser, a script, or the ntfy Android app:

```bash
curl -u <user>:<password> -d "backup finished" https://ntfy.<your-device>/alerts
```

It is also a [UnifiedPush](https://unifiedpush.org) distributor, so Android apps such as Element and
Tusky can receive push through this device instead of through Google.

## Auth

ntfy has no LDAP or OIDC support, so authentication is delegated to the platform's Authelia over
nginx `auth_request`. Users are not managed in ntfy; they are created from `Remote-User` on first
request, and the `syncloud` group maps to the ntfy admin role. This needs
[cyberb/ntfy](https://github.com/cyberb/ntfy/tree/auth-user-header-autocreate).

UnifiedPush endpoints (`/up*`) and the Matrix push gateway are anonymous, because the sending server
has no credentials to present. Both strip the `Remote-*` headers, and `auth-default-access` is
`deny-all`.

## Not done

- Web Push (browser notifications with the tab closed).
