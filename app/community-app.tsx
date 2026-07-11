"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type User = { displayName: string; email: string } | null;
type Work = { id: number; type: string; title: string; description: string; authorName: string; status?: string; createdAt?: string; content?: string; fileText?: string };

const samples: Work[] = [
  { id: -1, type: "阅读", title: "午后小说馆", description: "沉浸阅读，治愈时光。", authorName: "林间风" },
  { id: -2, type: "小游戏", title: "像素摸鱼大作战", description: "三分钟一局，快乐加倍。", authorName: "像素橙" },
  { id: -3, type: "资讯", title: "今日新闻窗", description: "轻松掌握每日趣闻。", authorName: "早报君" },
];

export default function CommunityApp({ user }: { user: User }) {
  const [tab, setTab] = useState("发现功能");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [works, setWorks] = useState<Work[]>([]);
  const [mine, setMine] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<Work | null>(null);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", type: "工具", description: "", content: "" });
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
    setForm({ title:"", type:"工具", description:"", content:"" }); if (fileRef.current) fileRef.current.value = "";
    await loadWorks(); await loadMine(); if (status === "published") setTimeout(() => setTab("发现功能"), 900);
  };

  const changeTab = (next: string) => { setTab(next); if (next === "我的作品") void loadMine(); };
  const changeStatus = async (work: Work, status: "draft" | "published") => { await fetch(`/api/works/${work.id}`, { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({status}) }); await loadMine(); await loadWorks(); };
  const remove = async (work: Work) => { if (!confirm(`确定删除“${work.title}”吗？`)) return; await fetch(`/api/works/${work.id}`, {method:"DELETE"}); await loadMine(); await loadWorks(); };

  return <main>
    <header className="topbar"><button className="brand" onClick={() => changeTab("发现功能")}><span className="fish">🐟</span><span>摸鱼开发广场</span></button><nav>{["发现功能","创作中心","我的作品"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>changeTab(x)}>{x}</button>)}</nav>{user?<button className="profile" title={user.displayName}>👨🏻‍💻<span className="online"/></button>:<a className="login" href="/signin-with-chatgpt?return_to=%2F">登录创作</a>}</header>

    {tab === "发现功能" && <><section className="hero"><div className="hero-copy"><span className="eyebrow">WORK LESS · CREATE MORE</span><h1>上班摸个鱼，<br/>顺手<span>造点好玩的</span></h1><p>发现大家发布的小说、小游戏和实用工具，也可以把自己的灵感变成所有人都能使用的作品。</p><div className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索小说、小游戏、新闻工具..."/></div><div className="hero-actions"><button className="primary" onClick={()=>changeTab("创作中心")}>✎ 开始创作</button><button className="secondary" onClick={()=>document.getElementById("market")?.scrollIntoView({behavior:"smooth"})}>◉ 逛逛大家的作品</button></div></div><div className="hero-art"><div className="window"><span/><span/><span/></div><div className="sun">☀</div><div className="plant">🪴</div><div className="desk"/><div className="laptop">&lt;/&gt;</div><div className="mascot">🐠</div><div className="mug">☕</div><div className="note n1">小写代码<br/>多造乐趣</div><div className="note n2">灵感 +1<br/>快乐 × N</div></div></section>
    <section className="market" id="market"><div className="section-head"><div><span className="fire">🔥</span><h2>社区新作品</h2><em>云端实时同步</em></div><button onClick={loadWorks}>刷新作品 ↻</button></div><div className="filters">{["全部","阅读","小游戏","资讯","工具"].map(x=><button key={x} className={category===x?"selected":""} onClick={()=>setCategory(x)}>{x}</button>)}</div>{loading?<div className="empty">正在从云端加载作品…</div>:<div className="cards">{shown.map((w,i)=><article className={`card ${["peach","blue","cream","mint","lavender","yellow"][i%6]}`} key={w.id}><div className="cover" onClick={()=>openWork(w)}><span className="type">{w.type}</span><div className="cover-icon">{w.type==="阅读"?"📖":w.type==="小游戏"?"🕹️":w.type==="资讯"?"📰":"✨"}</div><button className="play">打开使用</button></div><div className="card-body"><div><h3>{w.title}</h3><p>{w.description}</p></div></div><footer><span className="avatar">🧑🏻</span><span>{w.authorName}</span><span className="use">公开作品</span></footer></article>)}</div>}</section></>}

    {tab === "创作中心" && <section className="workspace studio"><div className="studio-intro"><span className="eyebrow">CREATOR STUDIO</span><h1>把灵感发布出去</h1><p>用四步完成创作：选择类型、填写内容、预览检查、保存草稿或公开发布。</p><ol><li className="done">1 选择模板</li><li className={form.title?"done":""}>2 编辑内容</li><li>3 预览作品</li><li>4 发布分享</li></ol></div><div className="editor"><div className="editor-head"><div><b>新建作品</b><small>{user?`创作者：${user.displayName}`:"登录后才能保存和发布"}</small></div><span>自动保存需点击“保存草稿”</span></div><div className="template-row">{[["阅读","📚"],["小游戏","🎮"],["资讯","📰"],["工具","✨"]].map(([x,icon])=><button key={x} onClick={()=>setForm(f=>({...f,type:x}))} className={form.type===x?"picked":""}><span>{icon}</span>{x}</button>)}</div><label>作品名称 <em>必填</em><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} maxLength={80} placeholder="给作品起一个容易记住的名字"/></label><label>一句话介绍<textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} maxLength={240} placeholder="告诉大家它有什么好玩或好用的地方"/></label>{form.type==="阅读"&&<label>上传小说文件 <small>支持 TXT，最大 2MB，文件将安全保存到云端</small><input className="file" ref={fileRef} type="file" accept=".txt,text/plain"/></label>}<label>{form.type==="阅读"?"作品说明 / 序言":form.type==="小游戏"?"游戏说明与玩法":"功能内容"}<textarea className="content-input" value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} maxLength={20000} placeholder={form.type==="小游戏"?"例如：点击小鱼获得分数，30 秒内拿到 20 分即可通关…":"填写用户打开作品后看到的正文内容…"}/></label>{message&&<div className="toast">{message}</div>}<div className="publish-bar"><button className="secondary" disabled={saving} onClick={()=>save("draft")}>保存草稿</button><button className="preview-btn" onClick={()=>setViewer({...form,id:0,authorName:user?.displayName||"我"})}>预览作品</button><button className="primary" disabled={saving} onClick={()=>save("published")}>{saving?"正在保存…":"发布给所有人 →"}</button></div></div></section>}

    {tab === "我的作品" && <section className="workspace"><span className="eyebrow">MY CREATIONS</span><h1>我的作品</h1>{!user?<div className="signin-box"><span>🔐</span><h2>登录后管理作品</h2><p>使用 ChatGPT 账号登录，可以在任何设备管理云端草稿和已发布作品。</p><a className="primary inline" href="/signin-with-chatgpt?return_to=%2F">登录创作</a></div>:<><p>这里展示你的云端草稿和已发布作品。</p><div className="manage-list">{mine.length===0?<div className="empty">还没有作品，去创作中心发布第一个吧。</div>:mine.map(w=><article key={w.id}><span className="work-icon">{w.type==="阅读"?"📖":w.type==="小游戏"?"🎮":"✨"}</span><div><h3>{w.title}</h3><p>{w.description||"暂无介绍"}</p><small>{w.status==="published"?"● 已公开":"○ 草稿"} · {w.type}</small></div><div className="manage-actions"><button onClick={()=>openWork(w)}>预览</button>{w.status==="draft"?<button onClick={()=>changeStatus(w,"published")}>发布</button>:<button onClick={()=>changeStatus(w,"draft")}>撤回</button>}<button className="danger" onClick={()=>remove(w)}>删除</button></div></article>)}</div></>}</section>}

    {viewer&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setViewer(null)}><section className="modal"><button className="close" onClick={()=>setViewer(null)}>×</button><span className="modal-icon">{viewer.type==="阅读"?"📖":viewer.type==="小游戏"?"🎮":viewer.type==="资讯"?"📰":"✨"}</span><h2>{viewer.title}</h2><p>{viewer.description}</p>{viewer.type==="小游戏"?<><div className="game"><b>{score}</b><button style={{transform:`translate(${(score%3-1)*70}px,${(score%2)*35}px)`}} onClick={()=>setScore(s=>s+1)}>🐟 抓我</button></div><button className="secondary full" onClick={()=>setScore(0)}>重新开始</button></>:<div className="reader">{viewer.fileText||viewer.content||"这是一个社区示例作品。登录后，你也可以创建并发布自己的内容。"}</div>}<small className="byline">创作者：{viewer.authorName}</small></section></div>}
  </main>;
}
