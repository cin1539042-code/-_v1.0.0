import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { favorites, works } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
export const dynamic="force-dynamic";
export async function POST(_request:Request,context:{params:Promise<{id:string}>}){
  const user=await getChatGPTUser();if(!user)return Response.json({error:"请先登录后收藏"},{status:401});
  const {id}=await context.params;const workId=Number(id);const db=await getDb();
  const [work]=await db.select().from(works).where(and(eq(works.id,workId),eq(works.status,"published"))).limit(1);if(!work)return Response.json({error:"作品不存在"},{status:404});
  const [existing]=await db.select().from(favorites).where(and(eq(favorites.workId,workId),eq(favorites.userEmail,user.email))).limit(1);
  if(existing)await db.delete(favorites).where(eq(favorites.id,existing.id));else await db.insert(favorites).values({workId,userEmail:user.email});
  const all=await db.select().from(favorites).where(eq(favorites.workId,workId));return Response.json({favorited:!existing,favoriteCount:all.length});
}
