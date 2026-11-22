# Activate the TIYAS JEWEL CDN

The repository ships the public media gateway, Cloudflare rules generator, purge worker and HTTPS origin configuration. Start activation when a storefront domain and a public OCI application origin are available. Use an isolated staging hostname and test data before moving production traffic. The [CDN implementation guide](CDN_IMPLEMENTATION_GUIDE.md) explains the architecture and policy.

## 1. Collect the deployment inputs

- Record the canonical domain, optional redirect alias, registrar, Cloudflare zone, public OCI origin address, and whether TLS terminates at Nginx. The bundled overlay is for TLS at Nginx on an OCI VM or a TCP load balancer that preserves the Cloudflare source address. A terminating load balancer needs its own trusted proxy configuration.
- Confirm current plan terms and limits for public image traffic and exact-URL purges. Enable account MFA and create a backend token with **Cache Purge** permission for this zone alone. DNS changes use the operator account.
- Export the current DNS records, registrar nameservers and DNSSEC DS values. Record the approved mail records separately. Back up the database and verify the restore procedure.
- Issue a certificate covering the canonical hostname and alias. A publicly trusted certificate with DNS challenge renewal allows a DNS-only rollback. With Cloudflare Origin CA, verify the origin with its appropriate trusted CA and keep proxied DNS for rollback.

## 2. Deploy and verify the HTTPS origin

Run commands from `tiyas-jewel`. Substitute your real values for the examples. Put the deployment environment file outside version control and restrict access to it. The existing application, database, OCI credentials, CORS and payment settings remain required.

```dotenv
SITE_PUBLIC_URL=https://tiyas.example
CORS_ORIGINS=https://tiyas.example
CDN_ORIGIN_CONFIG=/srv/tiyas/nginx-cdn.conf
CDN_ORIGIN_TLS_DIR=/srv/tiyas/tls
CDN_PROXY_SUBNET=172.30.74.0/28
CDN_PROXY_IP=172.30.74.2
PUBLIC_MEDIA_CACHE_ENABLED=false
PUBLIC_MEDIA_EDGE_TTL_SECONDS=300
PUBLIC_MEDIA_BROWSER_TTL_SECONDS=60
CDN_PROVIDER=disabled
```

