FROM node:22-alpine AS base
WORKDIR /app

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
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# must be supplied as build args. AUTH_PROVIDER selection for the login UI is a
# NEXT_PUBLIC flag; the server-side AUTH_PROVIDER / DB_PROVIDER are runtime envs.
ARG NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=build-placeholder
ARG SUPABASE_SERVICE_ROLE_KEY=build-placeholder
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=build-placeholder-32-byte-base64
ARG NEXT_PUBLIC_AUTH_PROVIDER=
ARG NEXT_PUBLIC_POSTHOG_TOKEN=
ARG NEXT_PUBLIC_POSTHOG_KEY=
ARG NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
ARG NEXT_PUBLIC_POSTHOG_PROJECT_ID=
ARG NEXT_PUBLIC_POSTHOG_DASHBOARD_URL=
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG SENTRY_ORG=
ARG SENTRY_PROJECT=
ARG NEXT_PUBLIC_RAPIDAPI_KEY=

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NEXT_PUBLIC_AUTH_PROVIDER=$NEXT_PUBLIC_AUTH_PROVIDER
ENV NEXT_PUBLIC_POSTHOG_TOKEN=$NEXT_PUBLIC_POSTHOG_TOKEN
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_POSTHOG_PROJECT_ID=$NEXT_PUBLIC_POSTHOG_PROJECT_ID
ENV NEXT_PUBLIC_POSTHOG_DASHBOARD_URL=$NEXT_PUBLIC_POSTHOG_DASHBOARD_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV NEXT_PUBLIC_RAPIDAPI_KEY=$NEXT_PUBLIC_RAPIDAPI_KEY

COPY apps apps
COPY packages packages
RUN npm run build --workspace=@coursebridge/web

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
COPY supabase ./supabase

RUN chmod +x /docker-entrypoint.sh \
    && npm prune --omit=dev

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "start", "--workspace=@coursebridge/web", "--", "-p", "3000", "-H", "0.0.0.0"]
