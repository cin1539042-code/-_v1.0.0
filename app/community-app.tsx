"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";

type User = { displayName: string; email: string } | null;
type Work = {
  id: number;
  type: string;
  title: string;
  description: string;
  authorName: string;
  authorAvatar?: string | null;
  authorEmoji?: string;
  status?: string;
  content?: string;
  appHtml?: string;
  appUrl?: string | null;
  externalUrl?: string | null;
  coverUrl?: string | null;
  windowSize?: string;
  windowWidth?: number;
  windowHeight?: number;
  playCount?: number;
  favoriteCount?: number;
  isFavorited?: boolean;
  updatedAt?: string;
  hasNewVersion?: boolean;
  permissions?: string;
  updateNotes?: string;
};
type Profile = {
  displayName: string;
  bio: string;
  avatar: string;
  avatarUrl?: string | null;
  followerCount?: number;
  isFollowing?: boolean;
  isSelf?: boolean;
  workCount?: number;
  isOnline?: boolean;
  todayFishCount?: number;
  todayFishSeconds?: number;
};
type NotificationMessage = {
  id: string;
  kind: "work-update" | "new-follower" | "direct-message";
  title: string;
  detail: string;
  createdAt: string;
  workId?: number;
  actorName?: string;
  account?: string;
};
type ChatUser = { account:string;displayName:string;avatar:string;avatarUrl?:string|null;unreadCount?:number;content?:string;createdAt?:string };
const categories = ["工具", "娱乐", "聊天", "影音", "其他"];
const STORAGE_CHANNEL = "moyu-storage-v1";
const STORAGE_LIMIT = 1024 * 1024;
const MAX_ZIP_BYTES = 20 * 1024 * 1024;
const readApiResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  let data: Record<string, any> = {};
  if (contentType.includes("application/json")) {
    try { data = await response.json(); } catch { data = {}; }
  } else {
    const text = await response.text().catch(() => "");
    if (text.trim()) data.error = text.trim().slice(0, 300);
  }
  if (!response.ok && !data.error) data.error = response.status === 413
    ? "上传请求过大：ZIP 最大 20MB，请求最大 25MB"
    : `请求失败（HTTP ${response.status}）`;
  return data;
};
const storageBridge = `<script>(function(){var seq=0,pending=new Map();function call(action,key,value){return new Promise(function(resolve,reject){var id=++seq;pending.set(id,{resolve:resolve,reject:reject});parent.postMessage({channel:'${STORAGE_CHANNEL}',id:id,action:action,key:key,value:value},'*');setTimeout(function(){if(pending.has(id)){pending.delete(id);reject(new Error('存档请求超时'))}},5000)})}window.addEventListener('message',function(e){var m=e.data;if(!m||m.channel!=='${STORAGE_CHANNEL}'||!m.response)return;var p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.ok?p.resolve(m.value):p.reject(new Error(m.error||'存档失败'))});window.MoyuStorage={set:function(k,v){return call('set',k,v)},get:function(k){return call('get',k)},remove:function(k){return call('remove',k)},clear:function(){return call('clear')},keys:function(){return call('keys')}};window.dispatchEvent(new Event('moyu-storage-ready'))})();<\/script>`;
const withStorageBridge = (html: string) =>
  html.includes(STORAGE_CHANNEL)
    ? html
    : html.includes("</head>")
      ? html.replace("</head>", storageBridge + "</head>")
      : storageBridge + html;
const sdkBridge = `<script>(function(){if(window.MoyuSDK)return;var pending=new Map();function request(method,params){return new Promise(function(resolve,reject){var requestId=(crypto.randomUUID?crypto.randomUUID():Date.now()+'_'+Math.random().toString(36).slice(2));var timer=setTimeout(function(){pending.delete(requestId);var e=new Error('SDK 请求超时');e.code='SDK_TIMEOUT';reject(e)},10000);pending.set(requestId,{resolve:resolve,reject:reject,timer:timer});parent.postMessage({source:'moyu-app',version:'1.0',type:'MOYU_SDK_REQUEST',requestId:requestId,method:method,params:params||{}},'*')})}addEventListener('message',function(e){var m=e.data;if(!m||m.source!=='moyu-platform'||m.type!=='MOYU_SDK_RESPONSE')return;var p=pending.get(m.requestId);if(!p)return;pending.delete(m.requestId);clearTimeout(p.timer);if(m.success)p.resolve(m.data);else{var er=new Error(m.error&&m.error.message||'SDK 请求失败');er.code=m.error&&m.error.code||'INTERNAL_ERROR';p.reject(er)}});window.MoyuSDK={ready:function(){return Promise.resolve()},getCurrentUser:function(){return request('user.getCurrent')},getAppInfo:function(){return request('app.getInfo')},get:function(k){return request('storage.get',{key:k})},set:function(k,v){return request('storage.set',{key:k,value:v})},remove:function(k){return request('storage.remove',{key:k})}};dispatchEvent(new Event('moyu-sdk-ready'))})();<\/script>`;
const withSdkBridge=(html:string)=>{const base=withStorageBridge(html);return base.includes("moyu-sdk-ready")?base:base.includes("</head>")?base.replace("</head>",sdkBridge+"</head>"):sdkBridge+base};
const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "暂无";
const formatDuration=(seconds:number)=>`${String(Math.floor(seconds/3600)).padStart(2,"0")}:${String(Math.floor(seconds%3600/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
const beijingDay = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const blankApp = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>我的作品</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: sans-serif; background: #fff8ed; }
    .app { text-align: center; padding: 40px; }
    button { border: 0; border-radius: 12px; padding: 12px 20px; background: #ff4b24; color: white; }
  </style>
</head>
<body>
  <main class="app">
    <h1>从这里开始自由创作</h1>
    <p id="message">你可以修改全部 HTML、CSS 和 JavaScript。</p>
    <button id="tryButton">试一下</button>
  </main>
  <script>
    let count = 0;
    async function restore() {
      const saved = await MoyuStorage.get("clickCount");
      count = saved || 0;
      message.textContent = count ? "已为你恢复摸鱼进度：" + count + " 次" : "作品运行成功！";
    }
    tryButton.onclick = async () => {
      count += 1;
      message.textContent = "已摸鱼 " + count + " 次，进度会自动保留";
      await MoyuStorage.set("clickCount", count);
    };
    restore();
  </script>
</body>
</html>`;

const starterTemplates = [
  { name: "空白应用", icon: "✦", code: blankApp },
  {
    name: "点击互动",
    icon: "🎮",
    code: blankApp
      .replace("从这里开始自由创作", "点击互动作品")
      .replace("作品运行成功！", "你完成了一次互动！"),
  },
  {
    name: "内容展示",
    icon: "📰",
    code: blankApp
      .replace("从这里开始自由创作", "我的内容空间")
      .replace(
        "你可以修改全部 HTML、CSS 和 JavaScript。",
        "在这里自由展示文章、音乐、图片或任何创意。",
      ),
  },
];

