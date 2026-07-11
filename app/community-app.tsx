"use client";

import { useEffect, useRef, useState } from "react";

type User = { displayName:string; email:string } | null;
type Work = { id:number; type:string; title:string; description:string; authorName:string; status?:string; content?:string; appHtml?:string };
type Profile = { displayName:string; bio:string; avatar:string };

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
    <button onclick="message.textContent='作品运行成功！'">试一下</button>
  </main>
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
  const [form,setForm]=useState({title:"",type:"",description:"",content:""});
  const [profile,setProfile]=useState<Profile>({displayName:ownerName,bio:"这个人正在认真摸鱼和创造。",avatar:"🐟"});
  const fileRef=useRef<HTMLInputElement>(null);

  const loadWorks=async()=>{const r=await fetch("/api/works");const d=await r.json();if(r.ok)setWorks(d.works)};
  const loadMine=async()=>{if(!user)return;const r=await fetch("/api/works?mine=1");const d=await r.json();if(r.ok)setMine(d.works)};
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void loadWorks()},[]);
  const allWorks=[...official,...works].filter(w=>`${w.title}${w.description}${w.type}${w.authorName}`.toLowerCase().includes(query.toLowerCase()));

  const openWork=async(w:Work)=>{if(w.id<0){setViewer({...w,appHtml:blankApp.replace("从这里开始自由创作",w.title)});return}const r=await fetch(`/api/works/${w.id}`);const d=await r.json();if(r.ok)setViewer(d.work);else setMessage(d.error||"加载失败")};
  const openCreator=async(name:string)=>{if(name===ownerName){setCreator({profile,works:[...official,...works.filter(w=>w.authorName===name)]});return}const r=await fetch(`/api/profile?name=${encodeURIComponent(name)}`);const d=await r.json();if(r.ok)setCreator(d)};
  const changeTab=(next:string)=>{setTab(next);if(next==="我的作品")void loadMine();if(next==="个人主页")void loadProfile()};
  const loadProfile=async()=>{if(!user)return;const r=await fetch("/api/profile");const d=await r.json();if(r.ok)setProfile(d.profile)};
  const saveProfile=async()=>{const r=await fetch("/api/profile",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(profile)});const d=await r.json();setMessage(r.ok?"个人主页已更新":d.error||"更新失败")};

  const save=async(status:"draft"|"published")=>{
    if(!user){location.href="/signin-with-chatgpt?return_to=%2F";return}
    if(!form.title.trim()){setMessage("请填写作品名称");return}
    const file=fileRef.current?.files?.[0];
    if(!file&&!form.content.trim()){setMessage("请在线编写代码或上传 HTML 作品后再发布");return}
    setSaving(true);setMessage("");const body=new FormData();Object.entries(form).forEach(([k,v])=>body.set(k,v));body.set("status",status);if(file)body.set("file",file);
    const r=await fetch("/api/works",{method:"POST",body});const d=await r.json();setSaving(false);
    if(!r.ok){setMessage(d.error||"保存失败");return}setMessage(status==="published"?"作品已发布到大家正在玩":"草稿已保存");setForm({title:"",type:"",description:"",content:""});if(fileRef.current)fileRef.current.value="";await loadWorks();await loadMine();
  };
  const setStatus=async(w:Work,status:"draft"|"published")=>{await fetch(`/api/works/${w.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status})});await loadMine();await loadWorks()};
  const remove=async(w:Work)=>{if(!confirm(`确定永久删除“${w.title}”吗？`))return;await fetch(`/api/works/${w.id}`,{method:"DELETE"});await loadMine();await loadWorks()};

  return <main>
    <header className="topbar"><button className="brand" onClick={()=>changeTab("发现功能")}><span className="fish">🐟</span><span>摸鱼开发广场</span></button><nav>{["发现功能","创作中心","我的作品","个人主页"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>changeTab(x)}>{x}</button>)}</nav>{user?<button className="profile" onClick={()=>changeTab("个人主页")} title={user.displayName}>👨🏻‍💻<span className="online"/></button>:<a className="login" href="/signin-with-chatgpt?return_to=%2F">登录创作</a>}</header>

    {tab==="发现功能"&&<><section className="hero"><div className="hero-copy"><span className="eyebrow">CREATE WITHOUT LIMITS</span><h1>上班摸个鱼，<br/>顺手<span>造点好玩的</span></h1><p>不限制题材和类型。游戏、音乐、小说、效率工具，或者从未有人做过的新点子，都可以发布给大家使用。</p><div className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索作品、标签或创作者..."/></div><div className="hero-actions"><button className="primary" onClick={()=>changeTab("创作中心")}>✎ 自由创作</button><button className="secondary" onClick={()=>document.getElementById("market")?.scrollIntoView({behavior:"smooth"})}>◉ 看看大家的作品</button></div></div><div className="hero-art"><div className="window"><span/><span/><span/></div><div className="sun">☀</div><div className="plant">🪴</div><div className="desk"/><div className="laptop">&lt;/&gt;</div><div className="mascot">🐠</div><div className="mug">☕</div><div className="note n1">题材不限<br/>自由发挥</div><div className="note n2">灵感 +1<br/>快乐 × N</div></div></section><section className="market" id="market"><div className="section-head"><div><span className="fire">🔥</span><h2>大家正在玩</h2><em>所有题材</em></div><button onClick={loadWorks}>刷新作品 ↻</button></div><div className="cards">{allWorks.map((w,i)=><article className={`card ${["peach","blue","cream","mint","lavender","yellow"][i%6]}`} key={w.id}><div className="cover" onClick={()=>openWork(w)}><span className="type">{w.type||"自由创作"}</span><div className="cover-icon">{["📖","🕹️","📰","🎵","✨","🧩"][i%6]}</div><button className="play">打开使用</button></div><div className="card-body"><div><h3>{w.title}</h3><p>{w.description}</p></div></div><footer><button className="author-link" onClick={()=>openCreator(w.authorName)}><span className="avatar">🧑🏻</span>{w.authorName}</button><span className="use">可直接运行</span></footer></article>)}</div></section></>}

    {tab==="创作中心"&&<section className="workspace studio"><div className="studio-intro"><span className="eyebrow">FREE CREATOR</span><h1>没有类型限制的创作台</h1><p>无需选择作品类型。直接写代码或上传你开发好的 HTML 应用。</p><ol><li className="done">1 填写基础信息</li><li className="done">2 编写或上传作品</li><li>3 运行预览</li><li>4 发布给所有人</li></ol><div className="package-tip"><b>两种创作方式</b><p>在线编辑完整 HTML、CSS、JavaScript；或者上传最大 5MB 的单文件 .html 应用。</p></div></div><div className="editor"><div className="editor-head"><div><b>自由创作工作台</b><small>{user?`创作者：${user.displayName}`:"登录后才能保存和发布"}</small></div><span>用户作品在隔离沙盒中运行</span></div><div className="optional-templates"><b>可选起步模板</b><small>不是作品类型，只是帮你快速开始，也可以直接使用空白代码。</small><div>{starterTemplates.map(t=><button key={t.name} onClick={()=>setForm(f=>({...f,content:t.code}))}><span>{t.icon}</span>{t.name}</button>)}</div></div><label>作品名称 <em>必填</em><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} maxLength={80} placeholder="给你的作品起个名字"/></label><label>自定义标签 <small>选填，例如：休闲、音乐、AI、学习、实验</small><input value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} maxLength={24} placeholder="不限制题材，自由填写"/></label><label>作品介绍<textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} maxLength={240} placeholder="告诉大家它有什么用、怎么玩"/></label><div className="upload-zone"><b>方式一：上传完整作品</b><p>上传一个可独立运行的 .html 文件，最大 5MB。上传文件将优先于下方代码。</p><input className="file" ref={fileRef} type="file" accept=".html,text/html"/></div><label>方式二：在线编辑 HTML / CSS / JavaScript <textarea className="code-input" spellCheck={false} value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} maxLength={1048576}/></label>{message&&<div className="toast">{message}</div>}<div className="publish-bar"><button className="secondary" disabled={saving} onClick={()=>save("draft")}>保存草稿</button><button className="preview-btn" onClick={()=>setViewer({...form,id:0,authorName:user?.displayName||"我",appHtml:form.content})}>▶ 运行预览</button><button className="primary" disabled={saving} onClick={()=>save("published")}>{saving?"正在发布…":"发布到大家正在玩 →"}</button></div></div></section>}

    {tab==="我的作品"&&<section className="workspace"><span className="eyebrow">MY CREATIONS</span><h1>我的作品管理</h1>{!user?<div className="signin-box"><span>🔐</span><h2>登录后管理作品</h2><a className="primary inline" href="/signin-with-chatgpt?return_to=%2F">登录创作</a></div>:<><p>公开作品可以随时隐藏；隐藏后不会出现在搜索和“大家正在玩”中。</p><div className="manage-list">{mine.length===0?<div className="empty">还没有云端作品。</div>:mine.map(w=><article key={w.id}><span className="work-icon">✦</span><div><h3>{w.title}</h3><p>{w.description||"暂无介绍"}</p><small>{w.status==="published"?"● 公开展示中":"○ 已隐藏"} · {w.type||"自由创作"}</small></div><div className="manage-actions"><button onClick={()=>openWork(w)}>运行</button>{w.status==="published"?<button onClick={()=>setStatus(w,"draft")}>隐藏</button>:<button onClick={()=>setStatus(w,"published")}>重新发布</button>}<button className="danger" onClick={()=>remove(w)}>永久删除</button></div></article>)}</div></>}</section>}

    {tab==="个人主页"&&<section className="workspace profile-page">{!user?<div className="signin-box"><span>👤</span><h2>登录后创建个人主页</h2><a className="primary inline" href="/signin-with-chatgpt?return_to=%2F">登录</a></div>:<><div className="profile-hero"><input className="avatar-input" value={profile.avatar} onChange={e=>setProfile(p=>({...p,avatar:e.target.value}))}/><div><span className="eyebrow">PUBLIC PROFILE</span><input className="profile-name" value={profile.displayName} onChange={e=>setProfile(p=>({...p,displayName:e.target.value}))}/><textarea value={profile.bio} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))}/><button className="primary" onClick={saveProfile}>保存个人主页</button></div></div><h2 className="profile-title">我的公开作品</h2><div className="cards compact">{[...official,...mine.filter(w=>w.status==="published")].map((w,i)=><article className={`card ${["peach","blue","cream"][i%3]}`} key={w.id} onClick={()=>openWork(w)}><div className="cover"><div className="cover-icon">✦</div></div><div className="card-body"><div><h3>{w.title}</h3><p>{w.description}</p></div></div></article>)}</div></>}</section>}

    {creator&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setCreator(null)}><section className="modal creator-modal"><button className="close" onClick={()=>setCreator(null)}>×</button><div className="public-profile"><span>{creator.profile.avatar}</span><h2>{creator.profile.displayName}</h2><p>{creator.profile.bio}</p></div><div className="creator-works">{creator.works.map(w=><button key={w.id} onClick={()=>{setCreator(null);void openWork(w)}}><b>{w.title}</b><small>{w.type||"自由创作"}</small></button>)}</div></section></div>}
    {viewer&&<div className="overlay app-overlay" onMouseDown={e=>e.target===e.currentTarget&&setViewer(null)}><section className="modal app-modal"><div className="app-toolbar"><div><b>{viewer.title}</b><small>{viewer.type||"自由创作"} · {viewer.authorName}</small></div><button onClick={()=>setViewer(null)}>退出作品 ×</button></div><iframe className="app-frame" title={viewer.title} sandbox="allow-scripts" srcDoc={viewer.appHtml||viewer.content||"<h1>作品暂无内容</h1>"}/></section></div>}
  </main>
}
