import { NextResponse } from "next/server";
import { getDeploymentVersion } from "@/lib/deployment-version";

// Version check must never be served from any cache layer — always fresh.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    version: getDeploymentVersion(),
  });
}
