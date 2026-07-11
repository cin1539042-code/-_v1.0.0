import { getChatGPTUser } from "./chatgpt-auth";
import CommunityApp from "./community-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <CommunityApp user={user ? { displayName: user.displayName, email: user.email } : null} />;
}
