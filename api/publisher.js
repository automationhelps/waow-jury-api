// api/publisher.js
const { isAuthenticated } = require("../lib/auth");

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) {
    res.setHeader("Location", "/login");
    return res.status(302).end();
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).send(PAGE);
};

const PAGE = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Studio Stories — Publishing Tool</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#f7f3ed;--surface:#fbf8f3;--surface-2:#f1ebe4;--border:rgba(43,34,26,.14);--text:#2f261f;--text-muted:#5b524a;--text-faint:#8b8278;--primary:#1f6d68;--primary-hover:#15534f;--primary-soft:#d5e5e1;--accent:#b96f50;--success:#2f7a3a;--radius:14px;--radius-lg:20px;--shadow-sm:0 1px 3px rgba(34,25,18,.08);--shadow-md:0 8px 24px rgba(34,25,18,.10);--font-display:'Cormorant Garamond',Georgia,serif;--font-body:'Manrope',Arial,sans-serif}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:18px;line-height:1.6}
a{color:var(--primary)}
button{font:inherit;cursor:pointer}
img{display:block;max-width:100%}
.container{width:min(calc(100% - 2rem),1100px);margin:0 auto}
header{padding:1.5rem 0;border-bottom:1px solid var(--border);background:var(--surface)}
.header-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:.85rem}
.brand-mark{width:48px;height:48px;border-radius:12px;background:var(--primary-soft);display:grid;place-items:center;color:var(--primary)}
.brand-name{font-family:var(--font-display);font-size:1.75rem;line-height:1}
.brand-sub{font-size:.85rem;letter-spacing:.12em;text-transform:uppercase;color:var(--text-faint);margin-top:.2rem}
main{padding:2rem 0 4rem}
.intro{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.75rem;margin-bottom:1.5rem;box-shadow:var(--shadow-sm)}
.intro h1{font-family:var(--font-display);font-size:2.25rem;line-height:1.1;margin-bottom:.5rem}
.intro p{font-size:1.1rem;color:var(--text-muted);max-width:62ch}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:1.5rem;list-style:none}
.step{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.1rem;display:flex;gap:.85rem;align-items:flex-start}
.step-num{flex-shrink:0;width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;font-weight:700;font-size:1.05rem;display:grid;place-items:center}
.step-text strong{display:block;font-size:1.05rem;margin-bottom:.15rem}
.step-text span{color:var(--text-muted);font-size:.95rem}
.toolbar{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;justify-content:space-between;margin:1.5rem 0 1rem}
.toolbar-left{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center}
.search{display:flex;align-items:center;gap:.5rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:.65rem .9rem;min-width:280px}
.search input{border:0;outline:0;background:transparent;flex:1;font-size:1rem}
.count{color:var(--text-muted);font-size:1rem}
.btn{min-height:48px;padding:0 1.25rem;border:1px solid var(--border);border-radius:999px;display:inline-flex;align-items:center;gap:.5rem;font-size:1rem;font-weight:600;text-decoration:none;background:var(--surface);color:var(--text)}
.btn:hover{background:var(--surface-2)}
.btn-primary{background:var(--primary);color:#fff;border-color:var(--primary)}
.btn-primary:hover{background:var(--primary-hover)}
.btn-lg{font-size:1.1rem;padding:0 1.5rem;min-height:56px}
.state{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2rem;text-align:center;color:var(--text-muted);box-shadow:var(--shadow-sm)}
.state strong{display:block;color:var(--text);font-size:1.2rem;margin-bottom:.4rem}
.grid{display:grid;gap:1.25rem}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-md);overflow:hidden;display:grid;grid-template-columns:220px 1fr}
.card-image{background:var(--surface-2);min-height:220px;display:grid;place-items:center;color:var(--text-faint);font-size:.9rem;padding:.5rem}
.card-image img{width:100%;height:100%;object-fit:cover;min-height:220px}
.card-body{padding:1.5rem 1.75rem;display:flex;flex-direction:column;gap:.75rem}
.card-name{font-family:var(--font-display);font-size:1.85rem;line-height:1.1}
.card-meta{display:flex;flex-wrap:wrap;gap:.5rem 1rem;color:var(--text-muted);font-size:.95rem}
.card-meta a{color:var(--primary)}
.card-story{color:var(--text-muted);font-size:1rem;line-height:1.55;max-height:5em;overflow:hidden;position:relative}
.card-story::after{content:"";position:absolute;bottom:0;left:0;right:0;height:1.5em;background:linear-gradient(transparent,var(--surface))}
.card-actions{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:.5rem;align-items:center}
.copy-status{font-size:.95rem;color:var(--success);font-weight:600;opacity:0;transition:opacity .2s;display:inline-flex;align-items:center;gap:.35rem}
.copy-status.show{opacity:1}
details.preview{margin-top:.75rem;border-top:1px dashed var(--border);padding-top:.75rem}
details.preview summary{cursor:pointer;color:var(--primary);font-weight:600;font-size:.95rem;list-style:none;display:inline-flex;align-items:center;gap:.35rem}
details.preview summary::-webkit-details-marker{display:none}
details.preview[open] summary::after{content:"▾"}
details.preview:not([open]) summary::after{content:"▸"}
.preview-frame{margin-top:1rem;border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;background:#fff}
footer{padding:2rem 0;color:var(--text-faint);font-size:.95rem;text-align:center;border-top:1px solid var(--border);background:var(--surface)}
@media (max-width:820px){.steps{grid-template-columns:1fr}.card{grid-template-columns:1fr}.card-image,.card-image img{min-height:200px}.intro h1{font-size:1.85rem}.search{min-width:0;width:100%}}
</style>
</head>
<body>
<header>
  <div class="container header-row">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none"><path d="M10 46C18 24 35 16 54 18C43 23 35 33 32 46" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="23" cy="28" r="5" fill="currentColor" opacity=".25"/><path d="M18 50C25 40 39 39 48 48" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>
      </div>
      <div>
        <div class="brand-name">Studio Stories</div>
        <div class="brand-sub">Publishing Tool · Women Artists of the West</div>
      </div>
    </div>
    <button class="btn" id="logout" type="button">Sign out</button>
  </div>
</header>
<main>
  <div class="container">
    <section class="intro">
      <h1>Publish a Studio Story to the website</h1>
      <p>This page lists every approved artist story. For each one, click <strong>Copy code</strong>, then paste the code into a Code Block on the Squarespace blog post. That's it — three steps.</p>
      <ol class="steps">
        <li class="step"><div class="step-num">1</div><div class="step-text"><strong>Find the artist</strong><span>Scroll the list below, or type a name in the search box.</span></div></li>
        <li class="step"><div class="step-num">2</div><div class="step-text"><strong>Click "Copy code"</strong><span>The story's code is now on your clipboard. You'll see a green "Copied" message.</span></div></li>
        <li class="step"><div class="step-num">3</div><div class="step-text"><strong>Paste into Squarespace</strong><span>In the blog post, add a Code Block, paste, then save the post.</span></div></li>
      </ol>
    </section>
    <div class="toolbar">
      <div class="toolbar-left">
        <label class="search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input id="search" type="search" placeholder="Search by name…" aria-label="Search artists by name" />
        </label>
        <span class="count" id="count" aria-live="polite">Loading…</span>
      </div>
      <button class="btn" id="refresh" type="button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></svg>
        Refresh list
      </button>
    </div>
    <div id="state" class="state" hidden></div>
    <div id="grid" class="grid" role="list"></div>
  </div>
</main>
<footer><div class="container">Studio Stories Publishing Tool · Women Artists of the West</div></footer>
<script>
const grid=document.getElementById("grid"),stateBox=document.getElementById("state"),countEl=document.getElementById("count"),searchEl=document.getElementById("search"),refreshBtn=document.getElementById("refresh"),logoutBtn=document.getElementById("logout");
let stories=[];
function showState(html){stateBox.hidden=false;stateBox.innerHTML=html;grid.innerHTML="";}
function clearState(){stateBox.hidden=true;stateBox.innerHTML="";}
function escapeHtml(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function hostOf(u){try{return new URL(u).host.replace(/^www\./,"");}catch{return u;}}
async function loadStories(){
  showState("<strong>Loading approved stories…</strong><span>One moment.</span>");
  countEl.textContent="Loading…";
  try{
    const r=await fetch("/api/studio-stories-feed",{cache:"no-store",credentials:"same-origin"});
    if(r.status===401){window.location.href="/login";return;}
    const d=await r.json();
    if(!d.ok)throw new Error(d.error||"Could not load stories.");
    stories=d.stories||[];clearState();render();
  }catch(e){showState("<strong>Something went wrong.</strong><span>"+escapeHtml(e.message)+"</span>");countEl.textContent="—";}
}
function visibleList(){const q=searchEl.value.trim().toLowerCase();return q?stories.filter(s=>(s.fullName||"").toLowerCase().includes(q)):stories;}
function render(){
  const list=visibleList();
  countEl.textContent=list.length===1?"1 story ready to publish":list.length+" stories ready to publish";
  if(list.length===0){
    if(stories.length===0)showState("<strong>No approved stories yet.</strong><span>When an artist is tagged <em>studio-story-approved</em> in the contact system, they'll appear here.</span>");
    else showState("<strong>No matches for \""+escapeHtml(searchEl.value)+"\".</strong><span>Try a different name, or clear the search.</span>");
    return;
  }
  clearState();
  grid.innerHTML=list.map((s,i)=>{
    const img=s.firstImage?'<img src="'+escapeHtml(s.firstImage)+'" alt="'+escapeHtml(s.fullName)+' studio image" loading="lazy" />':"<span>No image</span>";
    const websiteLink=s.website?'<a href="'+escapeHtml(s.website)+'" target="_blank" rel="noopener">'+escapeHtml(hostOf(s.website))+'</a>':"";
    const emailLink=s.email?'<a href="mailto:'+escapeHtml(s.email)+'">'+escapeHtml(s.email)+'</a>':"";
    const metaParts=[websiteLink,emailLink].filter(Boolean).join(" · ");
    const excerpt=(s.studioStory||"").slice(0,280)+((s.studioStory||"").length>280?"…":"");
    return '<article class="card" role="listitem" data-index="'+i+'">'
      +'<div class="card-image">'+img+'</div>'
      +'<div class="card-body">'
      +'<h2 class="card-name">'+(escapeHtml(s.fullName)||"Untitled artist")+'</h2>'
      +(metaParts?'<div class="card-meta">'+metaParts+'</div>':"")
      +'<p class="card-story">'+escapeHtml(excerpt)+'</p>'
      +'<div class="card-actions">'
      +'<button class="btn btn-primary btn-lg" data-copy="'+i+'" type="button">'
      +'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>'
      +'Copy code for Squarespace</button>'
      +'<span class="copy-status" data-status="'+i+'" aria-live="polite">'
      +'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>'
      +'Copied — now paste it into Squarespace</span>'
      +'</div>'
      +'<details class="preview"><summary>Preview how it will look on the blog post</summary><div class="preview-frame" data-preview="'+i+'"></div></details>'
      +'</div></article>';
  }).join("");
  grid.querySelectorAll("[data-copy]").forEach(b=>b.addEventListener("click",()=>copy(parseInt(b.dataset.copy,10))));
  grid.querySelectorAll("details.preview").forEach(d=>d.addEventListener("toggle",()=>{
    if(!d.open)return;
    const frame=d.querySelector("[data-preview]");
    if(frame&&!frame.dataset.loaded){frame.innerHTML=visibleList()[parseInt(frame.dataset.preview,10)].squarespaceHtml||"<em>No preview available.</em>";frame.dataset.loaded="1";}
  }));
}
async function copy(i){
  const s=visibleList()[i];if(!s)return;
  const html=s.squarespaceHtml||"";
  try{await navigator.clipboard.writeText(html);}
  catch{const ta=document.createElement("textarea");ta.value=html;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();}
  const status=grid.querySelector('[data-status="'+i+'"]');
  if(status){status.classList.add("show");clearTimeout(status._t);status._t=setTimeout(()=>status.classList.remove("show"),3000);}
}
searchEl.addEventListener("input",render);
refreshBtn.addEventListener("click",loadStories);
logoutBtn.addEventListener("click",async()=>{await fetch("/api/logout",{method:"POST",credentials:"same-origin"});window.location.href="/login";});
loadStories();
</script>
</body></html>`;