Choose a Docker subnet that is unused on the host and distinct from the OCI VCN and other Docker networks. Put `fullchain.pem` and `privkey.pem` in the protected TLS directory. The optional Compose overlay removes the loopback web port, exposes only the Nginx listeners, and assigns Nginx the single address trusted by Fastify. The default Compose environment stays local. Use Compose 2.24.4 or newer for the override tags. [Docker Compose merge reference](https://docs.docker.com/reference/compose-file/merge/)

```sh
# Write configuration on the OCI host using the actual domain names.
curl -fsS https://api.cloudflare.com/client/v4/ips -o /srv/tiyas/cloudflare-ips.json
node infrastructure/cdn/render-origin.mjs /srv/tiyas/cloudflare-ips.json tiyas.example www.tiyas.example > /srv/tiyas/nginx-cdn.conf
docker compose --env-file /srv/tiyas/store.env -f compose.yaml -f infrastructure/docker/compose.cdn.yaml --profile edge config --quiet
docker compose --env-file /srv/tiyas/store.env -f compose.yaml -f infrastructure/docker/compose.cdn.yaml --profile edge up -d --build --wait
```

Omit the alias argument if there is one hostname. The migration job applies the public-media migration before the API starts. Check the migration job, `nginx -t`, certificate renewal and origin health. From an allowed test client, verify `curl --resolve 'tiyas.example:443:ACTUAL_ORIGIN_IP' https://tiyas.example/api/health`. Check the alias redirect, webhook endpoint, secure admin cookies and a product image upload. Add AAAA only after verifying the full IPv6 path.

Inventory existing uploads from the deployed API container, which has access to the database and private bucket. The first command is a dry run. In the second command, replace `db/tiyas_jewel` with the actual database host and name before applying.

```sh
docker compose --env-file /srv/tiyas/store.env -f compose.yaml -f infrastructure/docker/compose.cdn.yaml exec api node apps/api/dist/scripts/image-maintenance.js
docker compose --env-file /srv/tiyas/store.env -f compose.yaml -f infrastructure/docker/compose.cdn.yaml exec api node apps/api/dist/scripts/image-maintenance.js --apply --confirm=db/tiyas_jewel
```

The backfill records SHA-256 digests for existing WebP renditions and fills missing sizes. It keeps existing masters and legacy URLs. Review failures before enabling CDN images.

## 3. Connect Cloudflare DNS and TLS

1. Add the domain to the qualified Cloudflare zone. Compare the imported DNS records against the export, including MX, SPF, DKIM, DMARC and CAA. Keep email records DNS-only.
2. Follow Cloudflare's DNSSEC migration procedure before changing nameservers. Change the registrar delegation to the assigned nameservers. Verify authoritative resolution and email, then set the new DS if using DNSSEC.
3. Point web records to the validated OCI origin. Initially keep them DNS-only while testing a publicly trusted origin certificate. For Origin CA, validate through an authorized client using the correct CA or a staging proxy.
4. Wait for the Cloudflare edge certificate to cover both hostnames. Set **Full (strict)**, apply the bypass rules from the next step, then proxy the web records. Verify HTTPS, redirects and final HTTPS webhook callbacks.
5. Restrict OCI NSG/security-list rules and the OS firewall to current Cloudflare ingress ranges, with a controlled operator/renewal path. Regenerate the Nginx configuration when provider ranges change. Verify that direct unauthorized ingress fails and that the API records distinct customer IPs without accepting forged forwarding headers.

Use the provider's current setup and certificate instructions. [Cloudflare full-zone setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) · [Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/) · [Cloudflare IP addresses](https://developers.cloudflare.com/fundamentals/concepts/cloudflare-ip-addresses/)

## 4. Enable caching in stages

Generate the chosen rules as a reviewable JSON file. The script writes the file content to stdout and does not contact Cloudflare. Apply the rules in the dashboard, or merge them into an existing `http_request_cache_settings` entry point after exporting it. Preserve unrelated rules and remove conflicts that would force caching. Check that the account supports the settings before enabling the second rule.

```sh
node infrastructure/cdn/cloudflare-rules.mjs bypass tiyas.example www.tiyas.example > /srv/tiyas/cdn-bypass.json
node infrastructure/cdn/cloudflare-rules.mjs static tiyas.example www.tiyas.example > /srv/tiyas/cdn-static.json
node infrastructure/cdn/cloudflare-rules.mjs images tiyas.example www.tiyas.example > /srv/tiyas/cdn-images.json
```

Apply default **Bypass** first. Then qualify the `static` stage with repeated GETs to a hashed `/_next/static/` file. Keep the alias redirect outside caching. Before enabling the `images` stage, configure the API with `CDN_PROVIDER=cloudflare`, the real `CDN_ZONE_ID`, a zone-scoped `CDN_PURGE_API_TOKEN` from the secret store, `CDN_PUBLIC_HOSTS` as the approved comma-separated hostnames, and an account-qualified `CDN_PURGE_BATCH_SIZE` of 1–16. Set `PUBLIC_MEDIA_CACHE_ENABLED=true` and recreate the API while the edge still bypasses images. Reload Nginx so its upstream addresses resolve after the recreation.

Verify a published product or CMS rendition through the origin and storefront. The URL must look like `/media/public/<asset-id>/<sha256>/640.webp`. Apply the `images` rules only after the origin checks pass. The rules use origin cache headers, preserve the standard key, and allow the internal `PURGE` method to match exact URL invalidation. [Cloudflare Cache Rules settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/) · [Single-file purge](https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-single-file/)

## 5. Prove the rollout

1. Use a published staging image and issue two anonymous GETs at the same edge location. Check status, content type, length, ETag, `CF-Cache-Status` and `Age`. Verify a cache hit. Repeat with a synthetic cookie, Authorization header, query parameter, HEAD and range request. Check bypass and confirm draft/unpublished URLs cannot be cached.
2. Replace and unpublish a staging image. Check the new hash URL after a replacement. Check immediate origin rejection after the last public use is removed, then verify old URLs stop hitting the edge after the purge worker runs. An active product or CMS use can keep an identical URL public. Verify all configured hosts and sizes.
3. Confirm account login/logout, CMS preview, catalog, bag, checkout, webhook and private order confirmation through the proxied host. Verify that images load at 390px and 1440px. Compare cold and warm India-region requests for image bytes, cache hit ratio, origin egress, p50/p95 latency and page performance.
4. Monitor the API logs for `Public media purge scheduled for retry` and verify there are no stuck events. This read-only query shows the backlog and latest failure without exposing media paths or tokens.

```sql
SELECT count(*) AS pending, min("createdAt") AS oldest,
       max("attempts") AS max_attempts,
       count(*) FILTER (WHERE "lastError" IS NOT NULL) AS failed_attempts_pending
FROM "MediaPurgeEvent";
```

Record the deployed image digest, migration, DNS/rule exports, certificate expiry, exact-URL purge evidence and monitoring results. Reels still open their Instagram links. Only eligible product and CMS renditions enter the image cache.

## 6. Roll back

Apply the `static` or `bypass` rules first, then purge affected fully qualified image URLs and their renditions. Disable `PUBLIC_MEDIA_CACHE_ENABLED` and recreate the API to restore legacy image delivery. Keep the purge provider active until remaining revocations drain. Preserve the private bucket, current objects and migrations. For a DNS rollback, verify origin trust, firewall, mail and DNSSEC coordination before removing the proxy or reverting delegation.
