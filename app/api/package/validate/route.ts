import { getChatGPTUser } from "../../../chatgpt-auth";
import { validateStaticZip } from "../../../../lib/static-package";

export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return Response.json({error:"请先登录"},{status:401});
  const form=await request.formData();const file=form.get("file");
  if(!(file instanceof File))return Response.json({error:"请选择 ZIP 应用包"},{status:400});
  try{const result=validateStaticZip(file.name,new Uint8Array(await file.arrayBuffer()));return Response.json({previewHtml:result.html,fileCount:result.fileCount,unpackedBytes:result.unpackedBytes})}
  catch(error){return Response.json({error:error instanceof Error?error.message:"ZIP 校验失败"},{status:400})}
}
