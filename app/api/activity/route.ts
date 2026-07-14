import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { userActivity } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureActivitySchema } from "../../../lib/activity-db";

export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return Response.json({ok:false},{status:401});
  const body=await request.json().catch(()=>({})) as {day?:string;fishCount?:number;fishSeconds?:number};
  const day=/^\d{4}-\d{2}-\d{2}$/.test(String(body.day||""))?String(body.day):new Date().toISOString().slice(0,10);
  const fishCount=Math.max(0,Math.min(100000,Math.floor(Number(body.fishCount)||0)));
  const fishSeconds=Math.max(0,Math.min(86400,Math.floor(Number(body.fishSeconds)||0)));
  await ensureActivitySchema();const db=await getDb();const [existing]=await db.select().from(userActivity).where(and(eq(userActivity.userEmail,user.email),eq(userActivity.activityDay,day))).limit(1);
  const values={fishCount,fishSeconds,lastSeenAt:new Date().toISOString()};
  if(existing)await db.update(userActivity).set(values).where(eq(userActivity.id,existing.id));else await db.insert(userActivity).values({userEmail:user.email,activityDay:day,...values});
  return Response.json({ok:true,fishCount,fishSeconds},{headers:{"cache-control":"no-store"}});
}
