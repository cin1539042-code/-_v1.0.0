import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { works } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await getDb();
  const [work] = await db.select().from(works).where(eq(works.id, Number(id))).limit(1);
  if (!work || work.status !== "published") return Response.json({ error: "作品不存在" }, { status: 404 });
  let fileText = "";
  if (work.fileKey) {
    const { env } = await import("cloudflare:workers");
    const object = await env.BUCKET.get(work.fileKey);
    if (object) fileText = await object.text();
  }
  return Response.json({ work: { id: work.id, title: work.title, description: work.description, type: work.type, authorName: work.authorName, content: work.content, fileName: work.fileName, createdAt: work.createdAt, fileText } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const { id } = await context.params;
  const payload = await request.json() as { status?: string };
  if (!['draft','published'].includes(payload.status || "")) return Response.json({ error: "状态无效" }, { status: 400 });
  const db = await getDb();
  const [work] = await db.update(works).set({ status: payload.status, updatedAt: new Date().toISOString() }).where(and(eq(works.id, Number(id)), eq(works.authorEmail, user.email))).returning();
  if (!work) return Response.json({ error: "作品不存在或无权修改" }, { status: 404 });
  return Response.json({ work });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const { id } = await context.params;
  const db = await getDb();
  const [work] = await db.select().from(works).where(and(eq(works.id, Number(id)), eq(works.authorEmail, user.email))).limit(1);
  if (!work) return Response.json({ error: "作品不存在或无权删除" }, { status: 404 });
  if (work.fileKey) { const { env } = await import("cloudflare:workers"); await env.BUCKET.delete(work.fileKey); }
  await db.delete(works).where(eq(works.id, work.id));
  return Response.json({ ok: true });
}
