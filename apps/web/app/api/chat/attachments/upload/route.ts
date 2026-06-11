import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireProfile } from "@/lib/auth/context";
import { getPresignedPutUrl } from "@coursebridge/storage";

export const runtime = "nodejs";

const schema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  sizeBytes: z.number().int().nonnegative().max(25 * 1024 * 1024),
});

const ALLOWED = [
  /^image\//, /^application\/pdf$/,
  /^application\/(msword|vnd\.openxmlformats-officedocument)/,
  /^application\/zip$/,
];

export async function POST(req: Request) {
  const ctx = await requireProfile();
  const body = schema.parse(await req.json());
  if (!ALLOWED.some((re) => re.test(body.mimeType))) {
    return NextResponse.json({ error: "mime not allowed" }, { status: 400 });
  }
  const storageKey = `chat/${ctx.userId}/${randomUUID()}-${encodeURIComponent(body.filename)}`;
  const url = await getPresignedPutUrl(storageKey, body.mimeType, 60);
  return NextResponse.json({ storageKey, uploadUrl: url });
}
