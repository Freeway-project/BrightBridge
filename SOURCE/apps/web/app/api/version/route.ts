import { NextResponse } from "next/server";
import { getDeploymentVersion } from "@/lib/deployment-version";

export async function GET() {
  return NextResponse.json({
    version: getDeploymentVersion(),
  });
}
