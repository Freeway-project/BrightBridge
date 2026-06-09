# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
WORKDIR /app
ENV NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_LOGLEVEL=error

FROM base AS deps
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/storage/package.json packages/storage/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/workflow/package.json packages/workflow/package.json
RUN npm ci

FROM deps AS build
# Non-secret build args: safe as ARG/ENV (used by Next at build time).
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG SENTRY_ORG=
ARG SENTRY_PROJECT=
ARG NEXT_PUBLIC_RAPIDAPI_KEY=

ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV NEXT_PUBLIC_RAPIDAPI_KEY=$NEXT_PUBLIC_RAPIDAPI_KEY

COPY apps apps
COPY packages packages
# Secrets are mounted only for this RUN (not baked into any image layer or
# ARG/ENV). If a secret isn't provided (e.g. in plain CI image-verify builds),
# fall back to a placeholder so `next build` still completes.
RUN --mount=type=secret,id=next_server_actions_encryption_key \
    --mount=type=secret,id=groq_api_key \
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(cat /run/secrets/next_server_actions_encryption_key 2>/dev/null || echo build-placeholder-32-byte-base64)" \
    GROQ_API_KEY="$(cat /run/secrets/groq_api_key 2>/dev/null || echo '')" \
    npm run build --workspace=@coursebridge/web

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web ./apps/web
COPY --from=build /app/packages ./packages
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY scripts ./scripts
COPY db ./db

RUN chmod +x /docker-entrypoint.sh \
    && npm prune --omit=dev

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "start", "--workspace=@coursebridge/web", "--", "-p", "3000", "-H", "0.0.0.0"]
