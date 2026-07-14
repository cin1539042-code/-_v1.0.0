import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { works } from "../../../../../db/schema";
import { contentTypeFor, safeStaticPath } from "../../../../../lib/static-storage";

export const dynamic="force-dynamic";
export async function GET(_request:Request,context:{params:Promise<{appId:string;version:string;path:string[]}>}){
  const {appId,version,path}=await context.params;const id=Number(appId);if(!Number.isInteger(id)||!/^[0-9a-f-]+$/i.test(version))return new Response("Not found",{status:404});const safe=safeStaticPath(path);if(!safe)return new Response("Not found",{status:404});
  const db=await getDb();const [work]=await db.select().from(works).where(eq(works.id,id)).limit(1);const prefix=`apps/${id}/${version}/`;if(!work||work.status!=="published"||!work.fileKey?.startsWith(prefix))return new Response("Not found",{status:404});
  const {env}=await import("cloudflare:workers");const object=await env.BUCKET.get(prefix+safe);if(!object)return new Response("Not found",{status:404});return new Response(object.body,{headers:{"content-type":object.httpMetadata?.contentType||contentTypeFor(safe),"cache-control":"public, max-age=3600","x-content-type-options":"nosniff"}})
}
