let ready: Promise<unknown> | null = null;

export async function ensureNotificationSchema() {
  if (ready) return ready;
  const { env } = await import("cloudflare:workers");
  ready = env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS notification_reads (user_email text PRIMARY KEY NOT NULL,last_read_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)",
  ).run().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}
