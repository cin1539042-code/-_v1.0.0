import { getChatGPTUser } from "../../../chatgpt-auth";
import { validateStaticZip } from "../../../../lib/static-package";
import { cleanupExpiredPreviews, putStaticFiles } from "../../../../lib/static-storage";

export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return Response.json({error:"请先登录"},{status:401});
  const form=await request.formData();const file=form.get("file");
  if(!(file instanceof File))return Response.json({error:"请选择 ZIP 应用包"},{status:400});
  try{const result=validateStaticZip(file.name,new Uint8Array(await file.arrayBuffer()));const token=crypto.randomUUID();const expiresAt=Date.now()+60*60*1000;const {env}=await import("cloudflare:workers");await cleanupExpiredPreviews(env.BUCKET);await putStaticFiles(env.BUCKET,`previews/${token}/`,result.files,expiresAt);return Response.json({previewUrl:`/app-previews/${token}/index.html`,previewToken:token,expiresAt,fileCount:result.fileCount,unpackedBytes:result.unpackedBytes})}
  catch(error){return Response.json({error:error instanceof Error?error.message:"ZIP 校验失败"},{status:400})}
}
