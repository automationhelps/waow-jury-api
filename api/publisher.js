// api/publisher.js
const { requireAuth } = require('../lib/auth');

module.exports = async (req, res) => {
  const session = requireAuth(req);
  if (!session) {
    res.statusCode = 302;
    res.setHeader('Location', '/login');
    return res.end();
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(PAGE_HTML);
};

const PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>WAOW Studio Story Publisher</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f5f1ea;
    color: #2f261f;
    margin: 0;
    padding: 0;
    font-size: 18px;
    line-height: 1.6;
  }
  header {
    background: #1f6d68;
    color: #fff;
    padding: 1.5em 2em;
  }
  header h1 { margin: 0; font-size: 1.6em; font-weight: 600; }
  header p  { margin: 0.4em 0 0 0; opacity: 0.9; font-size: 1em; }
  main { max-width: 980px; margin: 0 auto; padding: 2em 1.5em 4em; }
  .instructions {
    background: #fff;
    border-left: 6px solid #1f6d68;
    padding: 1.5em 1.75em;
    margin-bottom: 2em;
    border-radius: 4px;
    font-size: 1.05em;
  }
  .instructions h2 { margin: 0 0 0.6em 0; color: #1f6d68; font-size: 1.3em; }
  .instructions ol { margin: 0.4em 0 0 1.2em; padding: 0; }
  .instructions li { margin-bottom: 0.5em; }
  .toolbar {
    display: flex;
    gap: 0.75em;
    margin-bottom: 1.5em;
    flex-wrap: wrap;
    align-items: center;
  }
  .toolbar input[type="text"] {
    flex: 1;
    min-width: 220px;
    padding: 0.75em 1em;
    font-size: 1.05em;
    border: 2px solid #d4cabc;
    border-radius: 4px;
    background: #fff;
  }
  .toolbar button {
    padding: 0.75em 1.4em;
    font-size: 1.05em;
    border: none;
    background: #1f6d68;
    color: #fff;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }
  .toolbar button:hover { background: #195854; }
  .toolbar .logout {
    background: transparent;
    color: #1f6d68;
    border: 2px solid #1f6d68;
  }
  .status { font-size: 0.95em; color: #6a5a48; margin-bottom: 1em; }
  .card {
    background: #fff;
    border-radius: 6px;
    padding: 1.5em 1.75em;
    margin-bottom: 1.5em;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .card h3 { margin: 0 0 0.3em 0; font-size: 1.4em; color: #1f6d68; }
  .card .meta { color: #6a5a48; font-size: 0.95em; margin-bottom: 0.8em; }
  .card .thumbs { display: flex; gap: 8px; flex-wrap: wrap; margin: 0.5em 0 1em 0; }
  .card .thumbs img {
    width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #e5dccd;
  }
  .card .actions { display: flex; gap: 0.6em; flex-wrap: wrap; }
  .card button {
    padding: 0.7em 1.2em;
    font-size: 1em;
    border: 2px solid #1f6d68;
    background: #fff;
    color: #1f6d68;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }
  .card button.primary { background: #1f6d68; color: #fff; }
  .card button.copied  { background: #2e8b57; color: #fff; border-color: #2e8b57; }
  details { margin-top: 1em; }
  details summary {
    cursor: pointer;
    color: #1f6d68;
    font-weight: 500;
    padding: 0.4em 0;
  }
  .preview-frame {
    margin-top: 0.8em;
    padding: 1em;
    background: #faf7f1;
    border-radius: 4px;
    border: 1px dashed #d4cabc;
  }
  .empty { text-align: center; color: #6a5a48; padding: 3em 1em; }
</style>
</head>
<body>

<header>
  <h1>WAOW Studio Story Publisher</h1>
  <p>Copy each artist's story and paste it into Squarespace.</p>
</header>

<main>

  <div class="instructions">
    <h2>How to publish a studio story</h2>
    <ol>
      <li>Find the artist below (use the search box if needed).</li>
      <li>Click the green <strong>Copy Code</strong> button — it will turn dark green when copied.</li>
      <li>In Squarespace, open the page, add a <strong>Code</strong> block, and paste. Save the page.</li>
    </ol>
  </div>

  <div class="toolbar">
    <input id="search" type="text" placeholder="Search by name or email…" autocomplete="off">
    <button id="refresh">Refresh List</button>
    <button class="logout" id="logout">Log Out</button>
  </div>

  <div class="status" id="status">Loading approved artists…</div>
  <div id="list"></div>

</main>

<script>
let allStories = [];

function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );
}

function buildStorySnippet(story) {
  const safe = escapeHTML;
  const fullName = (safe(story.firstName) + ' ' + safe(story.lastName)).trim();
  const website  = story.website ? safe(story.website) : '';
  const websiteHref = website
    ? (website.startsWith('http') ? website : 'https://' + website)
    : '';

  const paragraphs = safe(story.studioStory)
    .split(/\\n\\s*\\n/)
    .map(p => '<p style="margin:0 0 1em 0;">' + p.replace(/\\n/g, '<br>') + '</p>')
    .join('');

  const imgs = Array.isArray(story.images)
    ? story.images
    : (story.image ? [story.image] : []);
  const heroImg = imgs[0];
  const extraImgs = imgs.slice(1);

  const heroHTML = heroImg
    ? '<div style="margin:0 0 1.5em 0;">' +
        '<img src="' + heroImg + '" alt="' + fullName + ' studio" ' +
             'style="width:100%; height:auto; display:block; border-radius:4px;">' +
      '</div>'
    : '';

  const gridHTML = extraImgs.length
    ? '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin:1.5em 0 0 0;">' +
        extraImgs.map(u =>
          '<img src="' + u + '" alt="' + fullName + ' studio" ' +
               'style="width:100%; height:auto; display:block; border-radius:4px;">'
        ).join('') +
      '</div>'
    : '';

  const websiteHTML = website
    ? '<p style="margin:0 0 1.5em 0;">' +
        '<a href="' + websiteHref + '" style="color:#1f6d68; text-decoration:underline;" target="_blank" rel="noopener">' +
          website +
        '</a>' +
      '</p>'
    : '';

  return (
'<div class="waow-studio-story" style="background:#f7f3ed; color:#2f261f; padding:2em; border-radius:6px; font-family:\\'Manrope\\',sans-serif; max-width:760px; margin:0 auto;">\\n' +
'  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Manrope:wght@400;500&display=swap" rel="stylesheet">\\n' +
'  <h2 style="font-family:\\'Cormorant Garamond\\',serif; color:#1f6d68; font-size:2em; margin:0 0 0.5em 0;">' + fullName + '</h2>\\n' +
   websiteHTML + '\\n' +
   heroHTML + '\\n' +
'  <div style="font-size:1.05em; line-height:1.7;">\\n' +
     paragraphs + '\\n' +
'  </div>\\n' +
   gridHTML + '\\n' +
'</div>'
  );
}

function renderList(stories) {
  const list = document.getElementById('list');
  if (!stories.length) {
    list.innerHTML = '<div class="empty">No approved artists match your search.</div>';
    return;
  }

  list.innerHTML = stories.map((s, i) => {
    const name = escapeHTML((s.firstName + ' ' + s.lastName).trim()) || '(no name)';
    const email = escapeHTML(s.email || '');
    const imgs = Array.isArray(s.images) ? s.images : (s.image ? [s.image] : []);
    const thumbs = imgs.length
      ? '<div class="thumbs">' +
          imgs.map(u => '<img src="' + u + '" alt="">').join('') +
        '</div>'
      : '';
    const snippet = buildStorySnippet(s);

    return (
      '<div class="card" data-idx="' + i + '">' +
        '<h3>' + name + '</h3>' +
        '<div class="meta">' + email + (imgs.length ? ' · ' + imgs.length + ' image' + (imgs.length>1?'s':'') : '') + '</div>' +
        thumbs +
        '<div class="actions">' +
          '<button class="primary copy-btn" data-idx="' + i + '">Copy Code</button>' +
          '<button class="preview-btn" data-idx="' + i + '">Preview how it will look</button>' +
        '</div>' +
        '<details class="preview" data-idx="' + i + '">' +
          '<summary style="display:none"></summary>' +
          '<div class="preview-frame">' + snippet + '</div>' +
        '</details>' +
        '<textarea class="snippet-source" data-idx="' + i + '" style="position:absolute; left:-9999px;">' + snippet + '</textarea>' +
      '</div>'
    );
  }).join('');

  // Wire up buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = btn.getAttribute('data-idx');
      const ta = document.querySelector('.snippet-source[data-idx="' + idx + '"]');
      try {
        await navigator.clipboard.writeText(ta.value);
      } catch (e) {
        ta.style.position = 'static';
        ta.select();
        document.execCommand('copy');
        ta.style.position = 'absolute';
      }
      btn.classList.add('copied');
      btn.textContent = '✓ Copied — now paste into Squarespace';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.textContent = 'Copy Code';
      }, 3500);
    });
  });

  document.querySelectorAll('.preview-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.getAttribute('data-idx');
      const det = document.querySelector('details.preview[data-idx="' + idx + '"]');
      det.open = !det.open;
      btn.textContent = det.open ? 'Hide preview' : 'Preview how it will look';
    });
  });
}

function applyFilter() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  if (!q) return renderList(allStories);
  const filtered = allStories.filter(s => {
    const hay = ((s.firstName||'') + ' ' + (s.lastName||'') + ' ' + (s.email||'')).toLowerCase();
    return hay.includes(q);
  });
  renderList(filtered);
}

async function load() {
  const status = document.getElementById('status');
  status.textContent = 'Loading approved artists…';
  try {
    const r = await fetch('/api/studio-stories-feed', { credentials: 'same-origin' });
    if (r.status === 401) { window.location.href = '/login'; return; }
    const data = await r.json();
    if (!data.ok) {
      status.textContent = 'Could not load: ' + (data.error || 'unknown error');
      return;
    }
    allStories = data.stories || [];
    status.textContent = allStories.length + ' approved artist' + (allStories.length===1?'':'s') + ' ready to publish.';
    renderList(allStories);
  } catch (e) {
    status.textContent = 'Network error: ' + e.message;
  }
}

document.getElementById('refresh').addEventListener('click', load);
document.getElementById('search').addEventListener('input', applyFilter);
document.getElementById('logout').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/login';
});

load();
</script>

</body>
</html>`;
