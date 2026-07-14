export const contentTypes:Record<string,string>={html:"text/html; charset=utf-8",htm:"text/html; charset=utf-8",css:"text/css; charset=utf-8",js:"text/javascript; charset=utf-8",mjs:"text/javascript; charset=utf-8",json:"application/json; charset=utf-8",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",gif:"image/gif",woff:"font/woff",woff2:"font/woff2",ttf:"font/ttf",otf:"font/otf",mp3:"audio/mpeg",wav:"audio/wav",ogg:"audio/ogg",m4a:"audio/mp4"};
export const contentTypeFor=(name:string)=>contentTypes[(name.split(".").pop()||"").toLowerCase()]||"application/octet-stream";

export async function putStaticFiles(bucket:R2Bucket,prefix:string,files:Map<string,Uint8Array>,expiresAt?:number){
  await Promise.all([...files].map(([path,data])=>bucket.put(prefix+path,data,{httpMetadata:{contentType:contentTypeFor(path)},customMetadata:expiresAt?{expiresAt:String(expiresAt)}:undefined})))
}

export async function deletePrefix(bucket:R2Bucket,prefix:string){
  let cursor:string|undefined;
  do{const listed=await bucket.list({prefix,cursor});if(listed.objects.length)await bucket.delete(listed.objects.map(x=>x.key));cursor=listed.truncated?listed.cursor:undefined}while(cursor)
}

export async function cleanupExpiredPreviews(bucket:R2Bucket){
  const listed=await bucket.list({prefix:"previews/",limit:1000,include:["customMetadata"]});const now=Date.now();const expired=listed.objects.filter(object=>Number(object.customMetadata?.expiresAt||0)<now).map(object=>object.key);if(expired.length)await bucket.delete(expired)
}

export function safeStaticPath(parts:string[]){
  if(!parts.length||parts.some(part=>!part||part==="."||part===".."||part.includes("/")||part.includes("\\")))return null;return parts.join("/");
}
