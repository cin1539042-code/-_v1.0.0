import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { favorites, works } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await getDb();
  const [work] = await db.select().from(works).where(eq(works.id, Number(id))).limit(1);
  if (!work) return Response.json({ error: "作品不存在" }, { status: 404 });
  if (work.status !== "published") {
    const user = await getChatGPTUser();
    if (!user || user.email !== work.authorEmail) return Response.json({ error: "作品不存在" }, { status: 404 });
  }
  let appHtml = "";
  if (work.fileKey) {
    const { env } = await import("cloudflare:workers");
    const object = await env.BUCKET.get(work.fileKey);
    if (object) appHtml = await object.text();
  }
  return Response.json({ work: { id: work.id, title: work.title, description: work.description, type: work.type, authorName: work.authorName, content: work.content, fileName: work.fileName, status:work.status, externalUrl:work.externalUrl, windowSize:work.windowSize,coverUrl:work.coverKey?`/api/media?key=${encodeURIComponent(work.coverKey)}`:null, createdAt: work.createdAt, appHtml: appHtml || work.content } });
}

export async function PUT(request:Request, context:{params:Promise<{id:string}>}) {
  const user=await getChatGPTUser(); if(!user)return Response.json({error:"请先登录"},{status:401});
  const {id}=await context.params; const form=await request.formData(); const db=await getDb();
  const [old]=await db.select().from(works).where(and(eq(works.id,Number(id)),eq(works.authorEmail,user.email))).limit(1);
  if(!old)return Response.json({error:"作品不存在或无权修改"},{status:404});
  const title=String(form.get("title")||"").trim().slice(0,80), type=String(form.get("type")||"").trim();
  if(!title)return Response.json({error:"请填写作品名称"},{status:400});
  if(!["工具","娱乐","聊天","影音","其他"].includes(type))return Response.json({error:"请选择作品分类"},{status:400});
  let externalUrl=String(form.get("externalUrl")||"").trim()||null;
  if(externalUrl){try{const u=new URL(externalUrl);if(!['http:','https:'].includes(u.protocol))throw 0;externalUrl=u.toString()}catch{return Response.json({error:"网页链接无效"},{status:400})}}
  let fileKey=old.fileKey,fileName=old.fileName,coverKey=old.coverKey; const file=form.get("file"),cover=form.get("cover"); const {env}=await import("cloudflare:workers");
  if(file instanceof File&&file.size){if(file.size>5*1024*1024||!file.name.toLowerCase().endsWith('.html'))return Response.json({error:"HTML 文件不符合要求"},{status:400});if(fileKey)await env.BUCKET.delete(fileKey);fileKey=`works/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;fileName=file.name;await env.BUCKET.put(fileKey,await file.arrayBuffer(),{httpMetadata:{contentType:file.type||'text/html'}})}
  if(cover instanceof File&&cover.size){if(cover.size>3*1024*1024||!cover.type.startsWith('image/'))return Response.json({error:"封面须为不超过 3MB 的图片"},{status:400});if(coverKey)await env.BUCKET.delete(coverKey);coverKey=`covers/${crypto.randomUUID()}/${cover.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;await env.BUCKET.put(coverKey,await cover.arrayBuffer(),{httpMetadata:{contentType:cover.type}})}
  const content=String(form.get("content")||"").slice(0,1024*1024);if(!fileKey&&!content.trim()&&!externalUrl)return Response.json({error:"作品必须包含可运行内容或网页链接"},{status:400});
  const windowSize=["desktop","tablet","mobile","mini"].includes(String(form.get("windowSize")))?String(form.get("windowSize")):old.windowSize;
  const [work]=await db.update(works).set({title,type,description:String(form.get("description")||"").trim().slice(0,240),content,fileKey,fileName,coverKey,externalUrl,windowSize,status:form.get("status")==="published"?"published":"draft",updatedAt:new Date().toISOString()}).where(eq(works.id,old.id)).returning();
  return Response.json({work});
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
  await db.delete(favorites).where(eq(favorites.workId, work.id));
  await db.delete(works).where(eq(works.id, work.id));
  return Response.json({ ok: true });
}
