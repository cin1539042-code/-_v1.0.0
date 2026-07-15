let ready:Promise<unknown>|null=null;
export async function ensureAdminSchema(){if(ready)return ready;const {env}=await import("cloudflare:workers");ready=env.DB.batch([
  env.DB.prepare("CREATE TABLE IF NOT EXISTS announcements (id integer PRIMARY KEY AUTOINCREMENT NOT NULL,content text NOT NULL,active integer DEFAULT 1 NOT NULL,created_by text NOT NULL,created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
  env.DB.prepare("CREATE TABLE IF NOT EXISTS site_settings (key text PRIMARY KEY NOT NULL,value text NOT NULL,updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)")
]).catch(e=>{ready=null;throw e});return ready}
