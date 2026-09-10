# gym-ui — static PWA served by unprivileged nginx.
FROM nginxinc/nginx-unprivileged:1.27-alpine

# nginx-unprivileged runs as UID 101 and listens on 8080 by default.
COPY --chown=101:101 docker/default.conf /etc/nginx/conf.d/default.conf
COPY docker/40-render-config.sh /docker-entrypoint.d/40-render-config.sh
USER root
RUN chmod +x /docker-entrypoint.d/40-render-config.sh
USER 101

COPY --chown=101:101 index.html styles.css app.js ui.js sync.js service-worker.js manifest.json config.js /usr/share/nginx/html/
COPY --chown=101:101 icons/ /usr/share/nginx/html/icons/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD ["wget", "-qO-", "http://127.0.0.1:8080/healthz"]
