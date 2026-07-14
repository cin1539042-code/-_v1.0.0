import { contentTypeFor, safeStaticPath } from "../../../../lib/static-storage";

export const dynamic="force-dynamic";
export async function GET(_request:Request,context:{params:Promise<{token:string;path:string[]}>}){
  const {token,path}=await context.params;if(!/^[0-9a-f-]{36}$/i.test(token))return new Response("Not found",{status:404});const safe=safeStaticPath(path);if(!safe)return new Response("Not found",{status:404});
  const {env}=await import("cloudflare:workers");const object=await env.BUCKET.get(`previews/${token}/${safe}`);if(!object)return new Response("Not found",{status:404});const expires=Number(object.customMetadata?.expiresAt||0);if(!expires||expires<Date.now())return new Response("Preview expired",{status:410});
  return new Response(object.body,{headers:{"content-type":object.httpMetadata?.contentType||contentTypeFor(safe),"cache-control":"private, max-age=60","x-content-type-options":"nosniff"}})
}
