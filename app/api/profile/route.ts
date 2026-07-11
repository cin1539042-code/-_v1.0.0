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
  return Response.json({ profile: profile ? { displayName: profile.displayName, bio: profile.bio, avatar: profile.avatar, avatarUrl:profile.avatarKey?`/api/media?key=${encodeURIComponent(profile.avatarKey)}`:null } : { displayName: name, bio: "这个人正在认真摸鱼和创造。", avatar: "🐟",avatarUrl:null }, works: rows.filter(w => w.status === "published").map(w => ({ id:w.id,title:w.title,description:w.description,type:w.type,authorName:w.authorName,status:w.status,externalUrl:w.externalUrl,coverUrl:w.coverKey?`/api/media?key=${encodeURIComponent(w.coverKey)}`:null })) });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const form = await request.formData();
  const payload = {displayName:String(form.get("displayName")||""),bio:String(form.get("bio")||""),avatar:String(form.get("avatar")||"")};
  const displayName = payload.displayName?.trim().slice(0, 30) || user.displayName;
  const bio = payload.bio?.trim().slice(0, 160) || "这个人正在认真摸鱼和创造。";
  const avatar = payload.avatar?.trim().slice(0, 8) || "🐟";
  const db = await getDb();
  const [existing] = await db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
  let avatarKey=existing?.avatarKey||null; const image=form.get("avatarFile");
  if(image instanceof File&&image.size){if(image.size>3*1024*1024||!image.type.startsWith("image/"))return Response.json({error:"头像须为不超过 3MB 的图片"},{status:400});const {env}=await import("cloudflare:workers");if(avatarKey)await env.BUCKET.delete(avatarKey);avatarKey=`avatars/${crypto.randomUUID()}/${image.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;await env.BUCKET.put(avatarKey,await image.arrayBuffer(),{httpMetadata:{contentType:image.type}})}
  if (existing) await db.update(profiles).set({ displayName, bio, avatar, avatarKey, updatedAt:new Date().toISOString() }).where(eq(profiles.email,user.email));
  else await db.insert(profiles).values({ email:user.email, displayName, bio, avatar, avatarKey });
  if (displayName !== user.displayName) await db.update(works).set({ authorName:displayName }).where(eq(works.authorEmail,user.email));
  return Response.json({ profile:{ displayName,bio,avatar,avatarUrl:avatarKey?`/api/media?key=${encodeURIComponent(avatarKey)}`:null } });
}
