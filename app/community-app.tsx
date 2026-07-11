"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type User = { displayName: string; email: string } | null;
type Work = { id: number; type: string; title: string; description: string; authorName: string; status?: string; createdAt?: string; content?: string; appHtml?: string };

const samples: Work[] = [
  { id: -1, type: "阅读器", title: "午后小说馆", description: "沉浸阅读，治愈时光。", authorName: "林间风" },
  { id: -2, type: "小游戏", title: "像素摸鱼大作战", description: "三分钟一局，快乐加倍。", authorName: "像素橙" },
  { id: -3, type: "资讯窗口", title: "今日新闻窗", description: "轻松掌握每日趣闻。", authorName: "早报君" },
];

const templates: Record<string, string> = {
  "小游戏": `<!doctype html><html lang="zh"><meta name="viewport" content="width=device-width"><style>body{margin:0;height:100vh;display:grid;place-items:center;background:linear-gradient(#8dd8ff,#fff);font-family:sans-serif}.box{text-align:center}button{font-size:24px;padding:16px 28px;border:0;border-radius:30px;background:#ff5937;color:white}b{font-size:56px;display:block}</style><div class="box"><h1>摸鱼点击挑战</h1><b id="score">0</b><button onclick="score.textContent=+score.textContent+1">🐟 点我得分</button></div></html>`,
  "音乐播放器": `<!doctype html><html lang="zh"><meta name="viewport" content="width=device-width"><style>body{margin:0;height:100vh;display:grid;place-items:center;background:#171923;color:white;font-family:sans-serif}.player{width:min(360px,80%);padding:36px;border-radius:28px;background:#252838;text-align:center;box-shadow:0 25px 60px #0008}.cover{font-size:90px}audio{width:100%;margin-top:24px}</style><div class="player"><div class="cover">🎵</div><h1>我的音乐空间</h1><p>把音频地址填入下方 src 即可播放</p><audio controls src=""></audio></div></html>`,
  "网页工具": `<!doctype html><html lang="zh"><meta name="viewport" content="width=device-width"><style>body{margin:0;padding:40px;background:#fff8ed;font-family:sans-serif;color:#252321}.card{max-width:500px;margin:auto;background:white;padding:30px;border-radius:20px;box-shadow:0 10px 30px #0001}input,button{box-sizing:border-box;width:100%;padding:14px;margin-top:12px;border-radius:10px;border:1px solid #ddd}button{background:#ff4b24;color:white;border:0}</style><div class="card"><h1>我的小工具</h1><input id="input" placeholder="输入一些内容"><button onclick="output.textContent=input.value">立即处理</button><p id="output"></p></div></html>`,
  "阅读器": `<!doctype html><html lang="zh"><meta name="viewport" content="width=device-width"><style>body{margin:0;background:#f5eddf;color:#3e3328;font:18px/2 serif}.book{max-width:720px;margin:40px auto;background:#fffaf0;padding:50px;border-radius:12px;box-shadow:0 15px 50px #73552b22}</style><article class="book"><h1>我的小说</h1><p>在这里粘贴小说正文，或继续修改阅读器样式。</p></article></html>`,
  "资讯窗口": `<!doctype html><html lang="zh"><meta name="viewport" content="width=device-width"><style>body{margin:0;background:#f5f7fb;font-family:sans-serif;padding:30px}.news{max-width:680px;margin:auto}.item{background:white;margin:12px 0;padding:20px;border-radius:14px;border:1px solid #e8ebf0}</style><main class="news"><h1>今日资讯</h1><div class="item"><b>第一条资讯标题</b><p>在这里填写资讯内容。</p></div><div class="item"><b>第二条资讯标题</b><p>也可以通过 JavaScript 接入公开数据。</p></div></main></html>`
};

