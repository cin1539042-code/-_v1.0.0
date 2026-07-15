import { getChatGPTUser } from "../app/chatgpt-auth";

const ADMIN_PASSWORD = "642037";
const COOKIE = "moyu_admin";
const keyData = new TextEncoder().encode(`moyu-admin:${ADMIN_PASSWORD}:v1`);
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
async function signature(payload:string){const key=await crypto.subtle.importKey("raw",keyData,{name:"HMAC",hash:"SHA-256"},false,["sign"]);return encode(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload))))}
export async function createAdminToken(email:string){const payload=`${email}|${Date.now()+8*3600_000}`;return `${btoa(payload).replace(/=+$/g,"")}.${await signature(payload)}`}
export async function requireAdmin(request:Request){const user=await getChatGPTUser();if(!user)return null;const raw=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);if(!raw)return null;const [encoded,sig]=raw.split(".");try{const payload=atob(encoded),[email,expires]=payload.split("|");if(email!==user.email||Date.now()>Number(expires)||sig!==await signature(payload))return null;return user}catch{return null}}
export function adminCookie(token:string){return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`}
export function clearAdminCookie(){return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`}
export function validAdminPassword(value:string){return value===ADMIN_PASSWORD}
