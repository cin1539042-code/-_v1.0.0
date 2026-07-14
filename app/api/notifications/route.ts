import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureNotificationSchema } from "../../../lib/notification-db";
import { ensureMessageSchema } from "../../../lib/message-db";

export const dynamic = "force-dynamic";

type MessageRow = {
  id: string;
  kind: "work-update" | "new-follower";
  title: string;
  detail: string;
  createdAt: string;
  workId?: number;
  actorName?: string;
};

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await Promise.all([ensureNotificationSchema(), ensureMessageSchema()]);
  const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [read, updated, followers, direct] = await Promise.all([
    env.DB.prepare("SELECT last_read_at AS lastReadAt FROM notification_reads WHERE user_email=?").bind(user.email).first<{ lastReadAt: string }>(),
    env.DB.prepare(`SELECT w.id,w.title,w.author_name AS authorName,w.updated_at AS createdAt,
      MAX(CASE WHEN f.user_email IS NOT NULL THEN 1 ELSE 0 END) AS isFavorite,
      MAX(CASE WHEN fl.follower_email IS NOT NULL THEN 1 ELSE 0 END) AS isFollowing
      FROM works w
      LEFT JOIN favorites f ON f.work_id=w.id AND f.user_email=?
      LEFT JOIN follows fl ON fl.following_email=w.author_email AND fl.follower_email=?
      WHERE w.status='published' AND w.author_email<>? AND w.updated_at>=?
      AND (f.user_email IS NOT NULL OR fl.follower_email IS NOT NULL)
      GROUP BY w.id ORDER BY w.updated_at DESC LIMIT 20`).bind(user.email, user.email, user.email, cutoff).all<any>(),
    env.DB.prepare(`SELECT f.id,p.display_name AS actorName,f.created_at AS createdAt
      FROM follows f LEFT JOIN profiles p ON p.email=f.follower_email
      WHERE f.following_email=? AND f.created_at>=? ORDER BY f.created_at DESC LIMIT 20`).bind(user.email, cutoff).all<any>(),
    env.DB.prepare(`SELECT m.id,m.sender_email AS senderEmail,m.content,m.created_at AS createdAt,p.display_name AS actorName
      FROM direct_messages m LEFT JOIN profiles p ON p.email=m.sender_email
      WHERE m.recipient_email=? AND m.read_at IS NULL ORDER BY m.created_at DESC LIMIT 20`).bind(user.email).all<any>(),
  ]);
  const messages: MessageRow[] = [
    ...updated.results.map((row: any) => ({
      id: `work:${row.id}:${row.createdAt}`,
      kind: "work-update" as const,
      title: row.isFavorite ? `你收藏的《${row.title}》有更新` : `${row.authorName} 发布了新版本`,
      detail: row.isFavorite ? `打开作品看看这次更新了什么` : `你关注的创作者更新了《${row.title}》`,
      createdAt: row.createdAt,
      workId: row.id,
      actorName: row.authorName,
    })),
    ...followers.results.map((row: any) => ({
      id: `follow:${row.id}`,
      kind: "new-follower" as const,
      title: `${row.actorName || "一位用户"} 关注了你`,
      detail: "你们可以一起快乐摸鱼啦",
      createdAt: row.createdAt,
      actorName: row.actorName || undefined,
    })),
    ...direct.results.map((row:any)=>({id:`dm:${row.id}`,kind:"direct-message" as any,title:`${row.actorName||row.senderEmail} 发来私信`,detail:row.content,createdAt:row.createdAt,actorName:row.actorName,account:row.senderEmail})),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
  const lastReadAt = read?.lastReadAt || "1970-01-01T00:00:00.000Z";
  return Response.json({ messages, unreadCount: messages.filter((item) => new Date(item.createdAt) > new Date(lastReadAt)).length });
}

export async function POST() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureNotificationSchema();
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO notification_reads(user_email,last_read_at) VALUES(?,?) ON CONFLICT(user_email) DO UPDATE SET last_read_at=excluded.last_read_at").bind(user.email, now).run();
  return Response.json({ ok: true, lastReadAt: now });
}
