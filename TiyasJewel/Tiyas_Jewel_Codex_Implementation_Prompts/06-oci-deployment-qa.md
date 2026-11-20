# STAGE 06 — OCI DEPLOYMENT & PRODUCTION HARDENING

Continue the completed TIYAS JEWEL project.

This is the final implementation stage.

Deploy the Next.js storefront, Fastify API and PostgreSQL database using OCI Always Free resources.

Do not add enterprise infrastructure or paid cloud dependencies.

## 1. Infrastructure assessment

Before provisioning anything, identify:
- Existing OCI compute instances
- Available Always Free compute allocation
- Available block storage
- Available Object Storage
- Existing public IP and domain configuration
- Architecture compatibility
- Potential billable resources

Do not assume the entire free allocation is unused.

Never provision paid resources automatically.

If OCI credentials or cloud access are unavailable, generate deployment scripts and document the manual steps. Do not claim deployment occurred.

## 2. Target architecture

Use one OCI Ampere A1 Ubuntu ARM64 VM, if sufficient eligible capacity is available.

Run:
- Nginx
- Next.js production server
- Fastify backend
- PostgreSQL

Use Docker Compose.

Do not introduce Kubernetes, managed container clusters, managed PostgreSQL or paid load balancers.

All production Docker images must support Linux ARM64.

## 3. Container deployment

Create production Dockerfiles for:
- Next.js
- Fastify

Use:
- Multi-stage builds
- Non-root application processes where practical
- Minimal runtime images
- Health checks
- Restart policies
- Persistent database volume
- Resource limits
- Appropriate container logging

Do not include development dependencies unnecessarily in runtime images.

## 4. Nginx routing

Configure:

/ → Next.js

/api/ → Fastify API

Use one public domain.

Keep Fastify and PostgreSQL private.

Only Nginx should expose the required HTTP/HTTPS ports publicly.

Preserve correct request headers, host information and proxy trust configuration.

## 5. PostgreSQL

Run PostgreSQL in a persistent, private Docker container.

Configure:
- Strong database credentials
- Private Docker network
- Database health checks
- Durable volumes
- Automated migration process
- Scheduled backups
- Backup retention
- Recovery instructions

PostgreSQL port 5432 must not be exposed publicly.

Do not store backups only on the same VM disk.

Use OCI Object Storage within available free capacity or another explicitly approved off-VM backup location.

Test database restoration.

## 6. OCI Object Storage

Configure product image storage.

Implement:
- Secure backend uploads
- Appropriate bucket permissions
- Public read access only for intended public product media
- Private write credentials
- Unique object names
- Safe image deletion
- Object metadata
- Image optimization

Use Cloudflare caching for public product media where appropriate.

Do not expose OCI API credentials to frontend clients.

## 7. Cloudflare

Configure:
- DNS
- CDN for cacheable public assets
- HTTPS
- Appropriate caching
- Basic security protections

Do not cache:
- Admin responses
- Checkout responses
- Payment responses
- Customer information
- Private API data

Use a valid origin certificate and Cloudflare Full (strict) TLS.

Do not weaken origin certificate verification.

## 8. OCI network security

Configure:
- SSH access restricted to approved administrative sources
- HTTP/HTTPS as required
- Firewall rules
- OCI network security rules
- Non-public database access
- Non-public backend container ports
- Least-privilege OCI credentials

Document OCI network security and host firewall settings.

## 9. Secret management

Use environment variables or an appropriate secret-management mechanism.

Never commit:
- Database passwords
- Razorpay secret keys
- Admin credentials
- OCI private keys
- Session secrets

Provide .env.example with placeholder values only.

## 10. Monitoring

Implement minimal operational monitoring:
- Application logs
- API health endpoint
- Database health checks
- Disk space monitoring
- Container restart visibility
- Backup success/failure logging
- Basic error alerts

Do not add a heavy observability stack.

## 11. Performance optimization

Optimize the storefront for small-server hosting.

Focus on:
- Next.js server rendering
- Image optimization
- Responsive images
- Static asset caching
- Database indexes
- Avoiding unnecessary database queries
- Fast API responses
- Reducing JavaScript bundle size
- Efficient font loading
- Reasonable connection pool limits

Run performance tests at realistic small-MVP traffic levels.

Document observed limits rather than claiming the system is infinitely scalable.

## 12. SEO

Implement:
- Product metadata
- Collection metadata
- Homepage metadata
- Canonical URLs
- Sitemap
- Robots configuration
- Product structured data
- Open Graph images
- Semantic page headings

Avoid fake ratings and unverified claims.

## 13. End-to-end testing

Run the customer journey:

Homepage
→ Shop
→ Product
→ Add to Cart
→ Checkout
→ Razorpay Test Payment
→ Order Confirmation

Run the admin journey:

Admin Login
→ Add Product
→ Upload Product Image
→ Publish Product
→ View Storefront
→ Receive New Order
→ View Order Details
→ Mark Completed

Also test:
- Failed payment
- Duplicate payment callback
- Unavailable product
- Insufficient stock
- Invalid address
- Unauthorized admin request
- Image upload validation
- Responsive mobile checkout
- Database connection recovery

## 14. Launch readiness

Prepare:
- Production environment guide
- Docker deployment commands
- Nginx configuration
- DNS and HTTPS setup
- Database migration instructions
- Backup and restore scripts
- Product image storage setup
- Razorpay production configuration guide
- Admin account setup
- Rollback procedure
- Security checklist

Confirm that actual shipping, tax, COD and returns policies are supplied and approved before launch.

Live payment processing must remain disabled until production credentials and payment verification are configured and tested.

## 15. Final report

Report:
- Implemented functionality
- Passing and failing tests
- Performance measurements
- Security findings
- Actual deployment status
- Cloud resources used
- Free-tier usage concerns
- Backup restoration results
- Remaining launch blockers

Do not claim the website is deployed, production-ready or accepting live payments unless those steps have actually been completed and verified.

Stop after Stage 06.