export default function CommunityApp({ user }: { user: User }) {
  const [tab, setTab] = useState("发现功能");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [works, setWorks] = useState<Work[]>([]);
  const [mine, setMine] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<Work | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", type: "小游戏", description: "", content: templates["小游戏"] });
  const fileRef = useRef<HTMLInputElement>(null);

  const loadWorks = async () => {
    setLoading(true);
    try { const r = await fetch("/api/works"); const d = await r.json(); if (r.ok) setWorks(d.works); } finally { setLoading(false); }
  };
  const loadMine = async () => { if (!user) return; const r = await fetch("/api/works?mine=1"); const d = await r.json(); if (r.ok) setMine(d.works); };
  // Initial cloud synchronization after the client becomes interactive.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadWorks(); }, []);

  const shown = useMemo(() => (works.length ? works : samples).filter(w =>
    (category === "全部" || w.type === category) && `${w.title}${w.description}${w.authorName}`.toLowerCase().includes(query.toLowerCase())
  ), [works, query, category]);

  const openWork = async (work: Work) => {
    if (work.id < 0) { setViewer(work); return; }
    const r = await fetch(`/api/works/${work.id}`); const d = await r.json();
    if (r.ok) setViewer(d.work); else setMessage(d.error || "加载失败");
  };

  const save = async (status: "draft" | "published") => {
    if (!user) { location.href = "/signin-with-chatgpt?return_to=%2F"; return; }
    if (!form.title.trim()) { setMessage("请先填写作品名称"); return; }
    setSaving(true); setMessage("");
    const body = new FormData(); Object.entries(form).forEach(([k,v]) => body.set(k,v)); body.set("status", status);
    if (fileRef.current?.files?.[0]) body.set("file", fileRef.current.files[0]);
    const r = await fetch("/api/works", { method: "POST", body }); const d = await r.json();
    setSaving(false);
    if (!r.ok) { setMessage(d.error || "保存失败"); return; }
    setMessage(status === "published" ? "发布成功，所有访问者现在都能看到它了！" : "草稿已保存到云端");
    setForm({ title:"", type:"小游戏", description:"", content:templates["小游戏"] }); if (fileRef.current) fileRef.current.value = "";
    await loadWorks(); await loadMine(); if (status === "published") setTimeout(() => setTab("发现功能"), 900);
  };

  const changeTab = (next: string) => { setTab(next); if (next === "我的作品") void loadMine(); };
  const changeStatus = async (work: Work, status: "draft" | "published") => { await fetch(`/api/works/${work.id}`, { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({status}) }); await loadMine(); await loadWorks(); };
  const remove = async (work: Work) => { if (!confirm(`确定删除“${work.title}”吗？`)) return; await fetch(`/api/works/${work.id}`, {method:"DELETE"}); await loadMine(); await loadWorks(); };

  return <main>
    <header className="topbar"><button className="brand" onClick={() => changeTab("发现功能")}><span className="fish">🐟</span><span>摸鱼开发广场</span></button><nav>{["发现功能","创作中心","我的作品"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>changeTab(x)}>{x}</button>)}</nav>{user?<button className="profile" title={user.displayName}>👨🏻‍💻<span className="online"/></button>:<a className="login" href="/signin-with-chatgpt?return_to=%2F">登录创作</a>}</header>

    {tab === "发现功能" && <><section className="hero"><div className="hero-copy"><span className="eyebrow">WORK LESS · CREATE MORE</span><h1>上班摸个鱼，<br/>顺手<span>造点好玩的</span></h1><p>发现大家发布的小说、小游戏和实用工具，也可以把自己的灵感变成所有人都能使用的作品。</p><div className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索小说、小游戏、新闻工具..."/></div><div className="hero-actions"><button className="primary" onClick={()=>changeTab("创作中心")}>✎ 开始创作</button><button className="secondary" onClick={()=>document.getElementById("market")?.scrollIntoView({behavior:"smooth"})}>◉ 逛逛大家的作品</button></div></div><div className="hero-art"><div className="window"><span/><span/><span/></div><div className="sun">☀</div><div className="plant">🪴</div><div className="desk"/><div className="laptop">&lt;/&gt;</div><div className="mascot">🐠</div><div className="mug">☕</div><div className="note n1">小写代码<br/>多造乐趣</div><div className="note n2">灵感 +1<br/>快乐 × N</div></div></section>
    <section className="market" id="market"><div className="section-head"><div><span className="fire">🔥</span><h2>大家正在玩</h2><em>云端实时同步</em></div><button onClick={loadWorks}>刷新作品 ↻</button></div><div className="filters">{["全部","阅读器","小游戏","音乐播放器","资讯窗口","网页工具"].map(x=><button key={x} className={category===x?"selected":""} onClick={()=>setCategory(x)}>{x}</button>)}</div>{loading?<div className="empty">正在从云端加载作品…</div>:<div className="cards">{shown.map((w,i)=><article className={`card ${["peach","blue","cream","mint","lavender","yellow"][i%6]}`} key={w.id}><div className="cover" onClick={()=>openWork(w)}><span className="type">{w.type}</span><div className="cover-icon">{w.type==="阅读器"?"📖":w.type==="小游戏"?"🕹️":w.type==="音乐播放器"?"🎵":w.type==="资讯窗口"?"📰":"✨"}</div><button className="play">打开使用</button></div><div className="card-body"><div><h3>{w.title}</h3><p>{w.description}</p></div></div><footer><span className="avatar">🧑🏻</span><span>{w.authorName}</span><span className="use">可直接运行</span></footer></article>)}</div>}</section></>}

    {tab === "创作中心" && <section className="workspace studio"><div className="studio-intro"><span className="eyebrow">APP CREATOR</span><h1>创作真正能玩的作品</h1><p>选择模板在线修改代码，或者上传自己开发好的单文件 HTML 应用。</p><ol><li className="done">1 选择作品类型</li><li className={form.title?"done":""}>2 编辑或上传应用</li><li>3 运行预览</li><li>4 发布到广场</li></ol><div className="package-tip"><b>作品包要求</b><p>上传一个可独立运行的 HTML 文件，CSS、JavaScript 和资源可以写在文件中。最大 5MB。</p></div></div><div className="editor"><div className="editor-head"><div><b>小应用创作台</b><small>{user?`创作者：${user.displayName}`:"登录后才能保存和发布"}</small></div><span>作品会在安全沙盒中运行</span></div><div className="template-row five">{[["小游戏","🎮"],["音乐播放器","🎵"],["网页工具","✨"],["阅读器","📚"],["资讯窗口","📰"]].map(([x,icon])=><button key={x} onClick={()=>setForm(f=>({...f,type:x,content:templates[x]}))} className={form.type===x?"picked":""}><span>{icon}</span>{x}</button>)}</div><label>作品名称 <em>必填</em><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} maxLength={80} placeholder="例如：太空躲避小游戏"/></label><label>一句话介绍<textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} maxLength={240} placeholder="告诉大家这个作品怎么玩、有什么用"/></label><div className="upload-zone"><b>上传已开发好的作品</b><p>选择单文件 HTML 后，发布时将优先使用上传文件。</p><input className="file" ref={fileRef} type="file" accept=".html,text/html"/></div><label>在线代码编辑器 <small>支持完整 HTML、CSS 和 JavaScript</small><textarea className="code-input" spellCheck={false} value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} maxLength={200000}/></label>{message&&<div className="toast">{message}</div>}<div className="publish-bar"><button className="secondary" disabled={saving} onClick={()=>save("draft")}>保存草稿</button><button className="preview-btn" onClick={()=>setViewer({...form,id:0,authorName:user?.displayName||"我",appHtml:form.content})}>▶ 运行预览</button><button className="primary" disabled={saving} onClick={()=>save("published")}>{saving?"正在上传…":"发布到大家正在玩 →"}</button></div></div></section>}

    {tab === "我的作品" && <section className="workspace"><span className="eyebrow">MY CREATIONS</span><h1>我的作品</h1>{!user?<div className="signin-box"><span>🔐</span><h2>登录后管理作品</h2><p>使用 ChatGPT 账号登录，可以在任何设备管理云端草稿和已发布作品。</p><a className="primary inline" href="/signin-with-chatgpt?return_to=%2F">登录创作</a></div>:<><p>这里展示你的云端草稿和已发布小应用。</p><div className="manage-list">{mine.length===0?<div className="empty">还没有作品，去创作中心发布第一个吧。</div>:mine.map(w=><article key={w.id}><span className="work-icon">{w.type==="阅读器"?"📖":w.type==="小游戏"?"🎮":w.type==="音乐播放器"?"🎵":w.type==="资讯窗口"?"📰":"✨"}</span><div><h3>{w.title}</h3><p>{w.description||"暂无介绍"}</p><small>{w.status==="published"?"● 已公开":"○ 草稿"} · {w.type}</small></div><div className="manage-actions"><button onClick={()=>openWork(w)}>运行</button>{w.status==="draft"?<button onClick={()=>changeStatus(w,"published")}>发布</button>:<button onClick={()=>changeStatus(w,"draft")}>撤回</button>}<button className="danger" onClick={()=>remove(w)}>删除</button></div></article>)}</div></>}</section>}

    {viewer&&<div className="overlay app-overlay" onMouseDown={e=>e.target===e.currentTarget&&setViewer(null)}><section className="modal app-modal"><div className="app-toolbar"><div><b>{viewer.title}</b><small>{viewer.type} · {viewer.authorName}</small></div><button onClick={()=>setViewer(null)}>退出作品 ×</button></div>{viewer.id<0&&!viewer.appHtml?<div className="sample-app"><span>{viewer.type==="小游戏"?"🕹️":viewer.type==="阅读器"?"📖":"📰"}</span><h2>{viewer.title}</h2><p>这是首页示例。社区用户发布的真实作品会在这里直接运行。</p></div>:<iframe className="app-frame" title={viewer.title} sandbox="allow-scripts" srcDoc={viewer.appHtml||viewer.content||"<h1>作品暂无内容</h1>"}/>}</section></div>}
  </main>;
}
