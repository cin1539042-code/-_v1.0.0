"use client";

import { useEffect, useRef, useState } from "react";

type User = { displayName:string; email:string } | null;
type Work = { id:number; type:string; title:string; description:string; authorName:string; status?:string; content?:string; appHtml?:string; externalUrl?:string|null; coverUrl?:string|null };
type Profile = { displayName:string; bio:string; avatar:string; avatarUrl?:string|null };
const categories=["工具","娱乐","聊天","影音","其他"];
const STORAGE_CHANNEL="moyu-storage-v1";
const STORAGE_LIMIT=1024*1024;
const storageBridge=`<script>(function(){var seq=0,pending=new Map();function call(action,key,value){return new Promise(function(resolve,reject){var id=++seq;pending.set(id,{resolve:resolve,reject:reject});parent.postMessage({channel:'${STORAGE_CHANNEL}',id:id,action:action,key:key,value:value},'*');setTimeout(function(){if(pending.has(id)){pending.delete(id);reject(new Error('存档请求超时'))}},5000)})}window.addEventListener('message',function(e){var m=e.data;if(!m||m.channel!=='${STORAGE_CHANNEL}'||!m.response)return;var p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.ok?p.resolve(m.value):p.reject(new Error(m.error||'存档失败'))});window.MoyuStorage={set:function(k,v){return call('set',k,v)},get:function(k){return call('get',k)},remove:function(k){return call('remove',k)},clear:function(){return call('clear')},keys:function(){return call('keys')}};window.dispatchEvent(new Event('moyu-storage-ready'))})();<\/script>`;
const withStorageBridge=(html:string)=>html.includes(STORAGE_CHANNEL)?html:html.includes("</head>")?html.replace("</head>",storageBridge+"</head>"):storageBridge+html;

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
  {name:"空白应用",icon:"✦",code:blankApp},
  {name:"点击互动",icon:"🎮",code:blankApp.replace("从这里开始自由创作","点击互动作品").replace("作品运行成功！","你完成了一次互动！")},
  {name:"内容展示",icon:"📰",code:blankApp.replace("从这里开始自由创作","我的内容空间").replace("你可以修改全部 HTML、CSS 和 JavaScript。","在这里自由展示文章、音乐、图片或任何创意。")},
];

