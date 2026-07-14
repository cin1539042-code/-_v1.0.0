import { injectAppStorageBridge } from "../../../../../lib/app-storage-bridge";
import { contentTypeFor, safeStaticPath } from "../../../../../lib/static-storage";

export const dynamic="force-dynamic";
export async function GET(_request:Request,context:{params:Promise<{appId:string;version:string;path:string[]}>}){
  const {appId,version,path}=await context.params;const id=Number(appId);if(!Number.isInteger(id)||!/^[0-9a-f-]+$/i.test(version))return new Response("Not found",{status:404});const safe=safeStaticPath(path);if(!safe)return new Response("Not found",{status:404});
  const prefix=`apps/${id}/${version}/`;
  const {env}=await import("cloudflare:workers");const object=await env.BUCKET.get(prefix+safe);if(!object)return new Response("Not found",{status:404});
  const isHtml=/\.html?$/i.test(safe);const body=isHtml?injectAppStorageBridge(await object.text()):object.body;
  return new Response(body,{headers:{"content-type":object.httpMetadata?.contentType||contentTypeFor(safe),"cache-control":isHtml?"no-store":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})
}
