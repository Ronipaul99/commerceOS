# CDN implementation guide — TIYAS JEWEL

Date: 22 November 2026  
Status: **Repository implementation complete. Domain, OCI origin and live Cloudflare activation are pending.** Follow the [activation runbook](CDN_ACTIVATION_RUNBOOK.md) when those inputs are ready.

Related plans: [Customer experience and media](CUSTOMER_EXPERIENCE_IMPLEMENTATION_PLAN.md), [OCI deployment](DEPLOYMENT_PLAN.md), [Architecture](ARCHITECTURE.md) and [CMS](ADMIN_REDESIGN_CMS.md).

## 1. Recommended approach and prerequisites

Use Cloudflare as the initial website edge/DNS provider, with HTTPS to the existing OCI application origin. Cache build assets and explicitly published image renditions; keep dynamic HTML, APIs, checkout, admin and private media outside the edge cache. Retain the existing private OCI bucket and server-side storage adapter.

This is the recommended starting architecture, subject to confirming the selected plan permits the expected image workload. Video delivery is a separate decision: do not treat a website CDN subscription as unlimited video hosting. Cloudflare documents media-specific product requirements and restrictions in its [application service terms](https://www.cloudflare.com/service-specific-terms-application-services/). Confirm current product eligibility and pricing before committing to a service; this guide does not purchase one.

Before execution, record:

- Actual production domain, registrar, DNS access and chosen canonical hostname. `tiyas.example` and `www.tiyas.example` below are placeholders, not real Tiyas domains.
- OCI application origin IP/load balancer, architecture, public HTTPS reachability, Nginx configuration and operational access.
- Current DNS export, DNSSEC/DS status, mail records, certificate coverage/renewal and rollback owner.
- OCI bucket/region and least-privilege backend access. The bucket was previously described as `tiyas-jewel-products` in Phoenix; verify current settings without printing credentials. No bucket recreation or region move is required.
- Expected image/video volume, acceptable publication/removal delay, budget and initial performance measurements from Indian customer locations.
- Isolated staging environment with test accounts/content and no live payment side effects.

The current repository supplies a local HTTP Nginx configuration, not a qualified public HTTPS deployment. If there is no public OCI application origin yet, complete that part of the deployment plan before attempting live CDN cutover. A CDN cannot point at the developer's `localhost:3000`.

## 2. Provider selection

| Option                                            | Suitable use                                                                              | Integration decision                                                                                                                                                                                |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare website CDN                            | Website edge, DNS/TLS and eligible public static/image traffic.                           | Recommended first path because the existing application uses one domain. Confirm image workload allowance, cache controls, purge limits and required plan features.                                 |
| bunny.net CDN                                     | A dedicated public-media pull zone while retaining another provider for website DNS/edge. | Alternative when a separate media CDN is preferred. Use the application media gateway as the HTTPS origin, not an unauthenticated private bucket URL. Qualify cost and Indian delivery performance. |
| Amazon CloudFront                                 | Teams already operating AWS distributions and wanting configurable HTTPS custom origins.  | Can front the OCI application as a custom HTTPS origin. Do not assume Amazon S3 Origin Access Control automatically signs requests to OCI Object Storage.                                           |
| Managed video delivery, such as Cloudflare Stream | Reel transcoding and adaptive playback.                                                   | Optional paid video path after content/rights and budget approval. Store provider asset IDs behind an adapter; preserve OCI masters if required.                                                    |

bunny.net documents the CNAME/custom-hostname workflow in its [hostname setup guide](https://support.bunny.net/hc/en-us/articles/207790279-How-to-set-up-a-custom-CDN-hostname). AWS distinguishes [custom origins](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistS3AndCustomOrigins.html) from [Amazon S3 OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html). [Cloudflare Stream](https://developers.cloudflare.com/stream/) is a separate video delivery/encoding product.

Compare providers using actual India-region probes, cold/warm image latency, transfer/request charges, OCI egress, TLS, purge API reliability, cache-key controls, range requests, logging/retention and operational effort. No specific monthly cost, free-plan suitability or speed improvement is asserted without qualification.

Use one CDN for a particular media hostname. Do not put a Cloudflare-proxied media CNAME in front of a bunny.net pull zone unless intentionally operating and testing two cache layers.

## 3. Target origin and media architecture

```text
Browser — HTTPS — website CDN — HTTPS — OCI Nginx
                                           |-- / and /_next/* → Next.js
                                           |-- /api/* → Fastify, never edge-cached
                                           |-- /images/uploads/* → existing authorized Fastify path, uncached
                                           `-- /media/public/* → proposed Fastify public-media gateway
                                                                       |
                                                               private OCI bucket
```

The public-media route is implemented behind `PUBLIC_MEDIA_CACHE_ENABLED`, which defaults to false. Keep same-origin delivery initially; a dedicated `media.<domain>` hostname is optional later. Storage and delivery are different: OCI remains the object store, while the CDN caches approved responses from the gateway.

The table records the original implementation gaps. The delivered origin path and activation sequence are in the runbook:

| File                                              | Existing behavior                                                                                    | Required implementation                                                                                                                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/app.ts`                             | Global `onSend` sets `Cache-Control: no-store`.                                                      | Keep default deny/no-store; add a narrow, reviewed public-media exception for successful responses. Setting a header earlier in a route alone is insufficient. |
| `apps/api/src/modules/admin/routes.ts`            | `/images/uploads/:file` serves public/history-linked or admin-authorized assets.                     | Retain existing authorization and keep this mixed-access route uncached.                                                                                       |
| `apps/api/src/integrations/image-storage.ts`      | API authenticates to OCI through the S3 Compatibility adapter; images are read into bounded buffers. | Reuse credentials privately; add rendition reads/metadata. Whole-buffer image reads are not the future video streaming implementation.                         |
| `apps/web/src/components/ui/responsive-image.tsx` | Uploaded images bypass Next.js resizing.                                                             | Use validated public rendition URLs/manifests and accurate responsive sources; preserve private-image fallback.                                                |
| `apps/web/next.config.ts`                         | Rewrites API and legacy uploaded images.                                                             | Add a same-origin public-media rewrite for host development/Next-only serving; avoid caching private optimizer requests.                                       |
| `infrastructure/nginx/default.conf`               | Local HTTP reverse proxy.                                                                            | Add a separate reviewed production TLS configuration and the public-media proxy route; do not silently turn the local file into a production deployment.       |

Oracle's [S3 Compatibility API documentation](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/s3compatibleapi.htm) describes the backend storage interface. A DNS CNAME to a private bucket does not create authentication, replace signing, or solve origin Host/SNI validation. Avoid long-lived pre-authenticated bucket URLs in public HTML or CDN origin settings.

## 4. Step 1 — Implement the cache-safe public-media boundary

Complete this application work before enabling image caching:

1. Generate responsive image renditions as described in the media plan, with stored metadata and versioned object references.
2. Add a public route such as `/media/public/<asset-id>/<content-version>/<rendition>.webp`. Use a content hash/version in the path; never overwrite bytes at the same versioned URL. Keep old product/order image URLs working.
3. Validate IDs, versions and an explicit rendition allowlist. Resolve object keys server-side; never accept bucket names, arbitrary upstream URLs, filesystem paths or unbounded transform dimensions from the request.
4. Check **current public eligibility** on every origin request: active catalog publication, published CMS reference, or explicit approved public-media reference. An admin session must not make a draft eligible at this public route.
5. If a public asset is unpublished, return 404/410 with `no-store`, regardless of whether the requester is an admin. Draft/admin previews keep using the authenticated uncached path.
6. Do not automatically map every historical order image to the CDN namespace. Preserve current history access while reviewing any broader public exposure separately. Review/customer portraits need explicit publication consent and revocation handling.
7. Emit public cache headers only for successful, publicly eligible images. Never attach `Set-Cookie`, customer data or credentials. Emit `private, no-store` for failures/private responses; do not cache 401/403/404/429/5xx by default.
8. Add a narrow response classification in Fastify's final cache policy so the global no-store hook does not overwrite approved public image headers. All other routes remain no-store. Test the final wire response, not just the route's intermediate header state.
9. Add HEAD support consistent with GET metadata and conditional requests/ETags. Fix access/headers before measuring cache hits.
10. Extend CMS/image manifests and the shared renderer so published storefront media uses the public URL. Private CMS previews retain private URLs. Publication changes enqueue invalidation as described below.

Do not enable a rule to cache all `/images/uploads/*` responses: the path currently mixes public and admin-only media.

## 5. Step 2 — Prepare HTTPS at the OCI origin

1. Deploy the existing Next.js/Fastify application behind Nginx on the selected OCI VM/load balancer. Keep PostgreSQL, Fastify and Next.js container ports private; only the edge-facing HTTPS listener should be reachable as intended.
2. Install a certificate covering the production apex and `www` hostnames. Prefer a publicly trusted certificate with automated renewal for straightforward DNS-only rollback. Use a DNS challenge if inbound HTTP validation will be restricted.
3. Alternatively, use Cloudflare Origin CA for the origin hop. Its trust is for Cloudflare-to-origin; direct browsers will not generally trust it. Record this limitation before planning DNS-only rollback. See [Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/).
4. Configure Nginx for TLS 1.2/1.3, the correct full certificate chain, protected private-key files and explicit approved `server_name` values. Reject unknown hosts/default virtual hosts. Forward the validated host and HTTPS scheme to application containers.
5. Preserve current `/api/`, admin image-upload and legacy image proxy behavior, request limits, webhook bodies/signatures, cookies and timeout allowances. Add `/media/public/` to Fastify without enabling Nginx `proxy_cache` initially.
6. Set HTTP-to-HTTPS/canonical redirects without looping. Preserve method/body on routes that must support redirects; configure Razorpay webhooks to call their final HTTPS endpoint directly.
7. Test origin health, secure admin cookies, public media, uploads and payment webhook signature verification before restricting origin access.
8. Review renewal monitoring. Introduce HSTS cautiously after HTTPS is stable; do not immediately enable preload or `includeSubDomains` without checking all subdomains.

Origin-only verification from an authorized machine, before origin lock-down, using placeholders:

```powershell
$cdnSiteHost = 'tiyas.example'
$cdnOriginIp = '<OCI_ORIGIN_IP>'
curl.exe --resolve "${cdnSiteHost}:443:${cdnOriginIp}" -I "https://${cdnSiteHost}/"
```

Do not add `--insecure` to conceal a certificate problem. For Origin CA, verify using the correct trusted origin CA chain rather than treating a browser trust failure as evidence that Full (strict) is broken.

## 6. Step 3 — Configure DNS without disrupting email

For the recommended Cloudflare full-zone setup:

1. Add the actual domain to the owner's Cloudflare account and select the qualified plan. Enable account MFA and least-privilege team access.
2. Export existing DNS and import/review all records. Preserve MX, SPF, DKIM, DMARC, domain verification, SMTP and any CAA records. Inspect imported records rather than relying on an automatic scan alone.
3. If DNSSEC is active, follow the registrar/provider migration procedure before changing nameservers; a stale DS record can break DNS resolution. Re-enable DNSSEC with the new provider's values after the zone is active. Follow the official [full setup procedure](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).
4. Point the apex A record to the OCI origin IP, or use the load balancer's documented DNS target. Add an AAAA record only if the origin's IPv6/TLS/firewall path works. Set `www` to the appropriate canonical alias.
5. Start web records as DNS-only while validating origin HTTPS. Do not proxy mail/SMTP records. Lower relevant pre-cutover record TTLs in advance where the current provider permits it; this does not eliminate delegation propagation time.
6. Change registrar nameservers to the exact pair assigned by Cloudflare. Verify authoritative resolution and mail delivery after the zone becomes active.
7. Wait for the appropriate edge certificate to become active for the intended hostnames, then switch the web records to Proxied. Verify edge coverage rather than assuming arbitrary nested subdomains are included. See [Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/).
8. Choose one canonical site host and redirect the other. Keep both protected and covered by certificates during migration.

| Record                                | Example target                            | Proxy status                                                |
| ------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| Apex web host                         | OCI origin IP/load-balancer configuration | Proxied after HTTPS qualification.                          |
| `www`                                 | Canonical web alias                       | Proxied after HTTPS qualification.                          |
| Mail/SMTP and MX-related hostnames    | Existing verified mail targets            | DNS-only; preserve existing records.                        |
| Optional `media` on Cloudflare        | Qualified application/media origin        | Proxied, same cache/publication boundaries.                 |
| Optional `media` on bunny.net instead | Assigned bunny.net pull-zone hostname     | DNS-only in Cloudflare DNS; bunny.net handles delivery/TLS. |

Do not create an unrestricted public `api` hostname just for this setup. The existing `/api` path stays same-origin. If a DNS-only origin hostname is needed operationally, firewall/authenticate it; obscurity is not origin protection.

## 7. Step 4 — Enable strict TLS and restrict origin access

Set Cloudflare SSL/TLS mode to **Full (strict)** after the origin certificate is valid. This verifies the encrypted origin hop; do not use Flexible mode to work around certificate failures. Cloudflare's [Full (strict) requirements](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/) describe hostname, expiry and issuer validation.

After successful proxied requests:

- Restrict OCI NSGs/security lists and the host firewall to the provider's current published ingress ranges for web traffic, including IPv6 if enabled. Maintain updates and a controlled operations/renewal exception as needed. Do not expose database/app container ports.
- Consider [Authenticated Origin Pulls](https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/) in addition to firewalling. Full (strict) validates the server; origin-pull authentication addresses the connecting client. Qualify certificate scope and host isolation. A shared global client certificate alone is not unique authorization for this particular zone.
- If using Cloudflare Tunnel instead, treat it as a different connectivity design; do not apply an inbound AOP recipe to it. Tunnel is optional, not required here.
- Configure Nginx real-IP processing only for trusted proxy addresses. Sanitize/replace forwarded headers before passing them to Fastify, and trust only the known Nginx hop in the API. Do not trust arbitrary client `X-Forwarded-For`/`CF-Connecting-IP` headers or enable `trustProxy: true` indiscriminately.
- Verify that rate limits identify distinct customer IPs correctly and cannot be bypassed with forged headers. See [Cloudflare request headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/).
- Retain existing exact HTTPS CORS origins. Cookie security and CSRF remain backend responsibilities; the CDN does not replace them.

Avoid adding interactive browser challenges to Razorpay webhooks, health probes or legitimate API operations. Scope security exceptions narrowly by endpoint/method and continue validating signatures, authorization and rate limits in Fastify.

## 8. Step 5 — Set origin cache headers and cache keys

The following are **initial proposed policies**, to qualify in staging. Browser and edge TTLs are different; edge purge cannot delete a browser's already fresh cached response.

| Response class                                        | Proposed policy                                                                        | Reason                                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Hashed `/_next/static/*` build assets                 | Preserve Next.js hashed-asset header, typically `public, max-age=31536000, immutable`. | New deployment generates new paths. Keep previous deployment assets during rollout.           |
| Public versioned product/campaign renditions          | `public, max-age=60, s-maxage=300, must-revalidate`                                    | Short browser freshness and bounded edge staleness until purge is qualified.                  |
| Customer portraits or promptly revocable media        | Start `private, no-store`, outside CDN eligibility.                                    | Enable any caching only after consent/removal requirements and bounded exposure are approved. |
| Admin, draft/preview media, mixed `/images/uploads/*` | `private, no-store`                                                                    | Authorization-dependent content must never enter shared cache.                                |
| Checkout/cart/order/payment/admin APIs and HTML       | `private, no-store` where applicable; edge bypass everywhere in initial scope.         | Prevent customer data/session/payment leakage.                                                |
| Catalog/CMS/review JSON and public HTML               | Keep current behavior; edge bypass initially.                                          | Server-side caching may be added separately with proper invalidation.                         |
| Error/redirect/private-media denial                   | `no-store`, no positive CDN status TTL override.                                       | Avoid cached denials, transient errors or accidental redirects.                               |

Emit a strong version-based ETag and correct content type/length for public renditions. Handle conditional requests consistently. Do not strip `Set-Cookie` to force caching, and do not add a global Nginx public-cache header. Cloudflare documents [origin cache-control handling](https://developers.cloudflare.com/cache/concepts/cache-control/) and [cookie/cache interactions](https://developers.cloudflare.com/cache/concepts/cache-behavior/).

Start with the provider's normal host/path/query cache key. Public rendition URLs use explicit paths for size/format; reject unexpected query parameters. Do not ignore query strings globally, cache signed/private requests, or depend on `Vary: Cookie` to protect shared content. Keep private requests ineligible instead.

Serve WebP as an explicit representation initially. If AVIF is added, give it a distinct URL rather than changing bytes solely on `Accept` without a qualified variant cache key. Leave `/_next/image` outside the edge allowlist initially: optimizer URLs have query parameters and may involve negotiation/private sources. CDN response compression does not replace image resizing and should not re-encode WebP.

## 9. Step 6 — Configure Cloudflare cache rules

Begin with two rules for the approved web hosts, in the order below. Remove or disable conflicting legacy Page Rules, Workers cache logic, “cache everything”, response overrides and browser-TTL overrides before qualification.

### Rule 1 — Default bypass

Match the approved website hosts:

```text
http.host in {"tiyas.example" "www.tiyas.example"}
```

Action: **Bypass cache**. This is the safe default for HTML, API, admin, checkout, payment, confirmation, drafts and unclassified paths.

### Rule 2 — Allow only anonymous public static media

Place this after Rule 1 and replace the example hosts:

```text
(http.host in {"tiyas.example" "www.tiyas.example"}
 and ssl
 and http.request.method in {"GET" "PURGE"}
 and http.cookie eq ""
 and not any(http.request.headers["authorization"][*] ne "")
 and not any(http.request.headers["range"][*] ne "")
 and http.request.uri.query eq ""
 and (
   starts_with(http.request.uri.path, "/_next/static/")
   or starts_with(http.request.uri.path, "/media/public/")
 ))
```

Action/settings:

- **Eligible for cache**.
- Edge TTL: **Use cache-control header if present, bypass cache if not**.
- Browser TTL: respect origin headers.
- No forced Edge TTL or status-code TTL that overrides origin no-store.
- Keep ordinary cache keys; no custom cookie/auth stripping or query removal.
- No stale-serving override for revocable media. Test provider behavior on expiry, origin failure and unpublish.

Validate expressions/settings against the selected account's actual feature support before importing/deploying. If a necessary fail-closed setting is unavailable, keep the affected route bypassed until an equivalent tested configuration exists. Cloudflare documents [rule settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/) and explains that later matching cache rules can override earlier settings in [rule order](https://developers.cloudflare.com/cache/how-to/cache-rules/order/).

The cookie check intentionally bypasses shared caching for any cookie-bearing request, not only the admin session. This is conservative; optimize only after demonstrating that a narrower condition cannot leak data. HEAD requests are outside this initial allowlist. The provider's internal PURGE method must match the same rule for exact URL invalidation. The generated rule limits caching to the canonical host. Use actual GET requests to prove caching rather than interpreting `curl -I` alone.

Keep `/images/uploads/`, `/_next/image`, `/api/`, `/admin`, `/checkout`, `/cart`, `/wishlist`, order outcome/confirmation URLs and any preview/token URL uncached. RSC/navigation responses remain uncached too; a broad HTML rule can mix Next.js representations or user state.

Do not use Cloudflare Development Mode as the permanent policy. It can help diagnose caching temporarily but does not replace correct rules or purge stale objects already stored.

## 10. Step 7 — Implement publish, replace, purge and invalidation

### Version-first publication

1. Upload/process media privately. Store all required renditions and verify them before publication.
2. Commit the approved public reference and new versioned URL in the database/CMS publication transaction.
3. In the same transaction, insert an invalidation event into a small durable database outbox. Do not rely on an unawaited process-local callback that can be lost on restart.
4. After commit, invalidate affected application caches/manifests and purge old CDN URLs where removal or same-URL staleness is relevant. New content uses new URLs, so a normal image replacement does not wait for an old object to refresh.
5. Process outbox events with a bounded loop in the existing backend deployment, with attempts/backoff, deduplication and operational visibility. No extra message broker or microservice is required.

### Event-to-invalidation map

| Event                                    | Required action                                                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Replace product/campaign image           | Publish new version; refresh catalog/CMS manifests; old URL purge if its public permission is removed. Retain order-history references.                                          |
| Archive product / unpublish CMS          | Recompute each asset's remaining public uses. Revoke/purge only when no permitted public use remains.                                                                            |
| Unpublish customer story/review portrait | Revoke origin public eligibility first; purge every public rendition/hostname and invalidate rendered manifests. Do not leave the portrait cached through a related stale story. |
| Disable a reel                           | Remove public playback eligibility and poster/product manifest references; apply the chosen video provider's removal mechanism as well.                                          |
| Change product price/availability        | Invalidate public catalog/application caches as needed; unchanged image bytes need no media purge. Checkout always revalidates in Fastify.                                       |
| Deploy Next.js                           | New hashed build paths; retain prior assets for old tabs/rolling deploy. Avoid routine purge-everything.                                                                         |

Normal invalidation uses exact full HTTPS URLs, including all configured hostnames and rendition/version paths. Keep a manifest so no size is missed. Tag/prefix invalidation can simplify large sets if supported and qualified, but do not assume a particular plan's limits/features. Query variants/custom keys require matching purge behavior; the initial public route intentionally has no query variants.

Cloudflare recommends URL purging in its [purge guide](https://developers.cloudflare.com/cache/how-to/purge-cache/). A successful purge response acknowledges the request; verify subsequent content/cache behavior rather than treating HTTP 200 as proof that every cached copy was removed. API batch/rate limits must be read from the current account/documentation, not hardcoded from this guide.

### Purge API and credentials

Use a dedicated token scoped to **cache purge on the single production zone**, with no DNS/IAM/account administration. Store it in the backend/deployment secret store, never `NEXT_PUBLIC_*`, `.env.example`, screenshots or CMS content. Use separate tokens for DNS automation if required. Rotate and audit tokens independently from OCI object credentials.

Illustrative operator request, only after the real zone/token/URLs are configured. This example performs a purge if executed; it is not part of documentation validation:

```powershell
$cdnPurgeHeaders = @{
  Authorization = "Bearer $env:CDN_PURGE_API_TOKEN"
}
$cdnPurgeBody = @{
  files = @('https://tiyas.example/media/public/<asset-id>/<version>/640.webp')
} | ConvertTo-Json -Depth 4
$cdnPurgeResult = Invoke-RestMethod `
  -Method Post `
  -Uri "https://api.cloudflare.com/client/v4/zones/$env:CDN_ZONE_ID/purge_cache" `
  -Headers $cdnPurgeHeaders `
  -ContentType 'application/json' `
  -Body $cdnPurgeBody
if (-not $cdnPurgeResult.success) { throw 'CDN purge was not accepted.' }
```

The exact API is documented in [Purge Cached Content](https://developers.cloudflare.com/api/resources/cache/methods/purge/). Handle 429 with Retry-After/bounded backoff, transient network/5xx failures with retries, and permanent auth/config errors with an alert. Do not log token-bearing request headers. Do not repeat publication writes merely because an external purge failed.

### Urgent removal and failure handling

Disable public origin eligibility before purging, so a cache miss cannot immediately repopulate removed media. Retry failed purges durably; surface pending/failed invalidation internally. Verify origin rejection and edge removal from more than one network/region where practical.

Bound residual exposure by the approved TTL. If removal is more urgent, temporarily bypass/block the affected public path and purge it; assess any browser freshness window separately. Browser caches, already downloaded media and customer screenshots cannot be remotely erased by a CDN purge. Content requiring strict immediate authorization should remain uncached or use an edge-validated access design with its own threat model.

Retain objects required by historical orders/private draft references. Public unpublish and physical object deletion are separate operations; do not delete the OCI object first and damage order history.

## 11. Optional dedicated media CDN and video branch

The current Instagram reel implementation uses links and posters. This optional branch is outside the delivered CDN setup.

If website CDN image terms/budget do not fit, use a dedicated media provider with the same application gateway and publication rules:

1. Create a bunny.net pull zone with a dedicated HTTPS application origin that does not loop back into that pull zone. Set/validate origin Host and TLS SNI/certificate behavior.
2. Protect the origin route with the provider's supported origin authentication, firewall controls or a rotated server-side origin secret. Viewer-controlled headers must not authorize draft media. Do not give the public pull zone general OCI bucket credentials.
3. Add `media.<actual-domain>` as a custom hostname, create the assigned CNAME at the DNS provider, issue/activate its certificate and force HTTPS. If Cloudflare hosts DNS, leave this record DNS-only.
4. Apply the same public-only cache policy, no-cookie/private bypass, no negative caching, versioned paths and purge workflow using that provider's API. Measure origin leakage and cache behavior before use.
5. Add only the approved media hostname to CSP/image configuration as needed. Do not enable wildcard remote-image fetching. Use credential-free public reads; private previews remain same-origin and uncached. For cross-origin video/caption fetches, add narrowly scoped CORS/HEAD/Range support without credentialed wildcard origins.

For reels, choose either a qualified video CDN over OCI streaming/range delivery, or a managed service such as Stream. Website cache rules above deliberately exclude MP4/HLS; do not add `.mp4` to the generic allowlist without provider qualification and a video delivery implementation.

Qualify content length/type, HEAD, valid/invalid byte ranges, 206/416 behavior, seeking, signed access where required, poster caching, disable/purge behavior and mobile bandwidth. The current image adapter's full-buffer reads and image-only upload limits are insufficient. See the media plan's reel implementation section. Preserve poster-first loading, one active player, captions and no eager download of all reels.

## 12. Application/configuration work checklist

Settings implemented for the same-origin rollout:

| Setting                                                     | Scope                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `PUBLIC_MEDIA_CACHE_ENABLED`                                         | Backend feature switch; false until staging qualification.                                                         |
| `PUBLIC_MEDIA_EDGE_TTL_SECONDS` / `PUBLIC_MEDIA_BROWSER_TTL_SECONDS` | Validated bounded TTLs by public media class.                                                                      |
| `CDN_PROVIDER`                                                       | Backend adapter selection, disabled/cloudflare.                                  |
| `CDN_ZONE_ID` / `CDN_PURGE_API_TOKEN`                                | Backend/deployment only; token is secret, zone selection is explicit.                                              |

The API validates configuration and publication eligibility and stores purge retries durably. Set the approved canonical/alias names in `CDN_PUBLIC_HOSTS` and the account-qualified batch size in `CDN_PURGE_BATCH_SIZE`. Dedicated media hostnames remain outside this implementation. Add placeholder names only to `.env.example` when those settings are actually implemented; never copy real secrets there.

Keep Next.js free of Prisma/storage credentials. Ensure server-rendered HTML and CMS previews choose the correct public/private media path. Leave API/CMS/HTML edge caching for a separate reviewed change; application caching must also invalidate on publish/product updates. The CDN does not optimize React bundles, fix oversized uploads or reduce stored object count by itself.

## 13. Staging verification and production cutover

### Read-only HTTP probes

After the proposed route/rules are implemented, choose an actual published test image and use GET rather than HEAD to test cache population:

```powershell
$cdnTestAsset = 'https://tiyas.example/media/public/<asset-id>/<version>/640.webp'
curl.exe -sS -D - -o NUL "$cdnTestAsset"
curl.exe -sS -D - -o NUL "$cdnTestAsset"
```

Check content type, cache-control, ETag, cache status and Age, plus image bytes/dimensions in a browser. Repeated requests at one point of presence should demonstrate a cacheable MISS then HIT where supported; cache eviction/conditional behavior may vary. Cloudflare describes response statuses in [cache responses](https://developers.cloudflare.com/cache/concepts/cache-responses/).

Use test accounts and synthetic cookie/header values to confirm bypass; never paste a real session cookie/token into logs or this document:

```powershell
curl.exe -sS -D - -o NUL -H 'Cookie: cdn_probe=1' "$cdnTestAsset"
curl.exe -sS -D - -o NUL -H 'Authorization: Bearer synthetic-invalid-probe' "$cdnTestAsset"
```

These requests must not return a shared-cache HIT. A `DYNAMIC` or bypass result can be valid; also inspect origin logs/headers instead of relying on one label.

### Acceptance matrix

- [ ] DNS apex/www, mail, DNSSEC and certificates work; no mixed content or redirect loops.
- [ ] Origin is unreachable by unauthorized direct requests; trusted proxy/IP handling resists forged headers.
- [ ] Hashed build assets and approved image renditions cache; private/draft/unpublished media do not.
- [ ] Admin login/logout/OTP, CMS preview/upload, cart, checkout, payment/webhook and private confirmation remain functional and uncached.
- [ ] One admin's responses/session data cannot be replayed to another session or anonymous visitor.
- [ ] Unexpected query parameters, wrong methods, invalid asset paths, 401/403/404/429/5xx and Set-Cookie responses cannot enter shared cache.
- [ ] Public-image replacement publishes a new URL; unpublish/re-publish and out-of-order/duplicate events cannot resurrect revoked versions.
- [ ] Purge removes every relevant hostname/rendition; 429/provider failures retry without losing database changes or events across restart.
- [ ] Images remain visually crisp and responsive at 390 px and 1440 px; no layout shift, broken source, new overflow or inconsistent card dimensions.
- [ ] Cold/warm tests from representative Indian networks record image bytes, origin requests, hit ratio, p50/p95 latency and before/after LCP/CLS/INP evidence.
- [ ] Caching does not fetch every carousel slide or reel immediately; reel playback uses a separately qualified delivery path.
- [ ] Secret handling, budget alerts, certificate renewal and rollback are tested.

For production: deploy the application boundary/headers first with edge caching disabled; verify all regressions; enable hashed static assets; then enable a limited public-image cohort. Observe errors, cache/private response probes, origin egress and actual performance before expanding. Warm only a small set of visible popular renditions; do not prefetch the entire catalog or all videos.

Record release image digest, migration version, DNS export, certificate/expiry, cache-rule export/order, TTLs, approved hostnames, purge test results and the operator/date. Source inspection and mock tests are not production deployment evidence.

## 14. Monitoring, cost control and rollback

Monitor edge HIT/MISS/BYPASS, origin latency/errors, bandwidth/request charges, OCI egress, image bytes/size choices, purge outbox age/retries, certificate expiry and broken media. Separate preview/admin probes from public metrics; do not collect customer addresses, session cookies or signed URLs in monitoring payloads.

Set account budget alerts/usage limits where supported. Cold cache, eviction, bot traffic and purge bursts still incur origin work; a CDN is neither a backup nor a guarantee of zero OCI egress. Establish baseline traffic before promising savings.

Rollback order:

1. Disable the public-image cache eligibility rule or activate a more specific bypass, then purge affected existing objects. Do not weaken TLS or expose the bucket.
2. Switch the application feature flag back to existing same-origin image delivery if necessary. Retain legacy objects and public versions needed by open pages/orders.
3. Keep CDN-proxied DNS with bypass while investigating. If DNS-only rollback is necessary, first verify publicly trusted origin TLS, explicitly adjusted firewall access and safe direct-origin protection. Origin CA-only certificates and CDN-only ingress cannot be assumed to work for direct browsers.
4. If reverting nameservers, restore the verified DNS export and coordinate DNSSEC/DS with the registrar. Preserve mail records; account for cached delegation/TTL delays.
5. Leave accepted orders/payment reconciliation and private access protections running. Verify health, admin, checkout, callbacks and images after rollback.

No rollback step deletes the bucket, clears the database, disables authentication, exposes storage keys or blindly purges every zone. An emergency zone-wide purge requires an operational decision and an origin-load plan.

## 15. Completion evidence and documentation status

Implementation is complete only after provider/domain decisions, secure public origin, cache-safe application routes, strict TLS, actual cache hits, private-content rejection, invalidation/retry, image-quality checks, performance comparison and rollback have all been demonstrated.

The application, migration, Cloudflare rules generator and optional HTTPS overlay are implemented. The [implementation status](IMPLEMENTATION_STATUS.md) records local checks. Live DNS, certificate issuance, cloud rules, storage qualification and India-region performance remain activation steps. Follow [CDN_ACTIVATION_RUNBOOK.md](CDN_ACTIVATION_RUNBOOK.md).
