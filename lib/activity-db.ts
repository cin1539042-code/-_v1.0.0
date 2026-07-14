let ready:Promise<unknown>|null=null;
export async function ensureActivitySchema(){
  if(ready)return ready;
  const {env}=await import("cloudflare:workers");
  ready=env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS user_activity (id integer PRIMARY KEY AUTOINCREMENT NOT NULL,user_email text NOT NULL,activity_day text NOT NULL,fish_count integer DEFAULT 0 NOT NULL,fish_seconds integer DEFAULT 0 NOT NULL,last_seen_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)'),
    env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS user_activity_user_day_unique ON user_activity (user_email,activity_day)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS user_activity_last_seen_idx ON user_activity (last_seen_at)')
  ]).catch(error=>{ready=null;throw error});
  return ready;
}
