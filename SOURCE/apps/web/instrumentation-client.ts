import * as Sentry from "@sentry/nextjs"
import posthog from "posthog-js"

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

const token =
  process.env.NEXT_PUBLIC_POSTHOG_TOKEN ??
  process.env.NEXT_PUBLIC_POSTHOG_KEY ??
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN

if (token) {
  posthog.init(token, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    defaults: "2026-01-30",
  })
}
