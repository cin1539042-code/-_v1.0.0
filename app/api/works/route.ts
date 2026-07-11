import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { works } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "1";
  const user = mine ? await getChatGPTUser() : null;
  if (mine && !user) return Response.json({ error: "请先登录" }, { status: 401 });
  try {
    const db = await getDb();
    const rows = mine && user
      ? await db.select().from(works).where(eq(works.authorEmail, user.email)).orderBy(desc(works.createdAt)).limit(100)
      : await db.select().from(works).where(eq(works.status, "published")).orderBy(desc(works.createdAt)).limit(100);
    return Response.json({ works: rows.map(row => ({ id: row.id, title: row.title, description: row.description, type: row.type, authorName: row.authorName, status: row.status, createdAt: row.createdAt })) });
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
    const type = String(form.get("type") || "网页工具");
    const content = String(form.get("content") || "").slice(0, 1024 * 1024);
    const status = form.get("status") === "draft" ? "draft" : "published";
    const file = form.get("file");
    if (!title) return Response.json({ error: "请填写作品名称" }, { status: 400 });
    if (!["阅读器", "小游戏", "音乐播放器", "资讯窗口", "网页工具"].includes(type)) return Response.json({ error: "作品类型无效" }, { status: 400 });

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

    const db = await getDb();
    const [work] = await db.insert(works).values({ title, description, type, content, fileKey, fileName, status, authorEmail: user.email, authorName: user.displayName }).returning();
    return Response.json({ work: { ...work, authorEmail: undefined } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 });
  }
}
