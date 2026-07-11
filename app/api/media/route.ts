export const dynamic = "force-dynamic";
export async function GET(request:Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key || (!key.startsWith("covers/") && !key.startsWith("avatars/"))) return new Response("Not found",{status:404});
  const { env } = await import("cloudflare:workers");
  const object = await env.BUCKET.get(key);
  if (!object) return new Response("Not found",{status:404});
  return new Response(object.body,{headers:{"content-type":object.httpMetadata?.contentType||"application/octet-stream","cache-control":"public, max-age=3600"}});
}
