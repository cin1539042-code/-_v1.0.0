import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { works } from "../../../../../db/schema";
export const dynamic="force-dynamic";
export async function POST(_request:Request,context:{params:Promise<{id:string}>}){const {id}=await context.params;const db=await getDb();const [work]=await db.update(works).set({playCount:sql`${works.playCount}+1`}).where(eq(works.id,Number(id))).returning();if(!work)return Response.json({error:"作品不存在"},{status:404});return Response.json({playCount:work.playCount});}
