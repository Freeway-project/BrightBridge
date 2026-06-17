import { type NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth/context";
import { getPostgresPool } from "@/lib/postgres/pool";

export async function GET(req: NextRequest) {
  const ctx = await requireProfile();
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const { rows } = await getPostgresPool().query<{
    id: string;
    full_name: string | null;
    email: string;
  }>(
    `select id, full_name, email
     from public.profiles
     where id != $1
       and ($2 = '' or full_name ilike $3 or email ilike $3)
     order by full_name, email
     limit 30`,
    [ctx.userId, q, `%${q}%`],
  );
  return Response.json(
    rows.map((r) => ({ id: r.id, name: r.full_name?.trim() || r.email, email: r.email })),
  );
}
