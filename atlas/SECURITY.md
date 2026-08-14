# ATLAS – Production Security Requirements

This document defines the **minimum** network and transport security a
production deployment of ATLAS must provide. The application itself
(NestJS backend, Next.js frontend) does not terminate TLS or enforce network
segmentation — those are deployment-layer responsibilities and must be
satisfied by whatever infrastructure (load balancer, reverse proxy, cloud
provider, orchestrator) fronts these containers before they are considered
production-ready, including for Amazon SP-API traffic.

## 1. HTTPS / TLS

- **All external traffic to the frontend and backend API must be served over
  HTTPS only.** Plain HTTP must not be reachable from outside the private
  network (redirect or block, don't just tolerate — HTTP requests to a
  public listener should either 301-redirect to HTTPS or be refused).
- TLS termination happens at a reverse proxy / load balancer /
  CDN in front of the `backend` and `frontend` containers (see
  `docker-compose.yml` — neither service terminates TLS itself).
- Minimum TLS 1.2; TLS 1.3 preferred. Disable TLS 1.0/1.1 and weak cipher
  suites at the terminating proxy.
- Certificates must be from a trusted CA (e.g. ACM, Let's Encrypt) and
  auto-renewed; no self-signed certs in production.
- `app.use(helmet())` (already enabled in `backend/src/main.ts`) sends
  `Strict-Transport-Security` and other hardening headers on every
  response — this is necessary but not sufficient; it depends on TLS
  actually being terminated correctly upstream.
- Outbound calls this backend makes to Amazon SP-API
  (`sellingpartnerapi-*.amazon.com`) and the LWA token endpoint
  (`api.amazon.com`) are HTTPS by construction (see
  `marketplace-adapter/adapters/amazon/constants/amazon.constants.ts`) — do
  not change these to `http://`.

## 2. Network Security

- **Database (PostgreSQL) and Redis must never be exposed to the public
  internet.** The `docker-compose.yml` in this repo publishes their ports
  to the host for **local development only** — in production, both must
  sit on a private subnet/security group reachable only from the backend
  service (and, for Postgres, from migration/ops tooling over a VPN or
  bastion).
- The backend API and frontend should be the only services with a public
  listener; put both behind the TLS-terminating proxy from §1, not directly
  on the internet.
- Restrict inbound access to admin/ops surfaces (Swagger docs at
  `SWAGGER_PATH`, if enabled) to trusted networks, or disable
  `SWAGGER_ENABLED` in production entirely.
- Firewall/security-group rules should default-deny and allow only the
  specific ports needed: 443 (public HTTPS ingress), and internal-only
  access on the Postgres/Redis/backend ports between services.
- Redis must run with `requirepass` set (already the case in
  `docker-compose.yml` via `REDIS_PASSWORD`) even on a private network.

## 3. Secrets

- All secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `ATLAS_CREDENTIAL_KEY`,
  `DATABASE_URL`, `REDIS_PASSWORD`) must come from the deployment
  environment/secrets manager, never committed to source. See
  `backend/.env.example` for the required variables — the application now
  fails to start if any required secret is missing (see
  `backend/src/config/environment.validation.ts`).
- Rotate `ATLAS_CREDENTIAL_KEY` only via a planned re-encryption migration
  of stored marketplace provider credentials — rotating it in place without
  re-encrypting existing rows will make them undecryptable.

## 4. Related

See [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md) for what happens if any
of the above is found to have failed in production.
