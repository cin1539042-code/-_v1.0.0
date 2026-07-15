import { adminCookie,clearAdminCookie,createAdminToken,requireAdmin,validAdminPassword } from "../../../../lib/admin";
import { getChatGPTUser } from "../../../chatgpt-auth";
export const dynamic="force-dynamic";
export async function GET(request:Request){return Response.json({authenticated:!!await requireAdmin(request)})}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:"请先登录"},{status:401});const body=await request.json() as {account?:string;password?:string};if(body.account!==user.email||!validAdminPassword(String(body.password||"")))return Response.json({error:"账号或密码错误"},{status:403});const token=await createAdminToken(user.email);return Response.json({ok:true},{headers:{"set-cookie":adminCookie(token)}})}
export async function DELETE(){return Response.json({ok:true},{headers:{"set-cookie":clearAdminCookie()}})}
