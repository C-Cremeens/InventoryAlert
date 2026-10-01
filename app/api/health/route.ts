import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppEnv } from "@/lib/app-env";

export const dynamic = "force-dynamic";

// The environment marker the migration job checks (docs/database-migrations.md).
// Readable only when the runtime role was granted SELECT on it; null otherwise.
async function readDbEnv(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ app_env: string }[]>`
      SELECT app_env FROM invalert_ops.environment_marker WHERE singleton`;
    return rows[0]?.app_env ?? null;
  } catch {
    return null;
  }
}

// Deployment smoke tests (#92) compare appEnv, dbEnv and revision with the release.
export async function GET() {
  const identity = {
    appEnv: getAppEnv() ?? null,
    revision:
      process.env.APP_REVISION || process.env.VERCEL_GIT_COMMIT_SHA || null,
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      ...identity,
      dbEnv: await readDbEnv(),
    });
  } catch (err) {
    console.error("Health check failed:", err);
    return NextResponse.json(
      { ok: false, ...identity, dbEnv: null },
      { status: 503 },
    );
  }
}
