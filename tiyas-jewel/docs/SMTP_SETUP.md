# Admin email OTP setup

The admin uses your existing SMTP service for password recovery and invitation codes. Configure the following in the private project `.env` or deployment secret store. Do not put working credentials in `.env.example`, source control or chat.

```dotenv
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
ADMIN_OTP_SECRET=
```

- `SMTP_HOST`: provider's SMTP host, without an HTTP URL.
- `SMTP_PORT`: usually 587 with `SMTP_SECURE=false` and required STARTTLS, or 465 with `SMTP_SECURE=true`.
- `SMTP_USER` / `SMTP_PASSWORD`: credentials issued by the existing provider. Some providers require an application-specific password.
- `SMTP_FROM`: approved sender email address; it must be allowed by the provider.
- `ADMIN_OTP_SECRET`: at least 32 random characters, generated locally and kept server-only. Keep it stable across API restarts. Changing it invalidates existing codes.
- `CORS_ORIGINS`: the existing exact storefront origin(s); the first is used for the recovery/invitation page URL in the message.

Restart the Fastify API after setting credentials. No SMTP credential is exposed through `NEXT_PUBLIC_` or the web bundle. TLS certificate verification stays enabled. The transport uses bounded timeouts and disables message-content URL/filesystem access and debug logging, following [Nodemailer's SMTP configuration](https://nodemailer.com/smtp).

Visit `/admin/forgot-password`, enter the registered active admin email, then enter the emailed six-digit code and a password with at least 14 characters. Codes expire after ten minutes and five incorrect attempts invalidate a code. Resend is limited to once per minute; request rate limits also apply. Existing sessions are revoked on completion.

Owners create users through `/admin/users/new`. The invited user receives an OTP and visits `/admin/accept-invitation` to choose a password. If email delivery fails after account creation, the pending user remains in Admin Users; fix SMTP and use Resend invitation. Inactive accounts cannot receive or redeem codes.

An unconfigured service produces an explicit unavailable error. The UI does not claim an actual email was delivered: its public response is conditional to protect account existence. Real provider delivery must be verified with a store-owned inbox after configuration. Local tests inject a test transport and never send to real customers.
