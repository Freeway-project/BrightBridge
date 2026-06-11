// Pre-signed URL helpers for object storage (Cloudflare R2 in production).
//
// Phase-1 stub: the chat hub references these from attachment routes so the
// types are stable, but the runtime is wired up by a later infra task that
// plugs in the R2 SDK. Until then, calling either function throws clearly so
// no caller silently swallows the missing implementation.

export async function getPresignedPutUrl(
  storageKey: string,
  mimeType: string,
  expiresSeconds: number,
): Promise<string> {
  throw new Error(
    `getPresignedPutUrl(${storageKey}, ${mimeType}, ${expiresSeconds}) — ` +
      `@coursebridge/storage is not yet wired to R2. Configure the storage ` +
      `provider before enabling chat attachments.`,
  );
}

export async function getPresignedGetUrl(
  storageKey: string,
  expiresSeconds: number,
): Promise<string> {
  throw new Error(
    `getPresignedGetUrl(${storageKey}, ${expiresSeconds}) — ` +
      `@coursebridge/storage is not yet wired to R2. Configure the storage ` +
      `provider before enabling chat attachments.`,
  );
}
