import { NextResponse } from "next/server";

export async function GET() {
  // Use the Vercel Git Commit SHA as the version ID
  // In dev, this might be undefined, so we use 'development'
  return NextResponse.json({
    version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "development",
  });
}
