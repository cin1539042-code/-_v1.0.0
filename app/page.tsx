"use client";

import { useMemo, useRef, useState } from "react";

type Work = { id: number; type: "阅读" | "小游戏" | "资讯" | "工具"; title: string; desc: string; author: string; users: string; tone: string };

const works: Work[] = [
  { id: 1, type: "阅读", title: "午后小说馆", desc: "上传 TXT 小说，自动整理章节，沉浸阅读。", author: "林间风", users: "2.4 万", tone: "peach" },
  { id: 2, type: "小游戏", title: "像素摸鱼大作战", desc: "控制小鱼躲开会议，收集快乐金币。", author: "像素橙", users: "5.6 万", tone: "blue" },
  { id: 3, type: "资讯", title: "今日新闻窗", desc: "一眼看完科技、生活和趣闻热榜。", author: "早报君", users: "3.1 万", tone: "cream" },
  { id: 4, type: "工具", title: "下班倒计时", desc: "把今天拆成一格格可爱的小进度。", author: "不加班", users: "8,920", tone: "mint" },
  { id: 5, type: "工具", title: "灵感便签墙", desc: "随手记点子，今天也许就能做出来。", author: "小岛", users: "6,430", tone: "lavender" },
  { id: 6, type: "小游戏", title: "办公室弹球", desc: "三分钟一局，刷新自己的最高分。", author: "午休社", users: "1.8 万", tone: "yellow" },
];

