# Deploying this app as the `gym-ui` container

The site in this repo is also packaged as a container image, **`gym-ui`**, for
Kubernetes. GitHub Pages continues to serve the repo unchanged.

## Image

- Base: `nginxinc/nginx-unprivileged:1.27-alpine` (runs as UID 101, listens on
  `8080`, works with a read-only root filesystem — it writes only to `/tmp`).
- `GET /healthz` → `200 ok` for probes.
- No SPA fallback: the app is a single `index.html`; missing files return 404.

## Runtime configuration

The image is environment-agnostic. `docker/40-render-config.sh` runs at container
start and writes `/tmp/gym-config/config.js` (served at `/config.js`) from:

| Env var | Default | Effect |
|---|---|---|
| `GYM_API_BASE` | `/api/v1` | Base URL `sync.js` calls for progress sync |
| `GOOGLE_CLIENT_ID` | *(empty)* | Empty ⇒ no "Sign in with Google", no sync — the app behaves exactly as the plain static site |

`index.html` loads `config.js` before `app.js`; `sync.js` loads after and is fully
additive (offline-first, `localStorage` stays authoritative, all network calls
fail silently).

## Run locally

```bash
docker build -t gym-ui:dev .
docker run --rm -p 8081:8080 \
  -e GYM_API_BASE=http://localhost:8080/api/v1 \
  -e GOOGLE_CLIENT_ID=<your-web-client-id> \
  gym-ui:dev
# http://localhost:8081
```

For sync to work locally, run `gym-be` too (see its repo's `docker-compose.yml`)
and register `http://localhost:8081` as an authorized JavaScript origin on the
Google OAuth **Web** client.

## Kubernetes

Deployment is done from the **`gym-platform`** Helm chart in the
[`gym-be`](https://github.com/Eslam1141/gym-be) repo, which deploys `gym-ui` and
`gym-be` behind one Ingress (`/` → UI, `/api` → API, same origin).

## GitHub Pages

Unaffected. The committed `config.js` has empty values, so the Pages site shows no
sign-in button and runs as before. CI (`.github/workflows/docker-image.yml`) only
builds/pushes the image; it does not touch the Pages deployment.
