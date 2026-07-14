import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { favorites, works } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { validateStaticZip } from "../../../../lib/static-package";
import { deletePrefix, putStaticFiles } from "../../../../lib/static-storage";
import { MAX_ZIP_BYTES, rejectOversizedRequest } from "../../../../lib/upload-limits";

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
  const appUrl=work.fileKey?.startsWith(`apps/${work.id}/`)?`/${work.fileKey}`:null;
  if (work.fileKey&&!appUrl) {
    const { env } = await import("cloudflare:workers");
    const object = await env.BUCKET.get(work.fileKey);
    if (object) appHtml = await object.text();
  }
  return Response.json({ work: { id: work.id, title: work.title, description: work.description, type: work.type, authorName: work.authorName, content: work.content, fileName: work.fileName, status:work.status, externalUrl:work.externalUrl, windowSize:work.windowSize,windowWidth:work.windowWidth,windowHeight:work.windowHeight,permissions:work.permissions,coverUrl:work.coverKey?`/api/media?key=${encodeURIComponent(work.coverKey)}`:null, createdAt: work.createdAt, appUrl, appHtml: appHtml || work.content } });
}

export async function PUT(request:Request, context:{params:Promise<{id:string}>}) {
  const user=await getChatGPTUser(); if(!user)return Response.json({error:"请先登录"},{status:401});
  const oversized=rejectOversizedRequest(request);if(oversized)return oversized;
  const {id}=await context.params; const form=await request.formData(); const db=await getDb();
  const [old]=await db.select().from(works).where(and(eq(works.id,Number(id)),eq(works.authorEmail,user.email))).limit(1);
  if(!old)return Response.json({error:"作品不存在或无权修改"},{status:404});
  const title=String(form.get("title")||"").trim().slice(0,80), type=String(form.get("type")||"").trim();
  if(!title)return Response.json({error:"请填写作品名称"},{status:400});
  if(!["工具","娱乐","聊天","影音","其他"].includes(type))return Response.json({error:"请选择作品分类"},{status:400});
  let externalUrl=String(form.get("externalUrl")||"").trim()||null;
  if(externalUrl){try{const u=new URL(externalUrl);if(!['http:','https:'].includes(u.protocol))throw 0;externalUrl=u.toString()}catch{return Response.json({error:"网页链接无效"},{status:400})}}
  let fileKey=old.fileKey,fileName=old.fileName,coverKey=old.coverKey; const file=form.get("file"),cover=form.get("cover"); const {env}=await import("cloudflare:workers");
  if(file instanceof File&&file.name.toLowerCase().endsWith(".zip")&&file.size>MAX_ZIP_BYTES)return Response.json({error:"ZIP 文件不能超过 20MB"},{status:413});
  if(file instanceof File&&file.size){const isZip=file.name.toLowerCase().endsWith('.zip');if(!isZip&&(file.size>5*1024*1024||!file.name.toLowerCase().endsWith('.html')))return Response.json({error:"请选择不超过 5MB 的 HTML 或不超过 20MB 的 ZIP 应用包"},{status:400});const raw=new Uint8Array(await file.arrayBuffer());const oldPrefix=fileKey?.startsWith(`apps/${old.id}/`)?fileKey.slice(0,fileKey.lastIndexOf("index.html")):null;if(isZip){const result=validateStaticZip(file.name,raw);const version=crypto.randomUUID();const prefix=`apps/${old.id}/${version}/`;await putStaticFiles(env.BUCKET,prefix,result.files);fileKey=prefix+"index.html";if(oldPrefix)await deletePrefix(env.BUCKET,oldPrefix);else if(old.fileKey)await env.BUCKET.delete(old.fileKey)}else{if(oldPrefix)await deletePrefix(env.BUCKET,oldPrefix);else if(fileKey)await env.BUCKET.delete(fileKey);fileKey=`works/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;await env.BUCKET.put(fileKey,raw,{httpMetadata:{contentType:'text/html; charset=utf-8'}})}fileName=file.name}
  if(cover instanceof File&&cover.size){if(cover.size>3*1024*1024||!cover.type.startsWith('image/'))return Response.json({error:"封面须为不超过 3MB 的图片"},{status:400});if(coverKey)await env.BUCKET.delete(coverKey);coverKey=`covers/${crypto.randomUUID()}/${cover.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;await env.BUCKET.put(coverKey,await cover.arrayBuffer(),{httpMetadata:{contentType:cover.type}})}
  const content=String(form.get("content")||"").slice(0,1024*1024);if(!fileKey&&!content.trim()&&!externalUrl)return Response.json({error:"作品必须包含可运行内容或网页链接"},{status:400});
  const windowSize=["desktop","tablet","mobile","mini","custom"].includes(String(form.get("windowSize")))?String(form.get("windowSize")):old.windowSize;
  const windowWidth=Math.min(1600,Math.max(320,Number(form.get("windowWidth"))||old.windowWidth||1200));const windowHeight=Math.min(1000,Math.max(300,Number(form.get("windowHeight"))||old.windowHeight||800));
  const requestedPermissions=String(form.get("permissions")||"storage").split(",");const permissions=JSON.stringify(["storage","user.basic"].filter(p=>requestedPermissions.includes(p)));
  const [work]=await db.update(works).set({title,type,description:String(form.get("description")||"").trim().slice(0,240),content,fileKey,fileName,coverKey,externalUrl,windowSize,windowWidth,windowHeight,permissions,status:form.get("status")==="published"?"published":"draft",updatedAt:new Date().toISOString()}).where(eq(works.id,old.id)).returning();
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
  if (work.fileKey) { const { env } = await import("cloudflare:workers"); if(work.fileKey.startsWith(`apps/${work.id}/`))await deletePrefix(env.BUCKET,work.fileKey.slice(0,work.fileKey.lastIndexOf("index.html")));else await env.BUCKET.delete(work.fileKey); }
  await db.delete(favorites).where(eq(favorites.workId, work.id));
  await db.delete(works).where(eq(works.id, work.id));
  return Response.json({ ok: true });
}
