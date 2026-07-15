let ready: Promise<unknown> | null = null;
export async function ensureMessageSchema() {
  if (ready) return ready;
  const { env } = await import("cloudflare:workers");
  ready = env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS direct_messages (id integer PRIMARY KEY AUTOINCREMENT NOT NULL,sender_email text NOT NULL,recipient_email text NOT NULL,content text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,read_at text,client_nonce text)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS direct_messages_participants_idx ON direct_messages (sender_email,recipient_email,created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS direct_messages_unread_idx ON direct_messages (recipient_email,read_at)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS direct_messages_sender_nonce_unique ON direct_messages (sender_email,client_nonce)"),
  ]).catch((error) => { ready = null; throw error; });
  return ready;
}
