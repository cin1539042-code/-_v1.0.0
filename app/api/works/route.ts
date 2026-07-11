import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { favorites, profiles, works } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "1";
  const favorite = url.searchParams.get("favorite") === "1";
  const user = await getChatGPTUser();
  if ((mine||favorite) && !user) return Response.json({ error: "请先登录" }, { status: 401 });
  try {
    const db = await getDb();
    const favoriteIds=favorite&&user?(await db.select().from(favorites).where(eq(favorites.userEmail,user.email))).map(f=>f.workId):[];
    const rows = favorite
      ? favoriteIds.length?await db.select().from(works).where(inArray(works.id,favoriteIds)).orderBy(desc(works.updatedAt)).limit(100):[]
      : mine && user
      ? await db.select().from(works).where(eq(works.authorEmail, user.email)).orderBy(desc(works.createdAt)).limit(100)
      : await db.select().from(works).where(eq(works.status, "published")).orderBy(desc(works.createdAt)).limit(100);
    const emails=[...new Set(rows.map(r=>r.authorEmail))];
    const profileRows=emails.length?await db.select().from(profiles).where(inArray(profiles.email,emails)):[];
    const profileMap=new Map(profileRows.map(p=>[p.email,p]));
    const ids=rows.map(r=>r.id);const favoriteRows=ids.length?await db.select().from(favorites).where(inArray(favorites.workId,ids)):[];
    const favoriteCounts=new Map<number,number>();favoriteRows.forEach(f=>favoriteCounts.set(f.workId,(favoriteCounts.get(f.workId)||0)+1));
    const mineSet=new Set(favoriteRows.filter(f=>f.userEmail===user?.email).map(f=>f.workId));
    return Response.json({ works: rows.map(row => {const p=profileMap.get(row.authorEmail);return ({ id: row.id, title: row.title, description: row.description, type: row.type, authorName: p?.displayName||row.authorName, authorAvatar:p?.avatarKey?`/api/media?key=${encodeURIComponent(p.avatarKey)}`:null,authorEmoji:p?.avatar||"🐟", status: row.status, externalUrl: row.externalUrl, coverUrl: row.coverKey ? `/api/media?key=${encodeURIComponent(row.coverKey)}` : null, windowSize:row.windowSize,windowWidth:row.windowWidth,windowHeight:row.windowHeight,playCount:row.playCount,favoriteCount:favoriteCounts.get(row.id)||0,isFavorited:mineSet.has(row.id),createdAt: row.createdAt,updatedAt:row.updatedAt })}) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "加载失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先使用 ChatGPT 登录" }, { status: 401 });
  try {
    const form = await request.formData();
    const title = String(form.get("title") || "").trim().slice(0, 80);
    const description = String(form.get("description") || "").trim().slice(0, 240);
    const type = String(form.get("type") || "").trim();
    const categories = ["工具","娱乐","聊天","影音","其他"];
    const content = String(form.get("content") || "").slice(0, 1024 * 1024);
    const status = form.get("status") === "draft" ? "draft" : "published";
    const file = form.get("file");
    const cover = form.get("cover");
    const externalUrlRaw = String(form.get("externalUrl") || "").trim();
    const windowSize=["desktop","tablet","mobile","mini","custom"].includes(String(form.get("windowSize")))?String(form.get("windowSize")):"desktop";
    const windowWidth=Math.min(1600,Math.max(320,Number(form.get("windowWidth"))||1200));
    const windowHeight=Math.min(1000,Math.max(300,Number(form.get("windowHeight"))||800));
    let externalUrl: string | null = null;
    if (!title) return Response.json({ error: "请填写作品名称" }, { status: 400 });
    if (!categories.includes(type)) return Response.json({ error: "请选择作品分类" }, { status: 400 });
    if (externalUrlRaw) { try { const u = new URL(externalUrlRaw); if (!['http:','https:'].includes(u.protocol)) throw new Error(); externalUrl = u.toString(); } catch { return Response.json({ error:"请输入有效的 http/https 网页链接" }, { status:400 }); } }
    if (!(file instanceof File && file.size > 0) && !content.trim() && !externalUrl) return Response.json({ error:"请编写代码、上传 HTML 或填写网页链接" }, { status:400 });

    let fileKey: string | null = null;
    let fileName: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) return Response.json({ error: "文件不能超过 5MB" }, { status: 400 });
      if (!file.name.toLowerCase().endsWith(".html")) return Response.json({ error: "小应用包必须是可独立运行的 HTML 文件" }, { status: 400 });
      fileKey = `works/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      fileName = file.name;
      const { env } = await import("cloudflare:workers");
      await env.BUCKET.put(fileKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || "text/plain; charset=utf-8" } });
    }

    let coverKey: string | null = null;
    if (cover instanceof File && cover.size > 0) {
      if (cover.size > 3 * 1024 * 1024 || !cover.type.startsWith("image/")) return Response.json({ error:"封面须为不超过 3MB 的图片" }, { status:400 });
      coverKey = `covers/${crypto.randomUUID()}/${cover.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
      const { env } = await import("cloudflare:workers");
      await env.BUCKET.put(coverKey, await cover.arrayBuffer(), { httpMetadata:{ contentType:cover.type } });
    }

    const db = await getDb();
    const [savedProfile] = await db.select().from(profiles).where(eq(profiles.email,user.email)).limit(1);
    const [work] = await db.insert(works).values({ title, description, type, content, fileKey, fileName, coverKey, externalUrl, windowSize,windowWidth,windowHeight,status, authorEmail: user.email, authorName: savedProfile?.displayName || user.displayName }).returning();
    return Response.json({ work: { ...work, authorEmail: undefined } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 });
  }
}
