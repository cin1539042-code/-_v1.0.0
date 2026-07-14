import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { follows, profiles, userActivity, works } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureActivitySchema } from "../../../lib/activity-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedName = url.searchParams.get("name")?.trim();
  const user = await getChatGPTUser();
  await ensureActivitySchema();
  const db = await getDb();
  if (!requestedName && !user) return Response.json({ error: "请先登录" }, { status: 401 });
  const name = requestedName || user!.displayName;
  const [profile] = requestedName
    ? await db.select().from(profiles).where(eq(profiles.displayName, name)).limit(1)
    : await db.select().from(profiles).where(eq(profiles.email, user!.email)).limit(1);
  const resolvedName = profile?.displayName || name;
  const rows = await db.select().from(works).where(eq(works.authorName, resolvedName)).limit(100);
  const followerRows=profile?await db.select().from(follows).where(eq(follows.followingEmail,profile.email)):[];
  const [myFollow]=profile&&user?await db.select().from(follows).where(and(eq(follows.followerEmail,user.email),eq(follows.followingEmail,profile.email))).limit(1):[];
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai"}).format(new Date());
  const [activity]=profile?await db.select().from(userActivity).where(and(eq(userActivity.userEmail,profile.email),eq(userActivity.activityDay,today))).limit(1):[];
  const isOnline=!!activity&&Date.now()-new Date(activity.lastSeenAt).getTime()<90_000;
  return Response.json({ profile: profile ? { displayName: profile.displayName, bio: profile.bio, avatar: profile.avatar, avatarUrl:profile.avatarKey?`/api/media?key=${encodeURIComponent(profile.avatarKey)}`:null,followerCount:followerRows.length,isFollowing:!!myFollow,isSelf:user?.email===profile.email,isOnline,todayFishCount:activity?.fishCount||0,todayFishSeconds:activity?.fishSeconds||0 } : { displayName: resolvedName, bio: "这个人正在认真摸鱼和创造。", avatar: "🐟",avatarUrl:null,followerCount:0,isFollowing:false,isSelf:false,isOnline:false,todayFishCount:0,todayFishSeconds:0 }, works: rows.filter(w => w.status === "published").map(w => ({ id:w.id,title:w.title,description:w.description,type:w.type,authorName:w.authorName,status:w.status,externalUrl:w.externalUrl,coverUrl:w.coverKey?`/api/media?key=${encodeURIComponent(w.coverKey)}`:null })) });
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
