let ready:Promise<unknown>|null=null;
export async function ensureAdminSchema(){if(ready)return ready;const {env}=await import("cloudflare:workers");ready=env.DB.batch([
  env.DB.prepare("CREATE TABLE IF NOT EXISTS announcements (id integer PRIMARY KEY AUTOINCREMENT NOT NULL,content text NOT NULL,active integer DEFAULT 1 NOT NULL,created_by text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
  env.DB.prepare("CREATE TABLE IF NOT EXISTS site_settings (key text PRIMARY KEY NOT NULL,value text NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)")
  ,env.DB.prepare("CREATE TABLE IF NOT EXISTS user_moderation (user_email text PRIMARY KEY NOT NULL,status text DEFAULT 'active' NOT NULL,note text DEFAULT '' NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)")
  ,env.DB.prepare("CREATE TABLE IF NOT EXISTS feedback (id integer PRIMARY KEY AUTOINCREMENT NOT NULL,user_email text NOT NULL,content text NOT NULL,status text DEFAULT 'open' NOT NULL,admin_reply text DEFAULT '' NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)")
]).catch(e=>{ready=null;throw e});return ready}
