# gym-ui — static PWA served by unprivileged nginx.
FROM nginxinc/nginx-unprivileged:1.27-alpine

# nginx-unprivileged runs as UID 101 and listens on 8080 by default.
COPY --chown=101:101 docker/default.conf /etc/nginx/conf.d/default.conf
COPY docker/40-render-config.sh /docker-entrypoint.d/40-render-config.sh
USER root
RUN chmod +x /docker-entrypoint.d/40-render-config.sh
USER 101

COPY --chown=101:101 index.html styles.css app.js ui.js coach.js chat.js sync.js calendar.js header.js hero-video.js metallic-button.js service-worker.js manifest.json config.js /usr/share/nginx/html/
COPY --chown=101:101 icons/ /usr/share/nginx/html/icons/
COPY --chown=101:101 widgets/ /usr/share/nginx/html/widgets/

# Bake a content hash of the precached assets (the ASSETS list in
# service-worker.js) into CACHE_NAME at build time — this is what makes SW
# cache busting automatic instead of a hand-maintained "athlex-vNN" bump.
# Identical asset content always hashes the same (no needless invalidation
# on a no-op rebuild); any real content change yields a new CACHE_NAME, and
# service-worker.js's own activate handler deletes whatever old cache key
# doesn't match it. Keep this file list in sync with ASSETS.
# sha256sum/cut/sed are all busybox applets already present in this Alpine
# base image, so no extra tooling is needed.
RUN cd /usr/share/nginx/html && \
    HASH=$(cat index.html styles.css app.js ui.js coach.js chat.js sync.js \
        calendar.js header.js hero-video.js metallic-button.js config.js manifest.json \
        icons/logo.svg icons/coach.svg icons/avatar-default.svg icons/icon-192.png icons/icon-512.png \
        icons/icon-maskable-192.png icons/icon-maskable-512.png \
        icons/apple-touch-icon.png | sha256sum | cut -c1-12) && \
    sed "/^const CACHE_NAME/s/__CACHE_HASH__/${HASH}/" service-worker.js > /tmp/service-worker.js.tmp && \
    cat /tmp/service-worker.js.tmp > service-worker.js && \
    rm /tmp/service-worker.js.tmp

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD ["wget", "-qO-", "http://127.0.0.1:8080/healthz"]
