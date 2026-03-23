# Deploy

## GitHub Container Registry

Der Workflow in [.github/workflows/docker-image.yml](/Users/christian/shortbox/shortbox-next/.github/workflows/docker-image.yml) baut das Image bei Pull Requests und pushed es bei Pushes auf `main` sowie bei `v*`-Tags nach GHCR.

Das Ziel-Image lautet:

```text
ghcr.io/<owner>/<repo>:main
```

## VServer

1. Docker und Docker Compose Plugin installieren.
2. Eine `.env` mit mindestens `DATABASE_URL=...` auf den Server legen.
3. In derselben Ordnerstruktur die [compose.yaml](/Users/christian/shortbox/shortbox-next/compose.yaml) ablegen.
4. Optional `SHORTBOX_IMAGE` setzen, falls du nicht `:main` deployen willst.
5. Container starten:

```bash
docker compose pull
docker compose up -d
```

## Beispiel

```bash
cat > .env <<'EOF'
DATABASE_URL=postgresql://shortbox:secret@db.example.net:5432/shortbox?schema=shortbox
WORKER_CONCURRENCY=5
LOGIN_MAX_ATTEMPTS=10
LOGIN_WINDOW_SECONDS=900
LOGIN_LOCK_SECONDS=1800
EOF

export SHORTBOX_IMAGE=ghcr.io/OWNER/REPO:main
export APP_PORT=3000

docker compose pull
docker compose up -d
docker compose logs -f
```

## Updates

```bash
docker compose pull
docker compose up -d
docker image prune -f
```
