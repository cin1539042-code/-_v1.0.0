import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureMessageSchema } from "../../../lib/message-db";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const user = await getChatGPTUser(); if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureMessageSchema();
  const account = new URL(request.url).searchParams.get("account")?.trim();
  if (account) {
    const target = await env.DB.prepare("SELECT email,display_name AS displayName,avatar,avatar_key AS avatarKey FROM profiles WHERE email=?").bind(account).first<any>();
    if (!target) return Response.json({ error: "用户不存在" }, { status: 404 });
    const rows = await env.DB.prepare("SELECT id,sender_email AS senderEmail,recipient_email AS recipientEmail,content,created_at AS createdAt,read_at AS readAt FROM direct_messages WHERE (sender_email=? AND recipient_email=?) OR (sender_email=? AND recipient_email=?) ORDER BY created_at ASC LIMIT 200").bind(user.email, account, account, user.email).all<any>();
    await env.DB.prepare("UPDATE direct_messages SET read_at=? WHERE sender_email=? AND recipient_email=? AND read_at IS NULL").bind(new Date().toISOString(), account, user.email).run();
    return Response.json({ user: { account: target.email, displayName: target.displayName, avatar: target.avatar, avatarUrl: target.avatarKey ? `/api/media?key=${encodeURIComponent(target.avatarKey)}` : null }, messages: rows.results });
  }
  const rows = await env.DB.prepare(`SELECT p.email AS account,p.display_name AS displayName,p.avatar,p.avatar_key AS avatarKey,m.content,m.created_at AS createdAt,
    SUM(CASE WHEN m.recipient_email=? AND m.read_at IS NULL THEN 1 ELSE 0 END) AS unreadCount
    FROM direct_messages m JOIN profiles p ON p.email=CASE WHEN m.sender_email=? THEN m.recipient_email ELSE m.sender_email END
    WHERE m.sender_email=? OR m.recipient_email=? GROUP BY p.email ORDER BY MAX(m.created_at) DESC LIMIT 30`).bind(user.email,user.email,user.email,user.email).all<any>();
  return Response.json({ conversations: rows.results.map((x:any)=>({...x,avatarUrl:x.avatarKey?`/api/media?key=${encodeURIComponent(x.avatarKey)}`:null})) });
}
export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureMessageSchema(); const body=await request.json() as {account?:string;content?:string;clientNonce?:string};
  const account=String(body.account||"").trim(),content=String(body.content||"").trim().slice(0,1000),clientNonce=String(body.clientNonce||crypto.randomUUID()).slice(0,80);
  if(!account||!content)return Response.json({error:"请输入消息内容"},{status:400});
  if(account===user.email)return Response.json({error:"不能给自己发私信"},{status:400});
  const target=await env.DB.prepare("SELECT email FROM profiles WHERE email=?").bind(account).first();if(!target)return Response.json({error:"用户不存在"},{status:404});
  const existing=await env.DB.prepare("SELECT id FROM direct_messages WHERE sender_email=? AND client_nonce=?").bind(user.email,clientNonce).first<any>();
  if(existing)return Response.json({ok:true,id:existing.id,deduplicated:true});
  const result=await env.DB.prepare("INSERT INTO direct_messages(sender_email,recipient_email,content,created_at,client_nonce) VALUES(?,?,?,?,?)").bind(user.email,account,content,new Date().toISOString(),clientNonce).run();
  return Response.json({ok:true,id:result.meta.last_row_id});
}
