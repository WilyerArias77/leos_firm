import { NextResponse } from "next/server";

/**
 * GET /api/v1/health — public, unauthenticated.
 * Documented in `docs/API_DOCS.md`.
 *
 * Deliberately reports nothing about the environment or connected services:
 * a health endpoint must not become a reconnaissance tool.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
}
