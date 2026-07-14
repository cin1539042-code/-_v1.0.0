import { unzipSync } from "fflate";

const MAX_ZIP = 20 * 1024 * 1024;
const MAX_UNPACKED = 50 * 1024 * 1024;
const MAX_FILES = 300;
const allowed = new Set(["html","htm","css","js","mjs","json","png","jpg","jpeg","webp","svg","gif","woff","woff2","ttf","otf","mp3","wav","ogg","m4a"]);
const mime: Record<string,string> = {html:"text/html",htm:"text/html",css:"text/css",js:"text/javascript",mjs:"text/javascript",json:"application/json",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",svg:"image/svg+xml",gif:"image/gif",woff:"font/woff",woff2:"font/woff2",ttf:"font/ttf",otf:"font/otf",mp3:"audio/mpeg",wav:"audio/wav",ogg:"audio/ogg",m4a:"audio/mp4"};

const clean=(name:string)=>name.replaceAll("\\","/").replace(/^\.\//,"");
const ext=(name:string)=>(name.split(".").pop()||"").toLowerCase();
const resolve=(base:string,ref:string)=>{
  const parts=(base.includes("/")?base.slice(0,base.lastIndexOf("/")+1):"").split("/").filter(Boolean);
  for(const part of ref.split("/")){if(!part||part===".")continue;if(part==="..")parts.pop();else parts.push(part)}
  return parts.join("/");
};
const external=(v:string)=>/^(?:[a-z]+:|\/\/|#|data:|blob:)/i.test(v);
const base64=(data:Uint8Array)=>{let binary="";for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(binary)};

export function validateStaticZip(fileName:string,bytes:Uint8Array){
  if(bytes.byteLength>MAX_ZIP)throw new Error("ZIP 不能超过 20MB");
  if(!fileName.toLowerCase().endsWith(".zip"))throw new Error("请选择 ZIP 应用包");
  let unpacked:Record<string,Uint8Array>;
  try{unpacked=unzipSync(bytes)}catch{throw new Error("ZIP 解压失败或压缩包已损坏")}
  const files=new Map<string,Uint8Array>();let total=0;
  for(const [raw,data] of Object.entries(unpacked)){
    const name=clean(raw);if(!name||name.endsWith("/"))continue;
    if(name.startsWith("/")||/^[a-z]:/i.test(name)||name.split("/").includes(".."))throw new Error(`发现危险路径：${raw}`);
    if(!allowed.has(ext(name)))throw new Error(`不允许的文件类型：${name}`);
    total+=data.byteLength;if(total>MAX_UNPACKED)throw new Error("解压后总体积不能超过 50MB");
    files.set(name,data);
  }
  if(files.size>MAX_FILES)throw new Error("文件数量不能超过 300 个");
  if(!files.has("index.html")){
    const roots=new Set([...files.keys()].map(name=>name.split("/")[0]));const root=roots.size===1?[...roots][0]:"";
    if(root&&files.has(`${root}/index.html`)){const normalized=[...files.entries()].map(([name,data])=>[name.slice(root.length+1),data] as const);files.clear();normalized.forEach(([name,data])=>files.set(name,data))}
  }
  if(!files.has("index.html"))throw new Error("压缩包根目录必须包含 index.html");
  const decoder=new TextDecoder();let html=decoder.decode(files.get("index.html")!);
  const refs=[...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map(x=>x[1]);
  for(const ref of refs){if(external(ref))continue;const key=resolve("index.html",ref.split(/[?#]/)[0]);if(!files.has(key))throw new Error(`HTML 引用的本地资源不存在：${ref}`)}
  html=html.replace(/(src|href)\s*=\s*(["'])([^"']+)\2/gi,(all,attr,quote,ref)=>{
    if(external(ref))return all;const plain=ref.split(/[?#]/)[0];const key=resolve("index.html",plain);const data=files.get(key);if(!data)return all;
    const type=mime[ext(key)]||"application/octet-stream";
    return `${attr}=${quote}data:${type};base64,${base64(data)}${quote}`;
  });
  return {html,fileCount:files.size,unpackedBytes:total};
}