export default function CommunityApp({ user }: { user: User }) {
  const ownerName = "浅笑";
  const [tab, setTab] = useState("发现功能");
  const [query, setQuery] = useState("");
  const [works, setWorks] = useState<Work[]>([]);
  const [mine, setMine] = useState<Work[]>([]);
  const [favoriteWorks, setFavoriteWorks] = useState<Work[]>([]);
  const [followedCreators, setFollowedCreators] = useState<Profile[]>([]);
  const [followers,setFollowers]=useState<ChatUser[]>([]);
  const [viewer, setViewer] = useState<Work | null>(null);
  const [minimizedApps,setMinimizedApps]=useState<Work[]>([]);
  const [creator, setCreator] = useState<{
    profile: Profile;
    works: Work[];
  } | null>(null);
  const [message, setMessage] = useState("");
  const [revealedVersion, setRevealedVersion] = useState("");
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    id: 0,
    title: "",
    type: "",
    description: "",
    content: "",
    externalUrl: "",
    windowSize: "desktop",
    windowWidth: 1200,
    windowHeight: 800,
    permissions: "storage",
    updateNotes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [profile, setProfile] = useState<Profile>({
    displayName: ownerName,
    bio: "这个人正在认真摸鱼和创造。",
    avatar: "🐟",
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const appFrameRef = useRef<HTMLIFrameElement>(null);
  const brandClickCount = useRef(0);
  const brandClickTimer = useRef<number | null>(null);
  const versionClickCount=useRef(0);
  const versionClickTimer=useRef<number|null>(null);
  const activityRef=useRef({fishCount:0,fishSeconds:0});
  const [category, setCategory] = useState("全部");
  const [showLogin, setShowLogin] = useState(!user);
  const [showStorageDocs, setShowStorageDocs] = useState(false);
  const [packageMode,setPackageMode]=useState<"html"|"zip">("html");
  const [packageConfirmed,setPackageConfirmed]=useState(false);
  const [packageReport,setPackageReport]=useState("");
  const [viewerMode, setViewerMode] = useState("desktop");
  const [minimized, setMinimized] = useState(false);
  const [viewerReady,setViewerReady]=useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [todayFish, setTodayFish] = useState(0);
  const [clockNow, setClockNow] = useState(new Date());
  const [copyNotice, setCopyNotice] = useState("");
  const [fishFeedback, setFishFeedback] = useState<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const [escapingFish, setEscapingFish] = useState<Record<number, string>>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMessages, setShowMessages] = useState(false);
  const [messageTab,setMessageTab]=useState<"notices"|"chats">("notices");
  const [userSearch,setUserSearch]=useState("");
  const [userResults,setUserResults]=useState<ChatUser[]>([]);
  const [conversations,setConversations]=useState<ChatUser[]>([]);
  const [chatTarget,setChatTarget]=useState<ChatUser|null>(null);
  const [chatMessages,setChatMessages]=useState<any[]>([]);
  const [chatDraft,setChatDraft]=useState("");
  const [releaseNotes,setReleaseNotes]=useState<Work|null>(null);
  const [showAdminLogin,setShowAdminLogin]=useState(false);
  const [adminPassword,setAdminPassword]=useState("");
  const [adminData,setAdminData]=useState<any>(null);
  const [announcement,setAnnouncement]=useState<any>(null);
  const [announcementDraft,setAnnouncementDraft]=useState("");
  const [adminVersion,setAdminVersion]=useState("v37");
  const [moyuSeconds, setMoyuSeconds] = useState(0);
  const moyuTime = [
    Math.floor(moyuSeconds / 3600),
    Math.floor((moyuSeconds % 3600) / 60),
    moyuSeconds % 60,
  ]
    .map((x) => String(x).padStart(2, "0"))
    .join(":");
  activityRef.current={fishCount:todayFish,fishSeconds:moyuSeconds};
  const previewScale = Math.min(
    280 / Math.max(form.windowWidth, 1),
    180 / Math.max(form.windowHeight, 1),
    1,
  );

  const loadWorks = async () => {
    const r = await fetch("/api/works");
    const d = await r.json();
    if (r.ok) setWorks(d.works.map((work:Work)=>{
      const seen=localStorage.getItem(`moyu:last-played:${work.id}`);
      return {...work,hasNewVersion:!!seen&&!!work.updatedAt&&seen!==work.updatedAt};
    }));
  };
  const loadMine = async () => {
    if (!user) return;
    const r = await fetch("/api/works?mine=1");
    const d = await r.json();
    if (r.ok) setMine(d.works);
  };
  const loadFavorites = async () => {
    if (!user) return;
    const r = await fetch("/api/works?favorite=1");
    const d = await r.json();
    if (r.ok) setFavoriteWorks(d.works);
  };
  const loadFollows = async () => {
    if (!user) return;
    const r = await fetch("/api/follows");
    const d = await r.json();
    if (r.ok) setFollowedCreators(d.creators);
  };
  const loadFollowers=async()=>{if(!user)return;const r=await fetch("/api/follows?mode=followers");const d=await readApiResponse(r);if(r.ok)setFollowers(d.creators||[])};
  const loadNotifications = async () => {
    if (!user) return;
    const r = await fetch("/api/notifications", { cache: "no-store" });
    const d = await readApiResponse(r);
    if (r.ok) {
      setNotifications(d.messages || []);
      setUnreadCount(d.unreadCount || 0);
    }
  };
  const openMessages = async () => {
    setShowMessages(true);
    await loadNotifications();
    await loadConversations();
    const r = await fetch("/api/notifications", { method: "POST" });
    if (r.ok) setUnreadCount(0);
  };
  const loadConversations=async()=>{const r=await fetch("/api/messages",{cache:"no-store"});const d=await readApiResponse(r);if(r.ok)setConversations(d.conversations||[])};
  const searchUsers=async()=>{if(userSearch.trim().length<2){setUserResults([]);return}const r=await fetch(`/api/users?q=${encodeURIComponent(userSearch.trim())}`);const d=await readApiResponse(r);if(r.ok)setUserResults(d.users||[])};
  const refreshChat=async(target:ChatUser,foreground=false)=>{const r=await fetch(`/api/messages?account=${encodeURIComponent(target.account)}`,{cache:"no-store"});const d=await readApiResponse(r);if(r.ok){if(foreground){setChatTarget(d.user);void loadNotifications();void loadConversations()}setChatMessages(d.messages||[])}};
  const openChat=async(target:ChatUser)=>{setChatTarget(target);setMessageTab("chats");await refreshChat(target,true)};
  const deliverQueuedMessage=async(item:{account:string;content:string;clientNonce:string})=>{try{const r=await fetch("/api/messages",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(item)});if(!r.ok)return false;const queue=JSON.parse(localStorage.getItem("moyu:message-outbox")||"[]").filter((x:any)=>x.clientNonce!==item.clientNonce);localStorage.setItem("moyu:message-outbox",JSON.stringify(queue));return true}catch{return false}};
  const retryOutbox=async()=>{const queue=JSON.parse(localStorage.getItem("moyu:message-outbox")||"[]") as {account:string;content:string;clientNonce:string}[];for(const item of queue)await deliverQueuedMessage(item);if(chatTarget)void refreshChat(chatTarget)};
  const sendChat=async()=>{if(!chatTarget||!chatDraft.trim())return;const content=chatDraft.trim(),target=chatTarget,clientNonce=crypto.randomUUID(),tempId=`temp-${clientNonce}`,item={account:target.account,content,clientNonce};setChatDraft("");setChatMessages(list=>[...list,{id:tempId,senderEmail:user?.email,recipientEmail:target.account,content,createdAt:new Date().toISOString(),pending:true}]);const queue=JSON.parse(localStorage.getItem("moyu:message-outbox")||"[]");localStorage.setItem("moyu:message-outbox",JSON.stringify([...queue,item]));const delivered=await deliverQueuedMessage(item);if(delivered)void refreshChat(target);else setMessage("网络不稳定，私信已安全保存在待发队列，联网后会自动重试")};
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if(!user)return;
    const send=()=>void fetch("/api/activity",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({day:beijingDay(),...activityRef.current})});
    const initial=window.setTimeout(send,1200);const timer=window.setInterval(send,5000);return()=>{window.clearTimeout(initial);window.clearInterval(timer)};
  },[user]);
  useEffect(() => {
    void loadWorks();
    void fetch("/api/announcement",{cache:"no-store"}).then(r=>r.json()).then(d=>setAnnouncement(d.announcement||null)).catch(()=>{});
    if (user) {
      void loadProfile();
      void loadMine();
    }
  }, []);
  useEffect(() => {
    if (!user) return;
    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 60_000);
    return () => window.clearInterval(timer);
  }, [user]);
  useEffect(()=>{if(!chatTarget)return;const timer=window.setInterval(()=>void refreshChat(chatTarget),2500);return()=>window.clearInterval(timer)},[chatTarget?.account]);
  useEffect(()=>{if(!user)return;void retryOutbox();const online=()=>void retryOutbox();window.addEventListener("online",online);const timer=window.setInterval(()=>void retryOutbox(),15000);return()=>{window.removeEventListener("online",online);window.clearInterval(timer)}},[user]);
  useEffect(() => {
    let day = beijingDay();
    setMoyuSeconds(Number(localStorage.getItem(`moyu-seconds:${day}`) || 0));
        setTodayFish(Number(localStorage.getItem(`moyu-clicks:${day}`) || 0));
    const timer = window.setInterval(() => {
      const current = beijingDay();
      if (current !== day) {
        day = current;
        setMoyuSeconds(0);
        setTodayFish(0);
      } else
        setMoyuSeconds((x) => {
          const next = x + 1;
          localStorage.setItem(`moyu-seconds:${day}`, String(next));
          return next;
        });
      setClockNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const check = async () => {
      try {
        const d = await fetch("/api/version", { cache: "no-store" }).then((r) =>
          r.json(),
        );
        const seen = sessionStorage.getItem("moyu-site-version");
        if (seen && seen !== d.version) {
          setUpdateAvailable(true);
          if (tab !== "创作中心" || (!form.title && !form.content))
            window.setTimeout(() => location.reload(), 1500);
        }
        sessionStorage.setItem("moyu-site-version", d.version);
      } catch {}
    };
    void check();
    const timer = window.setInterval(check, 20000);
    return () => window.clearInterval(timer);
  }, [tab, form.title, form.content]);
  useLayoutEffect(() => {
    if (!viewer) return;
    const workId = viewer.id || `preview-${form.title || "untitled"}`;
    const prefix = `moyu:work:${workId}:`;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== appFrameRef.current?.contentWindow) return;
      const m = event.data;
      if(m?.source==="moyu-app"&&m?.type==="MOYU_SDK_REQUEST"&&m.requestId){
        const allowed=(()=>{try{return JSON.parse(viewer.permissions||'["storage"]')}catch{return ["storage"]}})();
        const respond=(success:boolean,data?:unknown,code?:string,message?:string)=>appFrameRef.current?.contentWindow?.postMessage({source:"moyu-platform",version:"1.0",type:"MOYU_SDK_RESPONSE",requestId:m.requestId,success,data,error:success?undefined:{code,message}},"*");
        const appId=String(viewer.id||`preview-${form.title||"untitled"}`),key=String(m.params?.key||"");
        if(m.method==="user.getCurrent"){
          if(!allowed.includes("user.basic")){respond(false,undefined,"PERMISSION_DENIED","该应用未申请用户公开信息权限");return}
          let hash=2166136261;for(const ch of user?.email||"")hash=Math.imul(hash^ch.charCodeAt(0),16777619);
          respond(true,user?{isLoggedIn:true,id:`u_${(hash>>>0).toString(36)}`,nickname:profile.displayName||user.displayName,avatar:profile.avatarUrl||null}:{isLoggedIn:false,id:null,nickname:"游客",avatar:null});return;
        }
        if(m.method==="app.getInfo"){respond(true,{appId,name:viewer.title,version:viewer.updatedAt||"preview",previewMode:!viewer.id,ownerUserId:null});return}
        if(m.method.startsWith("storage.")){
          if(!allowed.includes("storage")){respond(false,undefined,"PERMISSION_DENIED","该应用未申请本地缓存权限");return}
          if(!/^[A-Za-z0-9_.-]{1,100}$/.test(key)){respond(false,undefined,"STORAGE_KEY_INVALID","存档键格式无效");return}
          const storageKey=`moyu:work:${appId}:${key}`;
          try{if(m.method==="storage.get")respond(true,JSON.parse(localStorage.getItem(storageKey)||"null"));else if(m.method==="storage.set"){localStorage.setItem(storageKey,JSON.stringify(m.params?.value));respond(true,true)}else if(m.method==="storage.remove"){localStorage.removeItem(storageKey);respond(true,true)}else respond(false,undefined,"INVALID_REQUEST","不支持的方法")}catch{respond(false,undefined,"INTERNAL_ERROR","存档操作失败")}return;
        }
        respond(false,undefined,"INVALID_REQUEST","不支持的方法");return;
      }
      if (!m || m.channel !== STORAGE_CHANNEL || m.response) return;
      const reply = (ok: boolean, value?: unknown, error?: string) =>
        appFrameRef.current?.contentWindow?.postMessage(
          {
            channel: STORAGE_CHANNEL,
            response: true,
            id: m.id,
            ok,
            value,
            error,
          },
          "*",
        );
      try {
        const key = String(m.key || "");
        if (key.length > 100) throw new Error("存档键不能超过100个字符");
        if (m.action === "get")
          reply(true, JSON.parse(localStorage.getItem(prefix + key) || "null"));
        else if (m.action === "keys")
          reply(
            true,
            Object.keys(localStorage)
              .filter((k) => k.startsWith(prefix))
              .map((k) => k.slice(prefix.length)),
          );
        else if (m.action === "remove") {
          localStorage.removeItem(prefix + key);
          reply(true, true);
        } else if (m.action === "clear") {
          Object.keys(localStorage)
            .filter((k) => k.startsWith(prefix))
            .forEach((k) => localStorage.removeItem(k));
          reply(true, true);
        } else if (m.action === "set") {
          const encoded = JSON.stringify(m.value);
          if (encoded.length > 100 * 1024)
            throw new Error("单条存档不能超过100KB");
          const entries = Object.keys(localStorage).filter(
            (k) => k.startsWith(prefix) && k !== prefix + key,
          );
          if (!localStorage.getItem(prefix + key) && entries.length >= 100)
            throw new Error("每个作品最多保存100个键");
          const total =
            entries.reduce(
              (n, k) => n + (localStorage.getItem(k)?.length || 0),
              0,
            ) + encoded.length;
          if (total > STORAGE_LIMIT) throw new Error("本作品存档已达到1MB上限");
          localStorage.setItem(prefix + key, encoded);
          reply(true, true);
        } else throw new Error("不支持的存档操作");
      } catch (e) {
        reply(false, undefined, e instanceof Error ? e.message : "存档失败");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [viewer]);
  const clearViewerStorage = () => {
    if (!viewer) return;
    const prefix = `moyu:work:${viewer.id || `preview-${form.title || "untitled"}`}:`;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
    setMessage(`已清除“${viewer.title}”在本设备上的存档`);
  };
  const copyStorageExample = async () => {
    try {
      await navigator.clipboard.writeText(
        `// 保存进度\nawait MoyuStorage.set("progress", { level: 2, score: 100 });\n\n// 恢复进度\nconst progress = await MoyuStorage.get("progress");`,
      );
      setCopyNotice("✓ 复制成功，可以粘贴到作品代码中");
      window.setTimeout(() => setCopyNotice(""), 3000);
    } catch {
      setCopyNotice("复制失败，请手动选择代码");
    }
  };
  const catchFish = (event: MouseEvent<HTMLButtonElement>, index: number) => {
    const fish=event.currentTarget;
    if(fish.dataset.escaping==="1")return;
    fish.dataset.escaping="1";
    const day = beijingDay();
    setTodayFish((x) => {
      const next = x + 1;
      localStorage.setItem(`moyu-clicks:${day}`, String(next));
      return next;
    });
    setFishFeedback({ x: event.clientX, y: event.clientY, id: Date.now() });
    const direction=Math.random()>.5?1:-1;
    const wild=Math.random()>.55;
    const animation=fish.animate(wild?
      [{transform:"scaleX(-1) translate(0,0)"},{transform:`scaleX(${direction}) translate(${direction*55}px,-32px) rotate(15deg)`,offset:.28},{transform:`scaleX(${-direction}) translate(${direction*140}px,25px) rotate(-12deg)`,offset:.62},{transform:`scaleX(${direction}) translate(${direction*320}px,-18px) rotate(5deg)`,opacity:0}]:
      [{transform:"scaleX(-1) translateX(0)",opacity:1},{transform:`scaleX(${direction}) translateX(${direction*360}px) rotate(${direction*8}deg)`,opacity:0}],
      {duration:wild?900:720,easing:"cubic-bezier(.18,.8,.25,1)",fill:"forwards"});
    animation.onfinish=()=>setEscapingFish((state) => ({ ...state, [index]: "fish-cooldown" }));
    window.setTimeout(() => setEscapingFish((state) => {
      const next = { ...state };
      delete next[index];
      window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{animation.cancel();delete fish.dataset.escaping}));
      return next;
    }), 6000 + Math.random() * 5000);
    window.setTimeout(() => setFishFeedback(null), 850);
  };
  const allWorks = works.filter(
    (w) =>
      (category === "全部" || w.type === category) &&
      `${w.title}${w.description}${w.type}${w.authorName}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  const openWork = async (w: Work) => {
    const shouldShowNotes=!!w.hasNewVersion;
    if(viewer&&viewer.id!==w.id){
      if(minimizedApps.length>=3){setMessage("最多只能同时最小化 3 个应用，请先关闭一个应用");return}
      setMinimizedApps(list=>list.some(x=>x.id===viewer.id)?list:[...list,viewer]);
    }
    if(w.updatedAt)localStorage.setItem(`moyu:last-played:${w.id}`,w.updatedAt);
    setWorks(list=>list.map(x=>x.id===w.id?{...x,hasNewVersion:false}:x));
    void fetch(`/api/works/${w.id}/play`, { method: "POST" }).then(() =>
      loadWorks(),
    );
    if (w.externalUrl) {
      window.open(w.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const r = await fetch(`/api/works/${w.id}`);
    const d = await r.json();
    if (r.ok) {
      if(shouldShowNotes&&d.work.updateNotes)setReleaseNotes(d.work);
      if (d.work.externalUrl)
        window.open(d.work.externalUrl, "_blank", "noopener,noreferrer");
      else {
        setViewerMode(d.work.windowSize || "desktop");
        setMinimized(false);
        setViewerReady(!d.work.appUrl);
        setViewer(d.work);
      }
    } else setMessage(d.error || "加载失败");
  };
  const minimizeViewer=()=>{
    if(!viewer)return;
    if(minimizedApps.some(x=>x.id===viewer.id)){setViewer(null);return}
    if(minimizedApps.length>=3){setMessage("最多只能同时最小化 3 个应用");return}
    setMinimizedApps(list=>[...list,viewer]);setViewer(null);setMinimized(false);
  };
  const restoreMinimized=(work:Work)=>{
    if(viewer&&viewer.id!==work.id){
      setMinimizedApps(list=>[...list.filter(x=>x.id!==work.id),viewer]);
    }else setMinimizedApps(list=>list.filter(x=>x.id!==work.id));
    setViewerMode(work.windowSize||"desktop");setViewerReady(!work.appUrl);setViewer(work);
  };
  const openCreator = async (name: string) => {
    const r = await fetch(`/api/profile?name=${encodeURIComponent(name)}`);
    const d = await r.json();
    if (r.ok) setCreator(d);
  };
  const toggleFollow = async (name: string) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    const r = await fetch("/api/follows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const d = await r.json();
    if (!r.ok) {
      setMessage(d.error || "关注失败");
      return;
    }
    setCreator((current) =>
      current
        ? {
            ...current,
            profile: {
              ...current.profile,
              isFollowing: d.following,
              followerCount: d.followerCount,
            },
          }
        : current,
    );
    await loadFollows();
  };
  const toggleFavorite = async (w: Work) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    const r = await fetch(`/api/works/${w.id}/favorite`, { method: "POST" });
    const d = await r.json();
    if (!r.ok) {
      setMessage(d.error || "收藏失败");
      return;
    }
    setWorks((list) =>
      list.map((x) =>
        x.id === w.id
          ? { ...x, isFavorited: d.favorited, favoriteCount: d.favoriteCount }
          : x,
      ),
    );
    await loadFavorites();
  };
  const changeTab = (next: string) => {
    setTab(next);
    if (next === "我的作品") void loadMine();
    if (next === "我的收藏") void loadFavorites();
    if (next === "我的关注") void loadFollows();
    if (next === "我的粉丝") void loadFollowers();
    if (next === "个人主页") {
      void loadProfile();
      void loadMine();
      void loadFavorites();
      void loadFollows();
    }
  };
  const togglePermission=(permission:string,checked:boolean)=>setForm(f=>{
    const current=new Set(String(f.permissions||"").replace(/[\[\]"]/g,"").split(",").filter(Boolean));
    if(checked)current.add(permission);else current.delete(permission);
    return {...f,permissions:[...current].join(",")};
  });
  const openDocs=(section="sdk-user")=>{changeTab("开发文档");window.setTimeout(()=>document.getElementById(section)?.scrollIntoView({behavior:"smooth"}),0)};
  const handleBrandClick = async () => {
    changeTab("发现功能");
    brandClickCount.current += 1;
    if (brandClickTimer.current) window.clearTimeout(brandClickTimer.current);
    brandClickTimer.current = window.setTimeout(() => { brandClickCount.current = 0; }, 1200);
    if (brandClickCount.current < 3) return;
    brandClickCount.current = 0;
    if (brandClickTimer.current) window.clearTimeout(brandClickTimer.current);
    try {
      const response = await fetch("/api/version", { cache: "no-store" });
      const data = await readApiResponse(response);
      setRevealedVersion(response.ok ? String(data.version || "未知") : "读取失败");
    } catch { setRevealedVersion("读取失败"); }
    window.setTimeout(() => setRevealedVersion(""), 5000);
  };
  const handleVersionClick=()=>{versionClickCount.current+=1;if(versionClickTimer.current)window.clearTimeout(versionClickTimer.current);versionClickTimer.current=window.setTimeout(()=>versionClickCount.current=0,1400);if(versionClickCount.current>=3){versionClickCount.current=0;setShowAdminLogin(true)}};
  const loadAdmin=async()=>{const r=await fetch("/api/admin",{cache:"no-store"});const d=await readApiResponse(r);if(r.ok){setAdminData(d);setAnnouncementDraft(d.announcement?.content||"");setAdminVersion(d.version||"v37");setTab("管理后台")}else setMessage(d.error||"无法进入管理后台")};
  const loginAdmin=async()=>{if(!user)return;const r=await fetch("/api/admin/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({account:user.email,password:adminPassword})});const d=await readApiResponse(r);if(!r.ok){setMessage(d.error||"验证失败");return}setShowAdminLogin(false);setAdminPassword("");await loadAdmin()};
  const adminAction=async(action:"announcement"|"version")=>{const payload=action==="announcement"?{action,content:announcementDraft}:{action,version:adminVersion};const r=await fetch("/api/admin",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const d=await readApiResponse(r);setMessage(r.ok?(action==="announcement"?"公告已发布":"页面版本已更新"):d.error||"操作失败");if(r.ok){if(action==="announcement")setAnnouncement(announcementDraft?{content:announcementDraft}:null);await loadAdmin()}};
  const accountNav = (
    <div className="profile-hub-nav" aria-label="个人中心功能">
      {[
        ["个人主页", "个人资料"],
        ["我的作品", "我的作品"],
        ["我的收藏", "我的收藏"],
        ["我的关注", "我的关注"],
        ["我的粉丝", "我的粉丝"],
      ].map(([key, label]) => (
        <button
          key={key}
          className={tab === key ? "active" : ""}
          onClick={() => changeTab(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
  const loadProfile = async () => {
    if (!user) return;
    const r = await fetch("/api/profile");
    const d = await r.json();
    if (r.ok) setProfile(d.profile);
  };
  const saveProfile = async () => {
    const body = new FormData();
    body.set("displayName", profile.displayName);
    body.set("bio", profile.bio);
    body.set("avatar", profile.avatar);
    const f = avatarRef.current?.files?.[0];
    if (f) body.set("avatarFile", f);
    const r = await fetch("/api/profile", { method: "PUT", body });
    const d = await readApiResponse(r);
    if (r.ok) {
      setProfile({ ...d.profile, avatarUrl: d.profile.avatarUrl ? `${d.profile.avatarUrl}${d.profile.avatarUrl.includes("?") ? "&" : "?"}v=${Date.now()}` : null });
      setAvatarPreview(null);
      if (avatarRef.current) avatarRef.current.value = "";
    }
    setMessage(r.ok ? "个人资料和头像已保存" : d.error || "更新失败");
  };

  const previewPackage=async()=>{
    const file=fileRef.current?.files?.[0];
    if(!file){setMessage("请先选择 ZIP 应用包");return}
    if(file.size>MAX_ZIP_BYTES){setPackageConfirmed(false);setPackageReport("");setMessage("ZIP 不能超过 20MB");return}
    setSaving(true);setMessage("正在上传、检查并生成静态预览…");
    const body=new FormData();body.set("file",file);
    try{
      const r=await fetch("/api/package/validate",{method:"POST",body});
      const d=await readApiResponse(r);
      if(!r.ok)throw new Error(d.error||"ZIP 校验失败");
      setPackageConfirmed(false);
      setPackageReport(`校验通过：${d.fileCount} 个文件，解压后 ${(d.unpackedBytes/1024/1024).toFixed(1)}MB`);
      setMessage("ZIP 校验通过，请检查预览后确认发布");
      setViewerMode(form.windowSize);setMinimized(false);setViewerReady(false);
      setViewer({...form,authorName:user?.displayName||"我",appUrl:d.previewUrl,appHtml:""});
    }catch(error){
      setPackageConfirmed(false);setPackageReport("");
      setMessage(error instanceof Error?error.message:"ZIP 校验失败");
    }finally{setSaving(false)}
  };
  const save = async (status: "draft" | "published") => {
    if (!user) {
      location.href = "/signin-with-chatgpt?return_to=%2F";
      return;
    }
    if (!form.title.trim()) {
      setMessage("请填写作品名称");
      return;
    }
    if (!categories.includes(form.type)) {
      setMessage("请选择作品分类");
      return;
    }
    const file = fileRef.current?.files?.[0];
    if(status==="published"&&packageMode==="zip"&&file&&!packageConfirmed){setMessage("请先生成预览，并确认预览正常后再发布");return}
    if (!file && !form.content.trim() && !form.externalUrl.trim()) {
      setMessage("请在线编写代码、上传 HTML 或填写网页链接");
      return;
    }
    setSaving(true);
    setMessage("");
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.set(k, String(v)));
    body.set("status", status);
    if (file) body.set("file", file);
    const cover = coverRef.current?.files?.[0];
    if (cover) body.set("cover", cover);
    const r = await fetch(form.id ? `/api/works/${form.id}` : "/api/works", {
      method: form.id ? "PUT" : "POST",
      body,
    });
    const d = await readApiResponse(r);
    setSaving(false);
    if (!r.ok) {
      setMessage(d.error || "保存失败");
      return;
    }
    setMessage(
      status === "published"
        ? form.id
          ? "作品已更新"
          : "作品已发布到大家正在玩"
        : form.id
          ? "草稿已更新"
          : "草稿已保存",
    );
    setForm(emptyForm);
    if (fileRef.current) fileRef.current.value = "";
    setPackageConfirmed(false);setPackageReport("");setPackageMode("html");
    if (coverRef.current) coverRef.current.value = "";
    await loadWorks();
    await loadMine();
  };
  const editWork = async (w: Work) => {
    const r = await fetch(`/api/works/${w.id}`);
    const d = await r.json();
    if (!r.ok) {
      setMessage(d.error || "加载失败");
      return;
    }
    setForm({
      id: w.id,
      title: d.work.title,
      type: d.work.type,
      description: d.work.description || "",
      content: d.work.appHtml || d.work.content || "",
      externalUrl: d.work.externalUrl || "",
      windowSize: d.work.windowSize || "desktop",
      windowWidth: d.work.windowWidth || 1200,
      windowHeight: d.work.windowHeight || 800,
      permissions:(()=>{try{const value=JSON.parse(d.work.permissions||'["storage"]');return Array.isArray(value)?value.join(","):"storage"}catch{return String(d.work.permissions||"storage")}})(),
      updateNotes:d.work.updateNotes||"",
    });
    changeTab("创作中心");
  };
  const setStatus = async (w: Work, status: "draft" | "published") => {
    await fetch(`/api/works/${w.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadMine();
    await loadWorks();
  };
  const remove = async (w: Work) => {
    if (!confirm(`确定永久删除“${w.title}”吗？`)) return;
    await fetch(`/api/works/${w.id}`, { method: "DELETE" });
    await loadMine();
    await loadWorks();
  };

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={handleBrandClick}>
          <span className="fish">🐟</span>
          <span>摸鱼箱</span>
        </button>
        {revealedVersion&&<button className="hidden-version" role="status" onClick={handleVersionClick}>当前版本：{revealedVersion}</button>}
        <nav>
          {["发现功能", "创作中心"].map((x) => (
            <button
              key={x}
              className={tab === x ? "active" : ""}
              onClick={() => changeTab(x)}
            >
              {x}
            </button>
          ))}
        </nav>
        <div className="fish-counter">
          <span>今日摸鱼</span>
          <b>{todayFish}</b>
          <small>次</small>
        </div>
        <div className="moyu-timer">
          <i>●</i>
          <span>您已摸鱼</span>
          <b>{moyuTime}</b>
        </div>
        {user ? (
          <>
          <button className="message-entry" onClick={() => void openMessages()} title="消息中心" aria-label="打开消息中心">
            <span>✉</span>{unreadCount > 0 && <i>{unreadCount > 9 ? "9+" : unreadCount}</i>}
          </button>
          <button className={`profile-entry ${["个人主页", "我的作品", "我的收藏", "我的关注", "我的粉丝"].includes(tab) ? "active" : ""}`} onClick={() => changeTab("个人主页")} title="打开个人主页">
            <span className="profile">
              {avatarPreview || profile.avatarUrl ? (
                <img src={avatarPreview || profile.avatarUrl || ""} alt="头像" />
              ) : (
                profile.avatar
              )}
              <span className="online" />
            </span>
            <span className="topbar-identity">
              <b>{profile.displayName || user.displayName}</b>
              <small>{user.email}</small>
            </span>
          </button>
          </>
        ) : (
          <button className="login" onClick={() => setShowLogin(true)}>
            登录 / 注册
          </button>
        )}
      </header>
      {announcement&&<div className="site-announcement"><span>公告</span><p>{announcement.content}</p><button onClick={()=>setAnnouncement(null)} aria-label="关闭公告">×</button></div>}
      <div className="moyu-background" aria-hidden="true">
        <div className="wall-clock">
          <i
            className="hour-hand"
            style={{
              transform: `rotate(${(clockNow.getHours() % 12) * 30 + clockNow.getMinutes() * 0.5}deg)`,
            }}
          />
          <i
            className="minute-hand"
            style={{ transform: `rotate(${clockNow.getMinutes() * 6}deg)` }}
          />
          <i
            className="second-hand"
            style={{ transform: `rotate(${clockNow.getSeconds() * 6}deg)` }}
          />
          <b>12</b>
          <b>3</b>
          <b>6</b>
          <b>9</b>
        </div>
        {["🐟", "🐠", "🐡", "🐟", "🐠", "🐟", "🐡"].map((fish, i) => (
          <button
            key={i}
            className={`swimming-fish fish-${i + 1} ${escapingFish[i] || ""}`}
            onClick={(event) => catchFish(event, i)}
            aria-label="摸鱼一次"
          >
            {fish}
          </button>
        ))}
      </div>
      {tab === "发现功能" && (
        <div className="hero-wall-clock">
          <i
            className="hour-hand"
            style={{
              transform: `rotate(${(clockNow.getHours() % 12) * 30 + clockNow.getMinutes() * 0.5}deg)`,
            }}
          />
          <i
            className="minute-hand"
            style={{ transform: `rotate(${clockNow.getMinutes() * 6}deg)` }}
          />
          <i
            className="second-hand"
            style={{ transform: `rotate(${clockNow.getSeconds() * 6}deg)` }}
          />
          <b>12</b>
          <b>3</b>
          <b>6</b>
          <b>9</b>
        </div>
      )}
      {fishFeedback && (
        <div
          key={fishFeedback.id}
          className="fish-plus-one"
          style={{ left: fishFeedback.x, top: fishFeedback.y }}
        >
          摸鱼次数 +1
        </div>
      )}
      {tab === "开发文档" && <section className="workspace developer-docs-page">
        <div className="docs-page-head"><span className="eyebrow">MOYU DEVELOPER</span><h1>应用能力文档</h1><p>统一查找 MoyuSDK、本地缓存和用户公开信息接入方式。</p><button className="secondary" onClick={()=>changeTab("创作中心")}>返回创作中心</button></div>
        <nav className="docs-toc"><a href="#sdk-user">获取用户信息</a><a href="#sdk-storage">本地缓存</a><a href="#sdk-errors">权限与错误</a></nav>
        <article id="sdk-user"><h2>获取用户公开信息</h2><p>发布或更新作品时先勾选“获取用户公开信息”。平台只提供公开 ID、昵称、头像与登录状态。</p><pre>{`const user = await MoyuSDK.getCurrentUser();
if (user.isLoggedIn) {
  console.log(user.id, user.nickname, user.avatar);
}`}</pre></article>
        <article id="sdk-storage"><h2>本地缓存</h2><p>勾选“本地缓存”后可使用新接口；旧版 MoyuStorage 保持兼容。</p><pre>{`await MoyuSDK.set("progress", { level: 2, score: 100 });
const progress = await MoyuSDK.get("progress");
await MoyuSDK.remove("progress");`}</pre></article>
        <article id="sdk-errors"><h2>权限与错误</h2><p>未勾选能力时返回 <code>PERMISSION_DENIED</code>；SDK 请求超时返回 <code>SDK_TIMEOUT</code>。应用无法获得邮箱、Cookie、Token 或 Session。</p></article>
      </section>}
      {tab === "创作中心" && (
        <aside className="storage-notice">
          <div>
            <span>NEW</span>
            <b>💾 平台本地存档已经开放</b>
            <p>
              小游戏进度、阅读位置和工具设置现在都能保留。发布流程不变，按需调用{" "}
              <code>MoyuStorage</code> 即可。
            </p>
          </div>
          <button onClick={() => openDocs("sdk-storage")}>
            查看接入文档 →
          </button>
        </aside>
      )}
      {tab === "创作中心" && (
        <aside className="size-recommender">
          <div>
            <b>作者推荐窗口</b>
            <p>
              选择常用尺寸，或输入自由宽高。右侧会按统一缩放比例实时展示窗口形状与相对大小。
            </p>
            <div className="size-presets">
              {[
                ["desktop", "桌面", 1200, 800],
                ["tablet", "平板", 820, 720],
                ["mobile", "手机", 390, 760],
                ["mini", "小窗", 520, 420],
              ].map(([key, label, w, h]) => (
                <button
                  key={String(key)}
                  className={form.windowSize === key ? "active" : ""}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      windowSize: String(key),
                      windowWidth: Number(w),
                      windowHeight: Number(h),
                    }))
                  }
                >
                  {String(label)}
                  <small>
                    {String(w)}×{String(h)}
                  </small>
                </button>
              ))}
            </div>
            <div className="custom-dimensions">
              <button
                className={form.windowSize === "custom" ? "active" : ""}
                onClick={() => setForm((f) => ({ ...f, windowSize: "custom" }))}
              >
                自由尺寸
              </button>
              <label>
                宽{" "}
                <input
                  type="number"
                  min="320"
                  max="1600"
                  value={form.windowWidth}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      windowSize: "custom",
                      windowWidth: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <span>×</span>
              <label>
                高{" "}
                <input
                  type="number"
                  min="300"
                  max="1000"
                  value={form.windowHeight}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      windowSize: "custom",
                      windowHeight: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
          </div>
          <div className="size-preview">
            <div
              style={{
                width: form.windowWidth * previewScale,
                height: form.windowHeight * previewScale,
              }}
            >
              <span />
              <b>
                {form.windowWidth} × {form.windowHeight}
              </b>
              <small>{Math.round(previewScale * 100)}% 等比预览</small>
            </div>
          </div>
        </aside>
      )}
      {copyNotice && <div className="copy-success">{copyNotice}</div>}
      {updateAvailable && (
        <button className="update-toast" onClick={() => location.reload()}>
          发现新版本，正在自动刷新… <b>立即刷新</b>
        </button>
      )}

      {tab === "发现功能" && (
        <>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">CREATE WITHOUT LIMITS</span>
              <h1>
                上班摸个鱼，
                <br />
                顺手<span>造点好玩的</span>
              </h1>
              <p>
                不限制题材和类型。游戏、音乐、小说、效率工具，或者从未有人做过的新点子，都可以发布给大家使用。
              </p>
              <div className="search">
                <span>⌕</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索作品、标签或创作者..."
                />
              </div>
              <div className="hero-actions">
                <button
                  className="primary"
                  onClick={() => changeTab("创作中心")}
                >
                  ✎ 自由创作
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    document
                      .getElementById("market")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  ◉ 看看大家的作品
                </button>
              </div>
            </div>
            <div className="hero-art">
              <div className="window">
                <span />
                <span />
                <span />
              </div>
              <div className="sun">☀</div>
              <div className="plant">🪴</div>
              <div className="desk" />
              <div className="laptop">&lt;/&gt;</div>
              <div className="mascot">🐠</div>
              <div className="mug">☕</div>
              <div className="note n1">
                题材不限
                <br />
                自由发挥
              </div>
              <div className="note n2">
                灵感 +1
                <br />
                快乐 × N
              </div>
            </div>
          </section>
          <section className="market" id="market">
            <div className="section-head">
              <div>
                <span className="fire">🔥</span>
                <h2>大家正在玩</h2>
                <em>所有题材</em>
              </div>
              <button onClick={loadWorks}>刷新作品 ↻</button>
            </div>
            <div className="cards">
              {allWorks.map((w, i) => (
                <article
                  className={`card ${["peach", "blue", "cream", "mint", "lavender", "yellow"][i % 6]}`}
                  key={w.id}
                >
                  <div
                    className={`cover ${w.coverUrl ? "has-cover" : ""}`}
                    onClick={() => openWork(w)}
                  >
                    {w.coverUrl && (
                      <img
                        className="work-cover-image"
                        src={w.coverUrl}
                        alt={`${w.title}封面`}
                      />
                    )}
                    <span className="type">{w.type}</span>
                    {w.hasNewVersion&&<span className="new-version-badge">新版本</span>}
                    {!w.coverUrl && (
                      <div className="cover-icon">
                        {["📖", "🕹️", "📰", "🎵", "✨", "🧩"][i % 6]}
                      </div>
                    )}
                    <button className="play">打开使用</button>
                  </div>
                  <div className="card-body">
                    <div>
                      <h3>{w.title}</h3>
                      <p>{w.description}</p>
                      <div className="work-stats">
                        <span>▶ {w.playCount || 0} 次游玩</span>
                        <span>更新于 {formatDate(w.updatedAt)}</span>
                      </div>
                    </div>
                    <button
                      className={`favorite-button ${w.isFavorited ? "on" : ""}`}
                      onClick={() => toggleFavorite(w)}
                      title="收藏作品"
                    >
                      {w.isFavorited ? "♥" : "♡"}
                      <small>{w.favoriteCount || 0}</small>
                    </button>
                  </div>
                  <footer>
                    <button
                      className="author-link"
                      onClick={() => openCreator(w.authorName)}
                    >
                      {w.authorAvatar ? (
                        <img
                          className="avatar-image"
                          src={w.authorAvatar}
                          alt="作者头像"
                        />
                      ) : (
                        <span className="avatar">{w.authorEmoji || "🐟"}</span>
                      )}
                      {w.authorName}
                    </button>
                    <span className="use">可直接运行</span>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === "创作中心" && (
        <section className="workspace studio">
          <div className="studio-intro">
            <span className="eyebrow">FREE CREATOR</span>
            <h1>{form.id ? "编辑作品" : "自由创作台"}</h1>
            <p>题材不限，发布时只需选择一个便于检索的分类。</p>
          </div>
          <div className="editor">
            <div className="editor-head">
              <div>
                <b>{form.id ? "更新现有作品" : "创建新作品"}</b>
                <small>
                  {user
                    ? `创作者：${profile.displayName || user.displayName}`
                    : "登录后才能保存和发布"}
                </small>
              </div>
            </div>
            <label>
              作品名称 <em>必填</em>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </label>
            <label>
              作品分类 <em>必选</em>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
              >
                <option value="">请选择分类</option>
                {categories.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              推荐打开尺寸 <small>用户打开时仍可自由切换</small>
              <select
                value={form.windowSize}
                onChange={(e) =>
                  setForm((f) => ({ ...f, windowSize: e.target.value }))
                }
              >
                <option value="desktop">桌面窗口 1200×800</option>
                <option value="tablet">平板窗口 820×720</option>
                <option value="mobile">手机窗口 390×760</option>
                <option value="mini">小窗 520×420</option>
              </select>
            </label>
            <label>
              作品介绍
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            {form.id>0&&<label>本次更新说明 <small>用户首次打开新版本时会看到</small><textarea value={form.updateNotes} maxLength={1000} placeholder="例如：新增商店功能，优化加载速度…" onChange={e=>setForm(f=>({...f,updateNotes:e.target.value}))}/></label>}
            <fieldset className="sdk-permissions">
              <legend>应用能力授权</legend>
              <div className="permission-row"><input aria-label="启用本地缓存" type="checkbox" checked={String(form.permissions||"").includes("storage")} onChange={e=>togglePermission("storage",e.target.checked)}/><span><b>本地缓存</b><small>提供 MoyuSDK.get/set 和兼容的 MoyuStorage</small></span><button type="button" onClick={()=>openDocs("sdk-storage")}>查看文档</button></div>
              <div className="permission-row"><input aria-label="启用获取用户公开信息" type="checkbox" checked={String(form.permissions||"").includes("user.basic")} onChange={e=>togglePermission("user.basic",e.target.checked)}/><span><b>获取用户公开信息</b><small>仅提供登录状态、公开昵称、头像和匿名公开 ID</small></span><button type="button" onClick={()=>openDocs("sdk-user")}>查看文档</button></div>
            </fieldset>
            <div className="upload-zone">
              <b>作品封面图</b>
              <p>支持 JPG、PNG、WebP 等图片，最大 3MB。</p>
              <input
                className="file"
                ref={coverRef}
                type="file"
                accept="image/*"
              />
            </div>
            <label>
              已有网页链接 <small>选填；填写后打开作品将直接跳转</small>
              <input
                type="url"
                value={form.externalUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, externalUrl: e.target.value }))
                }
                placeholder="https://example.com"
              />
            </label>
            <div className="optional-templates">
              <b>可选起步模板</b>
              <div>
                {starterTemplates.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setForm((f) => ({ ...f, content: t.code }))}
                  >
                    {t.icon} {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="upload-zone package-upload">
              <b>上传应用文件</b>
              <div className="package-tabs">
                <button className={packageMode==="html"?"active":""} onClick={()=>{setPackageMode("html");setPackageConfirmed(false);setPackageReport("");if(fileRef.current)fileRef.current.value=""}}>单文件 HTML</button>
                <button className={packageMode==="zip"?"active":""} onClick={()=>{setPackageMode("zip");setPackageConfirmed(false);setPackageReport("");if(fileRef.current)fileRef.current.value=""}}>ZIP 应用包</button>
              </div>
              {packageMode==="zip"&&<p>ZIP ≤ 20MB，解压后 ≤ 50MB，最多 300 个静态资源文件；根目录必须包含 index.html。</p>}
              <input
                className="file"
                ref={fileRef}
                type="file"
                accept={packageMode==="zip"?".zip,application/zip":".html,text/html"}
                onChange={()=>{setPackageConfirmed(false);setPackageReport("")}}
              />
              {packageMode==="zip"&&<div className="package-validation"><button type="button" onClick={previewPackage} disabled={saving}>检查并生成预览</button>{packageReport&&<><span>{packageReport}</span><label><input type="checkbox" checked={packageConfirmed} onChange={e=>setPackageConfirmed(e.target.checked)}/> 我已确认预览正常，可以正式发布</label></>}</div>}
            </div>
            <label>
              在线编辑 HTML / CSS / JavaScript
              <textarea
                className="code-input"
                spellCheck={false}
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
              />
            </label>
            {message && <div className="toast">{message}</div>}
            <div className="publish-bar">
              {form.id && (
                <button
                  className="secondary"
                  onClick={() => setForm(emptyForm)}
                >
                  取消编辑
                </button>
              )}
              <button
                className="secondary"
                disabled={saving}
                onClick={() => save("draft")}
              >
                保存草稿
              </button>
              <button
                className="preview-btn"
                onClick={() => {
                  if (form.externalUrl) window.open(form.externalUrl, "_blank");
                  else {
                    setViewerMode(form.windowSize);
                    setMinimized(false);
                    setViewer({
                      ...form,
                      authorName: user?.displayName || "我",
                      appHtml: form.content,
                    });
                  }
                }}
              >
                ▶ 预览
              </button>
              <button
                className="primary"
                disabled={saving}
                onClick={() => save("published")}
              >
                {saving ? "正在保存…" : form.id ? "更新并发布" : "发布作品 →"}
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === "我的作品" && (
        <section className="workspace profile-page">
          {accountNav}
          <span className="eyebrow">MY CREATIONS</span>
          <h1>我的作品管理</h1>
          {!user ? (
            <div className="signin-box">
              <span>🔐</span>
              <h2>登录后管理作品</h2>
              <button className="primary" onClick={() => setShowLogin(true)}>
                登录创作
              </button>
            </div>
          ) : (
            <>
              <p>草稿和已发布作品都能编辑更新；公开作品也可以随时隐藏。</p>
              <div className="manage-list">
                {mine.length === 0 ? (
                  <div className="empty">还没有云端作品。</div>
                ) : (
                  mine.map((w, i) => (
                    <article key={w.id}>
                      {w.coverUrl ? (
                        <img
                          className="work-cover-thumb"
                          src={w.coverUrl}
                          alt={`${w.title}封面`}
                        />
                      ) : (
                        <span className="work-icon">
                          {["📖", "🕹️", "🎵", "🛠️", "✨"][i % 5]}
                        </span>
                      )}
                      <div>
                        <h3>{w.title}</h3>
                        <p>{w.description || "暂无介绍"}</p>
                        <small>
                          {w.status === "published"
                            ? "● 公开展示中"
                            : "○ 草稿 / 已隐藏"}{" "}
                          · {w.type}
                        </small>
                      </div>
                      <div className="manage-actions">
                        <button onClick={() => openWork(w)}>运行</button>
                        <button onClick={() => editWork(w)}>编辑 / 更新</button>
                        {w.status === "published" ? (
                          <button onClick={() => setStatus(w, "draft")}>
                            隐藏
                          </button>
                        ) : (
                          <button onClick={() => setStatus(w, "published")}>
                            重新发布
                          </button>
                        )}
                        <button className="danger" onClick={() => remove(w)}>
                          永久删除
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      )}

      {tab === "我的收藏" && (
        <section className="workspace profile-page">
          {accountNav}
          <span className="eyebrow">MY FAVORITES</span>
          <h1>我的收藏</h1>
          {!user ? (
            <div className="signin-box">
              <span>♡</span>
              <h2>登录后查看收藏</h2>
              <button className="primary" onClick={() => setShowLogin(true)}>
                登录
              </button>
            </div>
          ) : favoriteWorks.length === 0 ? (
            <div className="empty">还没有收藏作品，去广场逛逛吧。</div>
          ) : (
            <div className="cards compact">
              {favoriteWorks.map((w, i) => (
                <article
                  className={`card ${["peach", "blue", "cream", "mint"][i % 4]}`}
                  key={w.id}
                >
                  <div
                    className={`cover ${w.coverUrl ? "has-cover" : ""}`}
                    onClick={() => openWork(w)}
                  >
                    {w.coverUrl && (
                      <img
                        className="work-cover-image"
                        src={w.coverUrl}
                        alt={`${w.title}封面`}
                      />
                    )}
                    <span className="type">{w.type}</span>
                    {!w.coverUrl && (
                      <div className="cover-icon">
                        {["🛠️", "🕹️", "💬", "🎵", "✨"][i % 5]}
                      </div>
                    )}
                    <button className="play">打开使用</button>
                  </div>
                  <div className="card-body">
                    <div>
                      <h3>{w.title}</h3>
                      <p>{w.description}</p>
                      <div className="work-stats">
                        <span>▶ {w.playCount || 0}</span>
                        <span>♥ {w.favoriteCount || 0}</span>
                        <span>{formatDate(w.updatedAt)}</span>
                      </div>
                    </div>
                    <button
                      className="favorite-button on"
                      onClick={() => toggleFavorite(w)}
                    >
                      ♥
                    </button>
                  </div>
                  <footer>
                    <button
                      className="author-link"
                      onClick={() => openCreator(w.authorName)}
                    >
                      {w.authorAvatar ? (
                        <img
                          className="avatar-image"
                          src={w.authorAvatar}
                          alt="作者头像"
                        />
                      ) : (
                        <span className="avatar">{w.authorEmoji || "🐟"}</span>
                      )}
                      {w.authorName}
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "我的关注" && (
        <section className="workspace profile-page">
          {accountNav}
          <span className="eyebrow">FOLLOWING</span>
          <h1>我的关注</h1>
          {!user ? (
            <div className="signin-box">
              <span>👥</span>
              <h2>登录后查看关注的创作者</h2>
              <button className="primary" onClick={() => setShowLogin(true)}>
                登录
              </button>
            </div>
          ) : followedCreators.length === 0 ? (
            <div className="empty">暂时还没有关注创作者。</div>
          ) : (
            <div className="following-grid">
              {followedCreators.map((p) => (
                <article key={p.displayName}>
                  <button
                    className="following-avatar"
                    onClick={() => openCreator(p.displayName)}
                  >
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="头像" />
                    ) : (
                      <span>{p.avatar}</span>
                    )}
                  </button>
                  <div>
                    <h3>{p.displayName}</h3>
                    <p>{p.bio}</p>
                    <small>{p.workCount || 0} 个公开作品</small>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => toggleFollow(p.displayName)}
                  >
                    已关注
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "我的粉丝"&&<section className="workspace profile-page">{accountNav}<span className="eyebrow">FOLLOWERS</span><h1>我的粉丝</h1>{followers.length===0?<div className="empty">暂时还没有粉丝。</div>:<div className="following-grid">{followers.map(person=><article key={person.account}><button className="following-avatar" onClick={()=>void openCreator(person.displayName)}>{person.avatarUrl?<img src={person.avatarUrl} alt="头像"/>:<span>{person.avatar}</span>}</button><div><h3>{person.displayName}</h3><p>{person.bio||person.account}</p><small>{person.account}</small></div><button className="secondary" onClick={()=>void openCreator(person.displayName)}>查看资料</button></article>)}</div>}</section>}

      {tab === "个人主页" && (
        <section className="workspace profile-page">
          {accountNav}
          {user && (
            <>
              <div className="profile-hero">
                <div className="profile-identity">
                  <div className="avatar-editor">
                    {avatarPreview || profile.avatarUrl ? (
                      <img src={avatarPreview || profile.avatarUrl || ""} alt="头像" />
                    ) : (
                      <span>{profile.avatar}</span>
                    )}
                    <label className="avatar-upload">
                      更换头像
                      <input ref={avatarRef} type="file" accept="image/*" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) {
                          setMessage("头像须为不超过 3MB 的图片");
                          event.target.value = "";
                          return;
                        }
                        setAvatarPreview((previous) => {
                          if (previous) URL.revokeObjectURL(previous);
                          return URL.createObjectURL(file);
                        });
                        setMessage("新头像已预览，点击保存个人资料即可生效");
                      }} />
                    </label>
                  </div>
                </div>
                <div className="profile-form">
                  <div className="profile-form-head">
                    <div>
                      <span className="eyebrow">PERSONAL PROFILE</span>
                      <h2>个人资料</h2>
                    </div>
                    <div className="account-badge">
                      <small>账号</small>
                      <b>{user.email}</b>
                    </div>
                  </div>
                  <label className="profile-field">
                    <span>用户名</span>
                  <input
                    className="profile-name"
                    value={profile.displayName}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, displayName: e.target.value }))
                    }
                  />
                  </label>
                  <label className="profile-field">
                    <span>个人简介</span>
                  <textarea
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, bio: e.target.value }))
                    }
                  />
                  </label>
                  <button className="primary" onClick={saveProfile}>
                    保存个人资料
                  </button>
                  {message && <div className="toast">{message}</div>}
                </div>
              </div>
              <h2 className="profile-title">我的公开作品</h2>
              <div className="cards compact">
                {mine
                  .filter((w) => w.status === "published")
                  .map((w, i) => (
                    <article
                      className={`card ${["peach", "blue", "cream"][i % 3]}`}
                      key={w.id}
                      onClick={() => openWork(w)}
                    >
                      <div className={`cover ${w.coverUrl ? "has-cover" : ""}`}>
                        {w.coverUrl && (
                          <img
                            className="work-cover-image"
                            src={w.coverUrl}
                            alt={`${w.title}封面`}
                          />
                        )}
                        <div className="cover-icon">✦</div>
                      </div>
                      <div className="card-body">
                        <div>
                          <h3>{w.title}</h3>
                          <p>{w.description}</p>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
            </>
          )}
        </section>
      )}

      {tab==="管理后台"&&adminData&&<section className="workspace admin-console"><div className="admin-head"><div><span className="eyebrow">ADMIN CONSOLE</span><h1>摸鱼箱管理后台</h1><p>管理员：{adminData.admin}</p></div><button className="secondary" onClick={async()=>{await fetch("/api/admin/auth",{method:"DELETE"});setAdminData(null);changeTab("发现功能")}}>退出管理</button></div><div className="admin-stats">{[["注册用户",adminData.stats.users],["全部作品",adminData.stats.works],["已发布作品",adminData.stats.published],["作品打开次数",adminData.stats.plays],["私信总数",adminData.stats.messages],["收藏关系",adminData.stats.favorites],["关注关系",adminData.stats.follows]].map(([label,value])=><article key={String(label)}><small>{label}</small><b>{value}</b></article>)}</div><div className="admin-panels"><article><span className="eyebrow">ANNOUNCEMENT</span><h2>发布全站公告</h2><p>发布新公告会自动替换上一条；留空保存可撤下公告。</p><textarea value={announcementDraft} maxLength={500} onChange={e=>setAnnouncementDraft(e.target.value)} placeholder="输入需要向所有用户展示的公告…"/><button className="primary" onClick={()=>void adminAction("announcement")}>{announcementDraft?"发布公告":"撤下公告"}</button></article><article><span className="eyebrow">VERSION</span><h2>更新页面版本</h2><p>版本号将用于隐藏入口展示和页面更新检测。</p><input value={adminVersion} onChange={e=>setAdminVersion(e.target.value)} placeholder="v37"/><button className="primary" onClick={()=>void adminAction("version")}>更新版本号</button></article></div>{message&&<div className="toast">{message}</div>}</section>}

      {showAdminLogin&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setShowAdminLogin(false)}><section className="modal admin-login"><button className="close" onClick={()=>setShowAdminLogin(false)}>×</button><span className="eyebrow">ADMIN ACCESS</span><h2>管理员验证</h2><p>请输入当前账号和管理员密码。</p><label>账号<input value={user?.email||""} disabled/></label><label>密码<input type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void loginAdmin()} autoFocus/></label>{message&&<div className="toast">{message}</div>}<button className="primary" onClick={()=>void loginAdmin()}>进入管理后台</button></section></div>}

      {showMessages && (
        <div className="message-drawer-backdrop" onClick={() => setShowMessages(false)}>
          <aside className="message-drawer" onClick={(event) => event.stopPropagation()} aria-label="消息中心">
            <header><div><span className="eyebrow">NOTIFICATIONS</span><h2>消息中心</h2></div><button onClick={() => setShowMessages(false)} aria-label="关闭">×</button></header>
            <div className="message-tabs"><button className={messageTab==="notices"?"active":""} onClick={()=>setMessageTab("notices")}>动态提醒</button><button className={messageTab==="chats"?"active":""} onClick={()=>setMessageTab("chats")}>私信</button></div>
            {messageTab==="notices"?<div className="message-list">
              {notifications.length ? notifications.map((item) => (
                <button key={item.id} className="message-card" onClick={() => {
                  if(item.kind==="direct-message"&&item.account){void openChat({account:item.account,displayName:item.actorName||item.account,avatar:"🐟"});return}
                  if (item.workId) {
                    const work = works.find((candidate) => candidate.id === item.workId);
                    if (work) void openWork(work);
                  } else if (item.actorName) void openCreator(item.actorName);
                  setShowMessages(false);
                }}>
                  <span className={`message-kind ${item.kind}`}>{item.kind === "work-update" ? "↻" : item.kind==="direct-message"?"✉":"+"}</span>
                  <span><b>{item.title}</b><small>{item.detail}</small><time>{formatDate(item.createdAt)}</time></span>
                </button>
              )) : <div className="message-empty"><span>🐟</span><b>暂时没有新消息</b><small>有新动态时，小鱼会来提醒你</small></div>}
            </div>:<div className="chat-panel">
              {chatTarget&&<button className="chat-peer-card" onClick={()=>{setShowMessages(false);void openCreator(chatTarget.displayName)}}><span className="chat-avatar">{chatTarget.avatarUrl?<img src={chatTarget.avatarUrl} alt="头像"/>:chatTarget.avatar}</span><span><b>{chatTarget.displayName}</b><small>{chatTarget.account}</small></span><em>查看资料</em></button>}
              {!chatTarget?<><div className="user-search"><input value={userSearch} onChange={e=>setUserSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void searchUsers()} placeholder="输入用户名或账号查找用户"/><button onClick={()=>void searchUsers()}>查找</button></div>{userResults.length>0&&<><h3 className="conversation-heading">查找结果 · 点击查看用户卡片</h3><div className="conversation-list search-results">{userResults.map(person=><button key={person.account} onClick={()=>{setShowMessages(false);void openCreator(person.displayName)}}><span className="chat-avatar">{person.avatarUrl?<img src={person.avatarUrl} alt=""/>:person.avatar}</span><span><b>{person.displayName}</b><small>{person.account}</small></span><em>查看资料</em></button>)}</div></>}<h3 className="conversation-heading">最近私信</h3><div className="conversation-list">{conversations.map(person=><button key={person.account} onClick={()=>void openChat(person)}><span className="chat-avatar">{person.avatarUrl?<img src={person.avatarUrl} alt=""/>:person.avatar}</span><span><b>{person.displayName}</b><small>{person.account}</small>{person.content&&<em>{person.content}</em>}</span>{!!person.unreadCount&&<i>{person.unreadCount}</i>}</button>)}</div></>:<><button className="chat-back" onClick={()=>setChatTarget(null)}>← 返回会话</button><div className="chat-with"><b>{chatTarget.displayName}</b><small>{chatTarget.account}</small></div><div className="chat-messages">{chatMessages.map(item=><div key={item.id} className={item.senderEmail===user?.email?"mine":"theirs"}><span>{item.content}</span><small>{new Date(item.createdAt).toLocaleString("zh-CN")}</small></div>)}</div><div className="chat-compose"><textarea value={chatDraft} maxLength={1000} onChange={e=>setChatDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void sendChat()}}} placeholder="输入私信，Enter 发送"/><button onClick={()=>void sendChat()}>发送</button></div></>}
            </div>}
          </aside>
        </div>
      )}

      {creator && (
        <div
          className="overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setCreator(null)}
        >
          <section className="modal creator-modal">
            <button className="close" onClick={() => setCreator(null)}>
              ×
            </button>
            <div className="public-profile">
              <div className="creator-avatar-status">
              {creator.profile.avatarUrl ? (
                <img
                  className="creator-avatar-image"
                  src={creator.profile.avatarUrl}
                  alt="头像"
                />
              ) : (
                <span>{creator.profile.avatar}</span>
              )}
                <i className={creator.profile.isOnline?"online":"offline"} title={creator.profile.isOnline?"在线":"离线"}/>
              </div>
              <h2>{creator.profile.displayName}</h2>
              <p>{creator.profile.bio}</p>
              <small>{creator.profile.followerCount || 0} 位关注者</small>
              <div className="creator-today-stats"><span>🐟 今日摸鱼 <b>{creator.profile.todayFishCount||0}</b> 次</span><span>⏱ 今日时长 <b>{formatDuration(creator.profile.todayFishSeconds||0)}</b></span></div>
              {!creator.profile.isSelf && (
                <button className="secondary" onClick={()=>{const account=(creator.profile as any).account;if(account){setCreator(null);setShowMessages(true);void openChat({account,displayName:creator.profile.displayName,avatar:creator.profile.avatar,avatarUrl:creator.profile.avatarUrl})}}}>私信</button>
              )}
              {!creator.profile.isSelf && (
                <button
                  className={`follow-button ${creator.profile.isFollowing ? "following" : ""}`}
                  onClick={() => toggleFollow(creator.profile.displayName)}
                >
                  {creator.profile.isFollowing ? "✓ 已关注" : "＋ 关注"}
                </button>
              )}
            </div>
            <div className="creator-works">
              {creator.works.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setCreator(null);
                    void openWork(w);
                  }}
                >
                  <b>{w.title}</b>
                  <small>{w.type || "自由创作"}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {releaseNotes&&<div className="overlay release-overlay"><section className="modal release-modal"><span className="eyebrow">WHAT'S NEW</span><h2>《{releaseNotes.title}》已更新</h2><p>{releaseNotes.updateNotes}</p><button className="primary" onClick={()=>setReleaseNotes(null)}>知道了，开始体验</button></section></div>}
      {showStorageDocs && (
        <div
          className="overlay"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setShowStorageDocs(false)
          }
        >
          <section className="modal storage-docs">
            <button className="close" onClick={() => setShowStorageDocs(false)}>
              ×
            </button>
            <span className="eyebrow">DEVELOPER GUIDE</span>
            <h2>MoyuSDK 应用能力接入</h2>
            <p>
              平台会在作品运行时自动提供 <code>window.MoyuStorage</code>
              。无需申请权限、无需连接数据库，也不会改变上传与发布步骤。
            </p>
            <div className="docs-grid">
              <article>
                <b>获取用户公开信息</b>
                <pre>{`const user = await MoyuSDK.getCurrentUser();

if (user.isLoggedIn) {
  console.log(user.id, user.nickname, user.avatar);
} else {
  console.log("游客");
}`}</pre>
                <small>发布或更新时需勾选“获取用户公开信息”。不会提供邮箱、Cookie、Token 或权限字段。</small>
              </article>
              <article>
                <b>保存与读取</b>
                <pre>{`await MoyuStorage.set("progress", {\n  level: 2,\n  score: 100\n});\n\nconst data = await MoyuStorage.get("progress");`}</pre>
              </article>
              <article>
                <b>新的 MoyuSDK 缓存接口</b>
                <pre>{`await MoyuSDK.set("progress", { level: 2 });
const progress = await MoyuSDK.get("progress");
await MoyuSDK.remove("progress");`}</pre>
                <small>旧版 MoyuStorage.get/set 继续兼容。</small>
              </article>
              <article>
                <b>其他操作</b>
                <pre>{`await MoyuStorage.remove("progress");\nawait MoyuStorage.clear();\nconst keys = await MoyuStorage.keys();`}</pre>
              </article>
            </div>
            <ul>
              <li>每个作品拥有独立空间，不能读取其他作品的数据。</li>
              <li>每个作品最多 1MB，单条最大 100KB，最多 100 个键。</li>
              <li>支持 JSON 对象、数组、字符串、数字、布尔值和 null。</li>
              <li>
                第一版保存在当前浏览器；清除浏览器数据或更换设备后不会同步。
              </li>
              <li>不需要存档的作品无需修改任何代码。</li>
            </ul>
            <div className="docs-actions">
              <button className="secondary" onClick={copyStorageExample}>
                复制接入示例
              </button>
              <button
                className="primary"
                onClick={() => setShowStorageDocs(false)}
              >
                我知道了
              </button>
            </div>
          </section>
        </div>
      )}
      {showLogin && !user && (
        <div className="overlay">
          <section className="modal login-modal">
            <button className="close" onClick={() => setShowLogin(false)}>
              ×
            </button>
            <span className="fish">🐟</span>
            <h2>登录摸鱼箱</h2>
            <p>登录后可创作、保存草稿、发布作品和管理个人主页。</p>
            <a
              className="auth-button chatgpt"
              href="/signin-with-chatgpt?return_to=%2F"
            >
              使用 ChatGPT 登录
            </a>
            <a
              className="auth-button google"
              href="/signin-with-chatgpt?return_to=%2F"
            >
              使用 Google 账号登录
            </a>
            <small>Google 账号通过安全的 ChatGPT 账号登录流程完成验证。</small>
          </section>
        </div>
      )}
      {viewer && (
        <>
          <div
            className={`overlay app-overlay ${minimized ? "window-hidden" : ""}`}
            style={minimized ? { display: "none" } : undefined}
            onMouseDown={(e) => e.target === e.currentTarget && setViewer(null)}
          >
            <section
              className={`modal app-modal mode-${viewerMode}`}
              style={
                viewerMode === "custom"
                  ? {
                      width: `min(${viewer.windowWidth || 1200}px,96vw)`,
                      height: `min(${viewer.windowHeight || 800}px,94vh)`,
                    }
                  : undefined
              }
            >
              <div className="app-toolbar">
                <div className="traffic-lights">
                  <button onClick={() => setViewer(null)} title="关闭" />
                  <button onClick={minimizeViewer} title="最小化" />
                  <button onClick={() => setViewerMode("full")} title="全屏" />
                </div>
                <div className="app-identity">
                  <span>✦</span>
                  <div>
                    <b>{viewer.title}</b>
                    <small>{viewer.authorName} · 本地存档已开启</small>
                  </div>
                </div>
                <div className="window-sizes">
                  <button
                    className={viewerMode === "mobile" ? "active" : ""}
                    onClick={() => setViewerMode("mobile")}
                  >
                    手机
                  </button>
                  <button
                    className={viewerMode === "tablet" ? "active" : ""}
                    onClick={() => setViewerMode("tablet")}
                  >
                    平板
                  </button>
                  <button
                    className={viewerMode === "mini" ? "active" : ""}
                    onClick={() => setViewerMode("mini")}
                  >
                    小窗
                  </button>
                  <button
                    className={viewerMode === "desktop" ? "active" : ""}
                    onClick={() => setViewerMode("desktop")}
                  >
                    桌面
                  </button>
                  <button
                    className={viewerMode === "custom" ? "active" : ""}
                    onClick={() => setViewerMode("custom")}
                  >
                    作者推荐
                  </button>
                  <button onClick={() => setViewerMode("full")}>全屏</button>
                </div>
                <div className="app-toolbar-actions">
                  <button onClick={clearViewerStorage}>清除存档</button>
                  <button onClick={minimizeViewer}>—</button>
                  <button onClick={() => setViewer(null)}>×</button>
                </div>
              </div>
              <iframe
                ref={appFrameRef}
                className={`app-frame ${viewer.appUrl&&!viewerReady?"loading":""}`}
                title={viewer.title}
                sandbox="allow-scripts allow-same-origin"
                src={viewer.appUrl||undefined}
                srcDoc={viewer.appUrl?undefined:withSdkBridge(viewer.appHtml || viewer.content || "<h1>作品暂无内容</h1>")}
                onLoad={()=>setViewerReady(true)}
              />
              {viewer.appUrl&&!viewerReady&&<div className="app-loading" role="status" aria-live="polite">
                <div className="loading-aquarium" aria-hidden="true"><span className="loading-fish">🐟</span><i/><i/><i/></div>
                <b>正在把应用捞上来…</b>
                <span>首次打开会准备图片与本地存档</span>
                <div className="loading-current"><em/></div>
              </div>}
              <div className="resize-hint">拖动右下角自由调整</div>
            </section>
          </div>
          {minimized && (
            <button
              className="minimized-app"
              onClick={() => setMinimized(false)}
            >
              <span>✦</span>
              <div>
                <b>{viewer.title}</b>
                <small>点击恢复应用</small>
              </div>
            </button>
          )}
        </>
      )}
      <div className="minimized-app-stack" aria-label="已最小化应用">
        {minimizedApps.map(work=><div className="minimized-app-item" key={work.id}>
          <button onClick={()=>restoreMinimized(work)}><span>✨</span><div><b>{work.title}</b><small>点击恢复应用</small></div></button>
          <button className="minimized-close" onClick={()=>setMinimizedApps(list=>list.filter(x=>x.id!==work.id))} aria-label={`关闭${work.title}`}>×</button>
          <iframe title={`${work.title}后台运行`} sandbox="allow-scripts allow-same-origin" src={work.appUrl||undefined} srcDoc={work.appUrl?undefined:withSdkBridge(work.appHtml||work.content||"")} />
        </div>)}
      </div>
    </main>
  );
}
