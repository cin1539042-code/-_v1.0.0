import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { profiles, works } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedName = url.searchParams.get("name")?.trim();
  const user = await getChatGPTUser();
  const db = await getDb();
  if (!requestedName && !user) return Response.json({ error: "请先登录" }, { status: 401 });
  const name = requestedName || user!.displayName;
  const [profile] = await db.select().from(profiles).where(eq(profiles.displayName, name)).limit(1);
  const rows = await db.select().from(works).where(eq(works.authorName, name)).limit(100);
  return Response.json({ profile: profile ? { displayName: profile.displayName, bio: profile.bio, avatar: profile.avatar } : { displayName: name, bio: "这个人正在认真摸鱼和创造。", avatar: "🐟" }, works: rows.filter(w => w.status === "published").map(w => ({ id:w.id,title:w.title,description:w.description,type:w.type,authorName:w.authorName,status:w.status })) });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const payload = await request.json() as { displayName?: string; bio?: string; avatar?: string };
  const displayName = payload.displayName?.trim().slice(0, 30) || user.displayName;
  const bio = payload.bio?.trim().slice(0, 160) || "这个人正在认真摸鱼和创造。";
  const avatar = payload.avatar?.trim().slice(0, 8) || "🐟";
  const db = await getDb();
  const [existing] = await db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
  if (existing) await db.update(profiles).set({ displayName, bio, avatar, updatedAt:new Date().toISOString() }).where(eq(profiles.email,user.email));
  else await db.insert(profiles).values({ email:user.email, displayName, bio, avatar });
  if (displayName !== user.displayName) await db.update(works).set({ authorName:displayName }).where(eq(works.authorEmail,user.email));
  return Response.json({ profile:{ displayName,bio,avatar } });
}