export default function Home() {
  const [tab, setTab] = useState("发现功能");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [modal, setModal] = useState<"create" | "novel" | "game" | "news" | null>(null);
  const [novel, setNovel] = useState({ title: "", text: "" });
  const [score, setScore] = useState(0);
  const [favorites, setFavorites] = useState<number[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => works.filter(w =>
    (category === "全部" || w.type === category) &&
    `${w.title}${w.desc}${w.author}`.toLowerCase().includes(query.toLowerCase())
  ), [query, category]);

  const openWork = (work: Work) => {
    if (work.type === "阅读") setModal("novel");
    else if (work.type === "小游戏") setModal("game");
    else if (work.type === "资讯") setModal("news");
    else setModal("create");
  };

  const loadNovel = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNovel({ title: file.name.replace(/\.txt$/i, ""), text: String(reader.result || "") });
    reader.readAsText(file, "utf-8");
  };

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setTab("发现功能")}><span className="fish">🐟</span><span>摸鱼开发广场</span></button>
        <nav>{["发现功能", "创作中心", "我的收藏"].map(x => <button className={tab === x ? "active" : ""} onClick={() => setTab(x)} key={x}>{x}</button>)}</nav>
        <button className="profile"><span>👨🏻‍💻</span><span className="online" /></button>
      </header>

      {tab === "发现功能" && <>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">WORK LESS · CREATE MORE</span>
            <h1>上班摸个鱼，<br />顺手<span>造点好玩的</span></h1>
            <p>一个属于打工人的创意小天地。发现有趣功能，分享灵感，轻松摸鱼，快乐加倍。</p>
            <div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索小说、小游戏、新闻工具..."/><kbd>⌘ K</kbd></div>
            <div className="hero-actions"><button className="primary" onClick={() => setModal("create")}>✎ 开始创作</button><button className="secondary" onClick={() => document.getElementById("market")?.scrollIntoView({behavior:"smooth"})}>◉ 逛逛大家的作品</button></div>
          </div>
          <div className="hero-art" aria-label="一条正在摸鱼开发的鱼">
            <div className="window"><span /><span /><span /></div><div className="sun">☀</div><div className="plant">🪴</div>
            <div className="desk"/><div className="laptop">&lt;/&gt;</div><div className="mascot">🐠</div><div className="mug">☕</div>
            <div className="note n1">小写代码<br/>多造乐趣</div><div className="note n2">灵感 +1<br/>快乐 × N</div>
          </div>
        </section>

        <section className="market" id="market">
          <div className="section-head"><div><span className="fire">🔥</span><h2>大家正在玩</h2><em>实时上新</em></div><button onClick={() => setQuery("")}>查看全部 →</button></div>
          <div className="filters">{["全部", "阅读", "小游戏", "资讯", "工具"].map(x => <button className={category === x ? "selected" : ""} onClick={() => setCategory(x)} key={x}>{x}</button>)}</div>
          <div className="cards">{filtered.map((w, i) => <article className={`card ${w.tone}`} key={w.id}>
            <div className="cover" onClick={() => openWork(w)}>
              <span className="type">{w.type === "阅读" ? "▣" : w.type === "小游戏" ? "🎮" : w.type === "资讯" ? "▤" : "✦"} {w.type}</span>
              <div className="cover-icon">{w.type === "阅读" ? "📖" : w.type === "小游戏" ? (i % 2 ? "🕹️" : "🐈") : w.type === "资讯" ? "📰" : i % 2 ? "🗒️" : "⏰"}</div>
            </div>
            <div className="card-body"><div><h3>{w.title}</h3><p>{w.desc}</p></div><button className={favorites.includes(w.id) ? "fav on" : "fav"} onClick={() => setFavorites(v => v.includes(w.id) ? v.filter(id => id !== w.id) : [...v, w.id])}>♥</button></div>
            <footer><span className="avatar">{["🧑🏻", "👩🏻", "🧔🏻"][i%3]}</span><span>{w.author}</span><span className="use">♧ {w.users} 人在使用</span></footer>
          </article>)}</div>
        </section>
      </>}

      {tab === "创作中心" && <section className="workspace"><span className="eyebrow">CREATOR STUDIO</span><h1>今天想创造什么？</h1><p>不需要复杂配置，选一个模板，几分钟做出可以分享的小功能。</p><div className="creator-grid">
        <button onClick={() => setModal("novel")}><span>📚</span><b>小说阅读器</b><small>上传 TXT，一键生成阅读空间</small></button>
        <button onClick={() => setModal("game")}><span>🎮</span><b>简易小游戏</b><small>从点击挑战开始改造成你的游戏</small></button>
        <button onClick={() => setModal("news")}><span>📰</span><b>新闻窗口</b><small>创建属于自己的资讯看板</small></button>
        <button onClick={() => setModal("create")}><span>✨</span><b>空白功能</b><small>写下想法，从零开始搭建</small></button>
      </div></section>}

      {tab === "我的收藏" && <section className="workspace"><span className="eyebrow">MY FAVORITES</span><h1>我收藏的功能</h1><p>{favorites.length ? `已经收藏了 ${favorites.length} 个好玩功能。` : "还没有收藏，去广场发现一些好玩的吧。"}</p><div className="cards compact">{works.filter(w => favorites.includes(w.id)).map(w => <article className={`card ${w.tone}`} key={w.id} onClick={() => openWork(w)}><div className="cover"><div className="cover-icon">{w.type === "阅读" ? "📖" : w.type === "小游戏" ? "🕹️" : "📰"}</div></div><div className="card-body"><div><h3>{w.title}</h3><p>{w.desc}</p></div></div></article>)}</div></section>}

      {modal && <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><section className="modal">
        <button className="close" onClick={() => setModal(null)}>×</button>
        {modal === "create" && <><span className="modal-icon">✨</span><h2>创建新功能</h2><p>给你的灵感起个名字，选择一个类型，就能开始创作。</p><label>功能名称<input placeholder="例如：今天吃什么" /></label><label>功能类型<select><option>实用工具</option><option>阅读空间</option><option>简易游戏</option><option>资讯窗口</option></select></label><button className="primary full" onClick={() => setModal(null)}>创建草稿</button></>}
        {modal === "novel" && <><span className="modal-icon">📖</span><h2>{novel.title || "午后小说馆"}</h2>{novel.text ? <div className="reader">{novel.text.slice(0, 5000)}</div> : <><p>上传本地 TXT 小说，选择后即可在阅读框中预览。</p><input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={e => loadNovel(e.target.files?.[0])}/><button className="upload" onClick={() => fileRef.current?.click()}>＋ 选择 TXT 小说</button><div className="reader demo">第一章　初遇<br/><br/>阳光透过窗棂洒在木质书桌上，微风轻拂，带来远处咖啡馆的淡淡香气。<br/><br/>林夏合上笔记本，抬头望向窗外，心里想着：似乎总在不经意间遇见惊喜。</div></>}</>}
        {modal === "game" && <><span className="modal-icon">🎮</span><h2>三秒摸鱼挑战</h2><p>在按钮逃走前抓住它，看看你能拿多少分。</p><div className="game"><b>{score}</b><button style={{transform:`translate(${(score%3-1)*70}px, ${(score%2)*35}px)`}} onClick={() => setScore(s => s + 1)}>🐟 抓我</button></div><button className="secondary full" onClick={() => setScore(0)}>重新开始</button></>}
        {modal === "news" && <><span className="modal-icon">📰</span><h2>今日新闻窗</h2><p>轻量浏览，不打断工作节奏。</p><div className="news-list"><a>国产大模型迎来新一轮应用升级 <small>刚刚</small></a><a>今天有哪些值得关注的科技新鲜事 <small>1 小时前</small></a><a>办公室效率提升的五个微习惯 <small>3 小时前</small></a><a>周末城市散步地图更新 <small>5 小时前</small></a></div></>}
      </section></div>}
    </main>
  );
}