export default function CommunityApp({user}:{user:User}) {
  const ownerName = "peng zhang";
  const official:Work[] = [
    {id:-1,type:"小说",title:"午后小说馆",description:"沉浸阅读，治愈时光。",authorName:ownerName},
    {id:-2,type:"游戏",title:"像素摸鱼大作战",description:"三分钟一局，快乐加倍。",authorName:ownerName},
    {id:-3,type:"资讯",title:"今日新闻窗",description:"轻松掌握每日趣闻。",authorName:ownerName},
  ];
  const [tab,setTab]=useState("发现功能");
  const [query,setQuery]=useState("");
  const [works,setWorks]=useState<Work[]>([]);
  const [mine,setMine]=useState<Work[]>([]);
  const [viewer,setViewer]=useState<Work|null>(null);
  const [creator,setCreator]=useState<{profile:Profile;works:Work[]}|null>(null);
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);
  const emptyForm={id:0,title:"",type:"",description:"",content:"",externalUrl:""};
  const [form,setForm]=useState(emptyForm);
  const [profile,setProfile]=useState<Profile>({displayName:ownerName,bio:"这个人正在认真摸鱼和创造。",avatar:"🐟"});
  const fileRef=useRef<HTMLInputElement>(null);
  const coverRef=useRef<HTMLInputElement>(null);
  const avatarRef=useRef<HTMLInputElement>(null);
  const appFrameRef=useRef<HTMLIFrameElement>(null);
  const [category,setCategory]=useState("全部");
  const [showLogin,setShowLogin]=useState(!user);
  const [moyuSeconds,setMoyuSeconds]=useState(0);
  const moyuTime=[Math.floor(moyuSeconds/3600),Math.floor(moyuSeconds%3600/60),moyuSeconds%60].map(x=>String(x).padStart(2,"0")).join(":");

  const loadWorks=async()=>{const r=await fetch("/api/works");const d=await r.json();if(r.ok)setWorks(d.works)};
  const loadMine=async()=>{if(!user)return;const r=await fetch("/api/works?mine=1");const d=await r.json();if(r.ok)setMine(d.works)};
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void loadWorks();if(user){void loadProfile();void loadMine()}},[]);
  useEffect(()=>{const timer=window.setInterval(()=>setMoyuSeconds(x=>x+1),1000);return()=>window.clearInterval(timer)},[]);
  useEffect(()=>{if(!viewer)return;const workId=viewer.id||`preview-${form.title||"untitled"}`;const prefix=`moyu:work:${workId}:`;const onMessage=(event:MessageEvent)=>{if(event.source!==appFrameRef.current?.contentWindow)return;const m=event.data;if(!m||m.channel!==STORAGE_CHANNEL||m.response)return;const reply=(ok:boolean,value?:unknown,error?:string)=>appFrameRef.current?.contentWindow?.postMessage({channel:STORAGE_CHANNEL,response:true,id:m.id,ok,value,error},"*");try{const key=String(m.key||"");if(key.length>100)throw new Error("存档键不能超过100个字符");if(m.action==="get")reply(true,JSON.parse(localStorage.getItem(prefix+key)||"null"));else if(m.action==="keys")reply(true,Object.keys(localStorage).filter(k=>k.startsWith(prefix)).map(k=>k.slice(prefix.length)));else if(m.action==="remove"){localStorage.removeItem(prefix+key);reply(true,true)}else if(m.action==="clear"){Object.keys(localStorage).filter(k=>k.startsWith(prefix)).forEach(k=>localStorage.removeItem(k));reply(true,true)}else if(m.action==="set"){const encoded=JSON.stringify(m.value);if(encoded.length>100*1024)throw new Error("单条存档不能超过100KB");const entries=Object.keys(localStorage).filter(k=>k.startsWith(prefix)&&k!==prefix+key);if(!localStorage.getItem(prefix+key)&&entries.length>=100)throw new Error("每个作品最多保存100个键");const total=entries.reduce((n,k)=>n+(localStorage.getItem(k)?.length||0),0)+encoded.length;if(total>STORAGE_LIMIT)throw new Error("本作品存档已达到1MB上限");localStorage.setItem(prefix+key,encoded);reply(true,true)}else throw new Error("不支持的存档操作")}catch(e){reply(false,undefined,e instanceof Error?e.message:"存档失败")}};window.addEventListener("message",onMessage);return()=>window.removeEventListener("message",onMessage)},[viewer]);
  const clearViewerStorage=()=>{if(!viewer)return;const prefix=`moyu:work:${viewer.id||`preview-${form.title||"untitled"}`}:`;Object.keys(localStorage).filter(k=>k.startsWith(prefix)).forEach(k=>localStorage.removeItem(k));setMessage(`已清除“${viewer.title}”在本设备上的存档`)};
  const allWorks=[...official,...works].filter(w=>(category==="全部"||w.type===category)&&`${w.title}${w.description}${w.type}${w.authorName}`.toLowerCase().includes(query.toLowerCase()));

  const openWork=async(w:Work)=>{if(w.externalUrl){window.open(w.externalUrl,"_blank","noopener,noreferrer");return}if(w.id<0){setViewer({...w,appHtml:blankApp.replace("从这里开始自由创作",w.title)});return}const r=await fetch(`/api/works/${w.id}`);const d=await r.json();if(r.ok){if(d.work.externalUrl)window.open(d.work.externalUrl,"_blank","noopener,noreferrer");else setViewer(d.work)}else setMessage(d.error||"加载失败")};
  const openCreator=async(name:string)=>{if(name===ownerName){setCreator({profile,works:[...official,...works.filter(w=>w.authorName===name)]});return}const r=await fetch(`/api/profile?name=${encodeURIComponent(name)}`);const d=await r.json();if(r.ok)setCreator(d)};
  const changeTab=(next:string)=>{setTab(next);if(next==="我的作品")void loadMine();if(next==="个人主页")void loadProfile()};
  const loadProfile=async()=>{if(!user)return;const r=await fetch("/api/profile");const d=await r.json();if(r.ok)setProfile(d.profile)};
  const saveProfile=async()=>{const body=new FormData();body.set("displayName",profile.displayName);body.set("bio",profile.bio);body.set("avatar",profile.avatar);const f=avatarRef.current?.files?.[0];if(f)body.set("avatarFile",f);const r=await fetch("/api/profile",{method:"PUT",body});const d=await r.json();if(r.ok)setProfile(d.profile);setMessage(r.ok?"个人资料和头像已保存":d.error||"更新失败")};

  const save=async(status:"draft"|"published")=>{
    if(!user){location.href="/signin-with-chatgpt?return_to=%2F";return}
    if(!form.title.trim()){setMessage("请填写作品名称");return}if(!categories.includes(form.type)){setMessage("请选择作品分类");return}
    const file=fileRef.current?.files?.[0];
    if(!file&&!form.content.trim()&&!form.externalUrl.trim()){setMessage("请在线编写代码、上传 HTML 或填写网页链接");return}
    setSaving(true);setMessage("");const body=new FormData();Object.entries(form).forEach(([k,v])=>body.set(k,String(v)));body.set("status",status);if(file)body.set("file",file);const cover=coverRef.current?.files?.[0];if(cover)body.set("cover",cover);
    const r=await fetch(form.id?`/api/works/${form.id}`:"/api/works",{method:form.id?"PUT":"POST",body});const d=await r.json();setSaving(false);
    if(!r.ok){setMessage(d.error||"保存失败");return}setMessage(status==="published"?(form.id?"作品已更新":"作品已发布到大家正在玩"):(form.id?"草稿已更新":"草稿已保存"));setForm(emptyForm);if(fileRef.current)fileRef.current.value="";if(coverRef.current)coverRef.current.value="";await loadWorks();await loadMine();
  };
  const editWork=async(w:Work)=>{const r=await fetch(`/api/works/${w.id}`);const d=await r.json();if(!r.ok){setMessage(d.error||"加载失败");return}setForm({id:w.id,title:d.work.title,type:d.work.type,description:d.work.description||"",content:d.work.appHtml||d.work.content||"",externalUrl:d.work.externalUrl||""});changeTab("创作中心")};
  const setStatus=async(w:Work,status:"draft"|"published")=>{await fetch(`/api/works/${w.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status})});await loadMine();await loadWorks()};
  const remove=async(w:Work)=>{if(!confirm(`确定永久删除“${w.title}”吗？`))return;await fetch(`/api/works/${w.id}`,{method:"DELETE"});await loadMine();await loadWorks()};

  return <main>
    <header className="topbar"><button className="brand" onClick={()=>changeTab("发现功能")}><span className="fish">🐟</span><span>摸鱼开发广场</span></button><nav>{["发现功能","创作中心","我的作品"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>changeTab(x)}>{x}</button>)}</nav><div className="moyu-timer"><i>●</i><span>您已摸鱼</span><b>{moyuTime}</b></div>{user?<button className="profile" onClick={()=>changeTab("个人主页")} title="打开个人主页">{profile.avatarUrl?<img src={profile.avatarUrl} alt="头像"/>:profile.avatar}<span className="online"/></button>:<button className="login" onClick={()=>setShowLogin(true)}>登录 / 注册</button>}</header>

    {tab==="发现功能"&&<><section className="hero"><div className="hero-copy"><span className="eyebrow">CREATE WITHOUT LIMITS</span><h1>上班摸个鱼，<br/>顺手<span>造点好玩的</span></h1><p>不限制题材和类型。游戏、音乐、小说、效率工具，或者从未有人做过的新点子，都可以发布给大家使用。</p><div className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索作品、标签或创作者..."/></div><div className="hero-actions"><button className="primary" onClick={()=>changeTab("创作中心")}>✎ 自由创作</button><button className="secondary" onClick={()=>document.getElementById("market")?.scrollIntoView({behavior:"smooth"})}>◉ 看看大家的作品</button></div></div><div className="hero-art"><div className="window"><span/><span/><span/></div><div className="sun">☀</div><div className="plant">🪴</div><div className="desk"/><div className="laptop">&lt;/&gt;</div><div className="mascot">🐠</div><div className="mug">☕</div><div className="note n1">题材不限<br/>自由发挥</div><div className="note n2">灵感 +1<br/>快乐 × N</div></div></section><section className="market" id="market"><div className="section-head"><div><span className="fire">🔥</span><h2>大家正在玩</h2><em>所有题材</em></div><button onClick={loadWorks}>刷新作品 ↻</button></div><div className="cards">{allWorks.map((w,i)=><article className={`card ${["peach","blue","cream","mint","lavender","yellow"][i%6]}`} key={w.id}><div className="cover" onClick={()=>openWork(w)}><span className="type">{w.type||"自由创作"}</span><div className="cover-icon">{["📖","🕹️","📰","🎵","✨","🧩"][i%6]}</div><button className="play">打开使用</button></div><div className="card-body"><div><h3>{w.title}</h3><p>{w.description}</p></div></div><footer><button className="author-link" onClick={()=>openCreator(w.authorName)}><span className="avatar">🧑🏻</span>{w.authorName}</button><span className="use">可直接运行</span></footer></article>)}</div></section></>}

    {tab==="创作中心"&&<section className="workspace studio"><div className="studio-intro"><span className="eyebrow">FREE CREATOR</span><h1>{form.id?"编辑作品":"自由创作台"}</h1><p>题材不限，发布时只需选择一个便于检索的分类。</p></div><div className="editor"><div className="editor-head"><div><b>{form.id?"更新现有作品":"创建新作品"}</b><small>{user?`创作者：${profile.displayName||user.displayName}`:"登录后才能保存和发布"}</small></div></div><label>作品名称 <em>必填</em><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></label><label>作品分类 <em>必选</em><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}><option value="">请选择分类</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label><label>作品介绍<textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></label><div className="upload-zone"><b>作品封面图</b><p>支持 JPG、PNG、WebP 等图片，最大 3MB。</p><input className="file" ref={coverRef} type="file" accept="image/*"/></div><label>已有网页链接 <small>选填；填写后打开作品将直接跳转</small><input type="url" value={form.externalUrl} onChange={e=>setForm(f=>({...f,externalUrl:e.target.value}))} placeholder="https://example.com"/></label><div className="optional-templates"><b>可选起步模板</b><div>{starterTemplates.map(t=><button key={t.name} onClick={()=>setForm(f=>({...f,content:t.code}))}>{t.icon} {t.name}</button>)}</div></div><div className="upload-zone"><b>上传 HTML 作品</b><input className="file" ref={fileRef} type="file" accept=".html,text/html"/></div><label>在线编辑 HTML / CSS / JavaScript<textarea className="code-input" spellCheck={false} value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))}/></label>{message&&<div className="toast">{message}</div>}<div className="publish-bar">{form.id&&<button className="secondary" onClick={()=>setForm(emptyForm)}>取消编辑</button>}<button className="secondary" disabled={saving} onClick={()=>save("draft")}>保存草稿</button><button className="preview-btn" onClick={()=>form.externalUrl?window.open(form.externalUrl,"_blank"):setViewer({...form,authorName:user?.displayName||"我",appHtml:form.content})}>▶ 预览</button><button className="primary" disabled={saving} onClick={()=>save("published")}>{saving?"正在保存…":form.id?"更新并发布":"发布作品 →"}</button></div></div></section>}

    {tab==="我的作品"&&<section className="workspace"><span className="eyebrow">MY CREATIONS</span><h1>我的作品管理</h1>{!user?<div className="signin-box"><span>🔐</span><h2>登录后管理作品</h2><button className="primary" onClick={()=>setShowLogin(true)}>登录创作</button></div>:<><p>草稿和已发布作品都能编辑更新；公开作品也可以随时隐藏。</p><div className="manage-list">{mine.length===0?<div className="empty">还没有云端作品。</div>:mine.map(w=><article key={w.id}><span className="work-icon">✦</span><div><h3>{w.title}</h3><p>{w.description||"暂无介绍"}</p><small>{w.status==="published"?"● 公开展示中":"○ 草稿 / 已隐藏"} · {w.type}</small></div><div className="manage-actions"><button onClick={()=>openWork(w)}>运行</button><button onClick={()=>editWork(w)}>编辑 / 更新</button>{w.status==="published"?<button onClick={()=>setStatus(w,"draft")}>隐藏</button>:<button onClick={()=>setStatus(w,"published")}>重新发布</button>}<button className="danger" onClick={()=>remove(w)}>永久删除</button></div></article>)}</div></>}</section>}

    {tab==="个人主页"&&<section className="workspace profile-page">{user&&<><div className="profile-hero"><div className="avatar-editor">{profile.avatarUrl?<img src={profile.avatarUrl} alt="头像"/>:<span>{profile.avatar}</span>}<input ref={avatarRef} type="file" accept="image/*"/><small>点击选择新头像</small></div><div><span className="eyebrow">PUBLIC PROFILE</span><input className="profile-name" value={profile.displayName} onChange={e=>setProfile(p=>({...p,displayName:e.target.value}))}/><textarea value={profile.bio} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))}/><button className="primary" onClick={saveProfile}>保存个人资料</button>{message&&<div className="toast">{message}</div>}</div></div><h2 className="profile-title">我的公开作品</h2><div className="cards compact">{[...official,...mine.filter(w=>w.status==="published")].map((w,i)=><article className={`card ${["peach","blue","cream"][i%3]}`} key={w.id} onClick={()=>openWork(w)}><div className="cover"><div className="cover-icon">✦</div></div><div className="card-body"><div><h3>{w.title}</h3><p>{w.description}</p></div></div></article>)}</div></>}</section>}

    {creator&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setCreator(null)}><section className="modal creator-modal"><button className="close" onClick={()=>setCreator(null)}>×</button><div className="public-profile"><span>{creator.profile.avatar}</span><h2>{creator.profile.displayName}</h2><p>{creator.profile.bio}</p></div><div className="creator-works">{creator.works.map(w=><button key={w.id} onClick={()=>{setCreator(null);void openWork(w)}}><b>{w.title}</b><small>{w.type||"自由创作"}</small></button>)}</div></section></div>}
    {showLogin&&!user&&<div className="overlay"><section className="modal login-modal"><button className="close" onClick={()=>setShowLogin(false)}>×</button><span className="fish">🐟</span><h2>登录摸鱼开发广场</h2><p>登录后可创作、保存草稿、发布作品和管理个人主页。</p><a className="auth-button chatgpt" href="/signin-with-chatgpt?return_to=%2F">使用 ChatGPT 登录</a><a className="auth-button google" href="/signin-with-chatgpt?return_to=%2F">使用 Google 账号登录</a><small>Google 账号通过安全的 ChatGPT 账号登录流程完成验证。</small></section></div>}
    {viewer&&<div className="overlay app-overlay" onMouseDown={e=>e.target===e.currentTarget&&setViewer(null)}><section className="modal app-modal"><div className="app-toolbar"><div><b>{viewer.title}</b><small>{viewer.type||"自由创作"} · {viewer.authorName} · 本地存档可用</small></div><div className="app-toolbar-actions"><button onClick={clearViewerStorage}>清除存档</button><button onClick={()=>setViewer(null)}>退出作品 ×</button></div></div><iframe ref={appFrameRef} className="app-frame" title={viewer.title} sandbox="allow-scripts" srcDoc={withStorageBridge(viewer.appHtml||viewer.content||"<h1>作品暂无内容</h1>")}/></section></div>}
  </main>
}
