import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROJECT_ID = "morning-brook-21821002";
const API = "https://console.neon.tech/api/v2";

async function neon(path: string) {
  const key = process.env.NEON_API_KEY;
  if (!key) throw new Error("NEON_API_KEY missing");
  const response = await fetch(`${API}${path}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Neon API ${response.status}: ${JSON.stringify(body)}`);
  }
  return body as any;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.NEON_BOOTSTRAP_TOKEN;
  if (!expected || url.searchParams.get("token") !== expected) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const branches = await neon(`/projects/${PROJECT_ID}/branches?search=production`);
    const branch = branches.branches?.find((b: any) => b.name === "production");
    if (!branch?.id) throw new Error("production branch not found");

    const [databases, roles] = await Promise.all([
      neon(`/projects/${PROJECT_ID}/branches/${branch.id}/databases`),
      neon(`/projects/${PROJECT_ID}/branches/${branch.id}/roles`),
    ]);

    const database =
      databases.databases?.find((d: any) => d.name === "neondb") ??
      databases.databases?.[0];
    const role =
      roles.roles?.find((r: any) => r.name === "neondb_owner") ??
      roles.roles?.[0];

    if (!database?.name || !role?.name) {
      throw new Error("database or role not found");
    }

    const base =
      `/projects/${PROJECT_ID}/connection_uri?branch_id=${encodeURIComponent(branch.id)}` +
      `&database_name=${encodeURIComponent(database.name)}` +
      `&role_name=${encodeURIComponent(role.name)}`;

    const [pooled, direct] = await Promise.all([
      neon(`${base}&pooled=true`),
      neon(`${base}&pooled=false`),
    ]);

    return NextResponse.json(
      {
        branchId: branch.id,
        database: database.name,
        role: role.name,
        pooled: pooled.uri ?? pooled.connection_uri,
        direct: direct.uri ?? direct.connection_uri,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "bootstrap failed" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
