import { and, like, ne, or } from "drizzle-orm";
import { getDb } from "../../../db";
import { profiles } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) || "";
  if (q.length < 2) return Response.json({ users: [] });
  const db = await getDb();
  const rows = await db.select().from(profiles).where(and(ne(profiles.email, user.email), or(like(profiles.email, `%${q}%`), like(profiles.displayName, `%${q}%`)))).limit(12);
  return Response.json({ users: rows.map((p) => ({ account: p.email, displayName: p.displayName, avatar: p.avatar, avatarUrl: p.avatarKey ? `/api/media?key=${encodeURIComponent(p.avatarKey)}` : null })) });
}
