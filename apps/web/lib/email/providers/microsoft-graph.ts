import "server-only";

import {
  EmailSendError,
  type EmailProvider,
  type SendEmailInput,
  type SendEmailResult,
} from "@/lib/email/types";

type GraphConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  sender: string;
};

type TokenCacheEntry = {
  token: string;
  expiresAt: number;
};

const TOKEN_ENDPOINT = (tenantId: string) =>
  `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
const SEND_MAIL_ENDPOINT = (sender: string) =>
  `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`;
const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const TOKEN_SAFETY_WINDOW_MS = 60_000;

let tokenCache: TokenCacheEntry | null = null;

function readConfig(): GraphConfig | null {
  const tenantId = process.env.MS_GRAPH_TENANT_ID?.trim();
  const clientId = process.env.MS_GRAPH_CLIENT_ID?.trim();
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET?.trim();
  const sender = (process.env.MS_GRAPH_SENDER ?? process.env.EMAIL_FROM)?.trim();

  if (!tenantId || !clientId || !clientSecret || !sender) return null;
  return { tenantId, clientId, clientSecret, sender };
}

async function acquireAccessToken(config: GraphConfig): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + TOKEN_SAFETY_WINDOW_MS) {
    return tokenCache.token;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
    scope: GRAPH_SCOPE,
  });

  const response = await fetch(TOKEN_ENDPOINT(config.tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await safeReadError(response);
    throw new EmailSendError(
      `Microsoft Graph token request failed (${response.status}): ${detail}`,
      "microsoft-graph",
    );
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new EmailSendError(
      "Microsoft Graph token response missing access_token",
      "microsoft-graph",
    );
  }

  const ttlMs = (payload.expires_in ?? 3600) * 1000;
  tokenCache = { token: payload.access_token, expiresAt: Date.now() + ttlMs };
  return payload.access_token;
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return response.statusText;
  }
}

function buildSendMailPayload(input: SendEmailInput, config: GraphConfig) {
  const message = {
    subject: input.subject,
    body: {
      contentType: "HTML" as const,
      content: input.html,
    },
    toRecipients: [{ emailAddress: { address: input.to } }],
    ...(input.replyTo
      ? { replyTo: [{ emailAddress: { address: input.replyTo } }] }
      : {}),
    ...(input.from && input.from !== config.sender
      ? { from: { emailAddress: { address: input.from } } }
      : {}),
  };

  return {
    message,
    saveToSentItems: true,
  };
}

export const microsoftGraphProvider: EmailProvider & {
  isConfigured: () => boolean;
  resetTokenCache: () => void;
} = {
  name: "microsoft-graph",

  isConfigured() {
    return readConfig() !== null;
  },

  resetTokenCache() {
    tokenCache = null;
  },

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const config = readConfig();
    if (!config) {
      throw new EmailSendError(
        "Microsoft Graph is not configured (MS_GRAPH_TENANT_ID / CLIENT_ID / CLIENT_SECRET / SENDER).",
        "microsoft-graph",
      );
    }

    const token = await acquireAccessToken(config);
    const response = await fetch(SEND_MAIL_ENDPOINT(config.sender), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildSendMailPayload(input, config)),
      cache: "no-store",
    });

    // Graph sendMail returns 202 Accepted with empty body on success.
    if (response.status === 202) {
      return { provider: "microsoft-graph", delivered: true };
    }

    // Token expired between cache check and call — retry once.
    if (response.status === 401) {
      tokenCache = null;
      const retryToken = await acquireAccessToken(config);
      const retry = await fetch(SEND_MAIL_ENDPOINT(config.sender), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${retryToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildSendMailPayload(input, config)),
        cache: "no-store",
      });
      if (retry.status === 202) {
        return { provider: "microsoft-graph", delivered: true };
      }
      const retryDetail = await safeReadError(retry);
      throw new EmailSendError(
        `Microsoft Graph sendMail failed after token refresh (${retry.status}): ${retryDetail}`,
        "microsoft-graph",
      );
    }

    const detail = await safeReadError(response);
    throw new EmailSendError(
      `Microsoft Graph sendMail failed (${response.status}): ${detail}`,
      "microsoft-graph",
    );
  },
};
