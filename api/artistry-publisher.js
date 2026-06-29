// api/artistry-publisher.js
// Auth-protected publisher page for the WAOW Artistry section.
// Generates full artist profile HTML (matching Kim Casebeer layout) for Squarespace paste.

const { isAuthenticated } = require('../lib/auth');

module.exports = async (req, res) => {
  const session = isAuthenticated(req);
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
<title>WAOW Artistry Publisher</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f5f1ea; color: #2f261f;
  margin: 0; padding: 0; font-size: 18px; line-height: 1.6;
}
header { background: #4a2e1a; color: #fff; padding: 1.5em 2em; }
header h1 { margin: 0; font-size: 1.6em; font-weight: 600; }
header p  { margin: 0.4em 0 0; opacity: 0.9; font-size: 1em; }
main { max-width: 980px; margin: 0 auto; padding: 2em 1.5em 4em; }
.instructions {
  background: #fff; border-left: 6px solid #4a2e1a;
  padding: 1.5em 1.75em; margin-bottom: 2em; border-radius: 4px; font-size: 1.05em;
}
.instructions h2 { margin: 0 0 0.6em; color: #4a2e1a; font-size: 1.3em; }
.instructions ol { margin: 0.4em 0 0 1.2em; padding: 0; }
.instructions li { margin-bottom: 0.5em; }
.toolbar { display: flex; gap: 0.75em; margin-bottom: 1.5em; flex-wrap: wrap; align-items: center; }
.toolbar input[type="text"] {
  flex: 1; min-width: 220px; padding: 0.75em 1em; font-size: 1.05em;
  border: 2px solid #d4cabc; border-radius: 4px; background: #fff;
}
.toolbar button {
  padding: 0.75em 1.4em; font-size: 1.05em;
  border: none; background: #4a2e1a; color: #fff;
  border-radius: 4px; cursor: pointer; font-weight: 500;
}
.toolbar button:hover { background: #3a2214; }
.toolbar .logout { background: transparent; color: #4a2e1a; border: 2px solid #4a2e1a; }
.status { font-size: 0.95em; color: #6a5a48; margin-bottom: 1em; }
.card {
  background: #fff; border-radius: 6px;
  padding: 1.5em 1.75em; margin-bottom: 1.5em;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.card-header { display: flex; gap: 1.25em; align-items: flex-start; margin-bottom: 0.75em; }
.card-header img.headshot {
  width: 100px; height: 120px; border-radius: 8px;
  object-fit: cover; border: 1px solid #e5dccd; flex-shrink: 0;
}
.card-header .name-block h3 { margin: 0 0 0.15em; font-size: 1.35em; color: #4a2e1a; }
.card-header .name-block .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.badge {
  display: inline-block; background: #faf8f5; color: #332f2b;
  font-size: 0.78em; font-weight: 500; padding: 0.25em 0.75em;
  border-radius: 999px; border: 1px solid #ddd5ca;
}
.card .meta { color: #6a5a48; font-size: 0.9em; margin-bottom: 0.8em; }
.card .meta a { color: #4a2e1a; }
.works-thumbs { display: flex; gap: 8px; flex-wrap: wrap; margin: 0.5em 0 1em; }
.works-thumbs .work-thumb { text-align: center; }
.works-thumbs .work-thumb img {
  width: 72px; height: 72px; object-fit: cover;
  border-radius: 4px; border: 1px solid #e5dccd; display: block;
}
.works-thumbs .work-thumb span {
  display: block; font-size: 0.7em; color: #6a5a48;
  max-width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.card .actions { display: flex; gap: 0.6em; flex-wrap: wrap; margin-top: 0.75em; }
.card button {
  padding: 0.7em 1.2em; font-size: 1em;
  border: 2px solid #4a2e1a; background: #fff; color: #4a2e1a;
  border-radius: 4px; cursor: pointer; font-weight: 500;
}
.card button:hover { background: #f5f1ea; }
.card button.primary { background: #4a2e1a; color: #fff; }
.card button.primary:hover { background: #3a2214; }
.card button.copied  { background: #2e8b57; color: #fff; border-color: #2e8b57; }
details { margin-top: 0.75em; }
details summary { cursor: pointer; color: #4a2e1a; font-weight: 500; padding: 0.3em 0; }
.preview-frame {
  margin-top: 0.75em; padding: 1em;
  background: #f3f0eb; border-radius: 4px; border: 1px dashed #d4cabc;
  overflow: auto;
}
.empty { text-align: center; color: #6a5a48; padding: 3em 1em; }
</style>
</head>
<body>

<header>
  <h1>WAOW Artistry Publisher</h1>
  <p>Copy each artist's full profile code and paste it into a Squarespace Code block.</p>
</header>

<main>
  <div class="instructions">
    <h2>How to publish an artist profile</h2>
    <ol>
      <li>Find the artist below (use search by name, medium, or membership).</li>
      <li>Click the green <strong>Copy Code</strong> button — it turns dark green when copied.</li>
      <li>In Squarespace, open the Artistry page, add a <strong>Code</strong> block, paste, and save.</li>
      <li>Each artist gets their own Code block. Arrange blocks in any order.</li>
    </ol>
  </div>

  <div class="toolbar">
    <input id="search" type="text" placeholder="Search by name, medium, or membership…" autocomplete="off">
    <button id="refresh">Refresh List</button>
    <button class="logout" id="logout">Log Out</button>
  </div>

  <div class="status" id="status">Loading approved artists…</div>
  <div id="list"></div>
</main>

<script>
let allArtists = [];

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );
}

function normalizeUrl(u) {
  if (!u) return '';
  u = u.trim();
  if (!/^https?:\\/\\//.test(u)) u = 'https://' + u;
  return u;
}

function displayDomain(u) {
  try {
    return new URL(normalizeUrl(u)).hostname.replace(/^www\\./, '');
  } catch(e) { return u; }
}

// ── Full artist profile HTML generator (Kim Casebeer layout) ─────────────────
function buildSnippet(a) {
  const fullName    = (esc(a.firstName) + ' ' + esc(a.lastName)).trim();
  const website     = a.website || '';
  const websiteHref = normalizeUrl(website);
  const websiteDomain = website ? displayDomain(website) : '';

  // Meta pills
  const pills = [a.membershipType, a.medium]
    .filter(Boolean)
    .map(v => '<div class="meta-pill">' + esc(v) + '</div>')
    .join('\\n        ');

  // Biography paragraphs
  const bioParagraphs = (a.biography || '')
    .split(/\\n\\s*\\n/)
    .filter(p => p.trim())
    .map(p => '<p>' + esc(p).replace(/\\n/g, '<br>') + '</p>')
    .join('\\n        ');

  // Artist statement paragraphs
  const statParagraphs = (a.statement || '')
    .split(/\\n\\s*\\n/)
    .filter(p => p.trim())
    .map(p => '<p>' + esc(p).replace(/\\n/g, '<br>') + '</p>')
    .join('\\n        ');

  // Works grid articles
  const workArticles = (Array.isArray(a.works) ? a.works : [])
    .map((w, idx) => {
      const altText = esc(w.title ? w.title + ', artwork by ' + fullName : 'Artwork by ' + fullName);
      return '<article class="work-card">\\n' +
        '        <img src="' + w.image + '" alt="' + altText + '" ' +
          'onclick="openLightbox(\\'' + w.image + '\\', \\'' + altText + '\\')">\\n' +
        '        <div class="work-info">\\n' +
        '          <div class="work-title">' + esc(w.title || '') + '</div>\\n' +
        '        </div>\\n' +
        '      </article>';
    }).join('\\n      ');

  // Side panel detail rows
  const detailRows = [
    website ? { label: 'Website', value: '<a href="' + websiteHref + '" target="_blank" rel="noopener">' + esc(websiteDomain) + '</a>' } : null,
    a.membershipType ? { label: 'Membership Type', value: esc(a.membershipType) } : null,
    a.medium ? { label: 'Art Medium / Discipline', value: esc(a.medium) } : null,
  ].filter(Boolean).map(row =>
    '<div class="detail-row">\\n' +
    '          <div class="detail-label">' + row.label + '</div>\\n' +
    '          <div class="detail-value">' + row.value + '</div>\\n' +
    '        </div>'
  ).join('\\n        ');

  const headshotSrc = a.headshot || '';

  return '<!DOCTYPE html>\\n' +
'<html lang="en">\\n' +
'<head>\\n' +
'  <meta charset="UTF-8" />\\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\\n' +
'  <title>' + fullName + ' | WAOW Artist Profile</title>\\n' +
'  <style>\\n' +
'    :root{--bg:#f3f0eb;--panel:#ffffff;--text:#161616;--muted:#666;--line:#ddd5ca;--accent:#1c1c1c;--shadow:0 10px 30px rgba(0,0,0,.08);--max:1200px;}\\n' +
'    *{box-sizing:border-box;}\\n' +
'    body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;}\\n' +
'    a{color:inherit;text-decoration:none;}\\n' +
'    img{max-width:100%;display:block;}\\n' +
'    .page-wrap{max-width:var(--max);margin:0 auto;padding:36px 20px 80px;}\\n' +
'    .artist-hero{display:grid;grid-template-columns:minmax(280px,360px) minmax(0,1fr);gap:40px;margin-bottom:42px;align-items:start;}\\n' +
'    .artist-headshot img{width:100%;border-radius:20px;object-fit:cover;aspect-ratio:4/5;box-shadow:var(--shadow);}\\n' +
'    .artist-name{font-family:Georgia,"Times New Roman",serif;font-size:60px;line-height:1.12;font-weight:400;margin:0 0 26px;letter-spacing:-0.3px;}\\n' +
'    .artist-meta{display:flex;flex-wrap:wrap;gap:12px 14px;margin:14px 0 20px;}\\n' +
'    .meta-pill{display:inline-flex;align-items:center;padding:10px 16px;border-radius:999px;border:1px solid var(--line);background:#faf8f5;font-size:14px;line-height:1;color:#332f2b;}\\n' +
'    .artist-summary{font-size:17px;line-height:1.65;margin-top:6px;margin-bottom:22px;max-width:760px;}\\n' +
'    .artist-summary p{margin:0 0 14px;}\\n' +
'    .artist-summary p:last-child{margin-bottom:0;}\\n' +
'    .btn{display:inline-block;padding:12px 20px;border-radius:999px;background:#1c1c1c;color:#fff;font-weight:600;}\\n' +
'    .bio-section{margin-bottom:50px;}\\n' +
'    .artist-bio-card{max-width:100%;margin:0;padding:30px 32px;background:#fff;border-radius:22px;box-shadow:var(--shadow);}\\n' +
'    .content-grid{display:grid;grid-template-columns:1.35fr .85fr;gap:30px;margin-bottom:50px;}\\n' +
'    .main-panel,.side-panel{background:#fff;padding:30px 32px;border-radius:22px;box-shadow:var(--shadow);}\\n' +
'    .section-title{font-family:Georgia,"Times New Roman",serif;font-size:34px;font-weight:400;line-height:1.25;margin:0 0 18px;}\\n' +
'    .artist-bio,.statement-text{font-size:17px;line-height:1.75;letter-spacing:0.2px;color:#242424;}\\n' +
'    .artist-bio p,.statement-text p{margin:0 0 16px;}\\n' +
'    .artist-bio p:last-child,.statement-text p:last-child{margin-bottom:0;}\\n' +
'    .details-list{display:grid;gap:16px;}\\n' +
'    .detail-row{padding-bottom:16px;border-bottom:1px solid var(--line);}\\n' +
'    .detail-row:last-child{border-bottom:none;padding-bottom:0;}\\n' +
'    .detail-label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#777;margin-bottom:6px;}\\n' +
'    .detail-value{font-size:16px;word-break:break-word;}\\n' +
'    .gallery-section{margin-top:8px;}\\n' +
'    .gallery-title-wrap{margin-bottom:20px;}\\n' +
'    .gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}\\n' +
'    .work-card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:var(--shadow);height:100%;}\\n' +
'    .work-card img{width:100%;aspect-ratio:1/1;object-fit:cover;cursor:pointer;}\\n' +
'    .work-info{padding:14px 16px 16px;min-height:56px;}\\n' +
'    .work-title{font-size:16px;font-weight:700;line-height:1.35;}\\n' +
'    .lightbox{display:none;position:fixed;z-index:9999;inset:0;background:rgba(0,0,0,0.88);align-items:center;justify-content:center;padding:24px;cursor:pointer;}\\n' +
'    .lightbox img{max-width:92%;max-height:92%;border-radius:12px;}\\n' +
'    @media(max-width:1024px){.artist-name{font-size:52px;}.gallery-grid{grid-template-columns:repeat(2,1fr);}}\\n' +
'    @media(max-width:800px){.artist-hero,.content-grid{grid-template-columns:1fr;}.artist-name{font-size:42px;}}\\n' +
'    @media(max-width:560px){.page-wrap{padding:24px 16px 60px;}.artist-name{font-size:36px;}.gallery-grid{grid-template-columns:1fr;}}\\n' +
'  </style>\\n' +
'</head>\\n' +
'<body>\\n' +
'<div class="page-wrap">\\n' +
'\\n' +
'  <section class="artist-hero">\\n' +
'    <div class="artist-headshot">\\n' +
(headshotSrc ? '      <img src="' + headshotSrc + '" alt="Portrait of ' + fullName + '">\\n' : '') +
'    </div>\\n' +
'    <div class="artist-info">\\n' +
'      <div class="artist-name">' + fullName + '</div>\\n' +
'      <div class="artist-meta">\\n' +
'        ' + pills + '\\n' +
'      </div>\\n' +
(bioParagraphs ? '      <div class="artist-summary">\\n        ' + bioParagraphs + '\\n      </div>\\n' : '') +
(websiteHref ? '      <a href="' + websiteHref + '" target="_blank" rel="noopener" class="btn">Visit Artist Website</a>\\n' : '') +
'    </div>\\n' +
'  </section>\\n' +
'\\n' +
(statParagraphs ?
'  <section class="bio-section">\\n' +
'    <div class="artist-bio-card">\\n' +
'      <div class="section-title">Biography</div>\\n' +
'      <div class="artist-bio">\\n' +
'        ' + statParagraphs + '\\n' +
'      </div>\\n' +
'    </div>\\n' +
'  </section>\\n\\n' : '') +
'  <section class="content-grid">\\n' +
'    <div class="main-panel">\\n' +
'      <div class="section-title">Artist Statement</div>\\n' +
'      <div class="statement-text">\\n' +
(bioParagraphs ? '        ' + bioParagraphs : '<p></p>') + '\\n' +
'      </div>\\n' +
'    </div>\\n' +
'    <div class="side-panel">\\n' +
'      <div class="section-title">Artist Details</div>\\n' +
'      <div class="details-list">\\n' +
'        ' + detailRows + '\\n' +
'      </div>\\n' +
'    </div>\\n' +
'  </section>\\n' +
'\\n' +
(workArticles ?
'  <section class="gallery-section">\\n' +
'    <div class="gallery-title-wrap">\\n' +
'      <div class="section-title">Selected Artwork</div>\\n' +
'    </div>\\n' +
'    <div class="gallery-grid">\\n' +
'      ' + workArticles + '\\n' +
'    </div>\\n' +
'  </section>\\n' : '') +
'\\n' +
'</div>\\n' +
'\\n' +
'<div id="lightbox" class="lightbox" onclick="closeLightbox()">\\n' +
'  <img id="lightbox-img" src="" alt="">\\n' +
'</div>\\n' +
'\\n' +
'<script>\\n' +
'  function openLightbox(src, alt) {\\n' +
'    var lb = document.getElementById(\\'lightbox\\');\\n' +
'    var img = document.getElementById(\\'lightbox-img\\');\\n' +
'    img.src = src; img.alt = alt || \\'\\';\\n' +
'    lb.style.display = \\'flex\\';\\n' +
'  }\\n' +
'  function closeLightbox() {\\n' +
'    var lb = document.getElementById(\\'lightbox\\');\\n' +
'    var img = document.getElementById(\\'lightbox-img\\');\\n' +
'    lb.style.display = \\'none\\'; img.src = \\'\\'; img.alt = \\'\\';\\n' +
'  }\\n' +
'  document.addEventListener(\\'keydown\\', function(e) { if (e.key === \\'Escape\\') closeLightbox(); });\\n' +
'<\\/script>\\n' +
'</body>\\n' +
'</html>';
}

// ── Render publisher cards ────────────────────────────────────────────────────
function renderList(artists) {
  const listEl   = document.getElementById('list');
  const statusEl = document.getElementById('status');

  if (!artists.length) {
    statusEl.textContent = '0 approved artists found.';
    listEl.innerHTML = '<div class="empty"><p>No approved artists yet.</p><p>Tag an artist <strong>artistry-approved</strong> in GHL, then click Refresh.</p></div>';
    return;
  }

  statusEl.textContent = artists.length + ' artist' + (artists.length === 1 ? '' : 's') + ' ready to publish.';

  listEl.innerHTML = artists.map((a, i) => {
    const fullName = (esc(a.firstName) + ' ' + esc(a.lastName)).trim() || '(No name)';

    const headshotEl = a.headshot
      ? '<img class="headshot" src="' + a.headshot + '" alt="' + fullName + '">'
      : '';

    const badges = [a.medium, a.membershipType]
      .filter(Boolean)
      .map(v => '<span class="badge">' + esc(v) + '</span>')
      .join('');

    const websiteLink = a.website
      ? '<a href="' + esc(normalizeUrl(a.website)) + '" target="_blank" rel="noopener">' + esc(a.website) + '</a>'
      : '—';

    const workThumbs = (Array.isArray(a.works) && a.works.length)
      ? a.works.slice(0, 6).map(w =>
          '<div class="work-thumb">' +
            '<img src="' + w.image + '" alt="' + esc(w.title) + '" loading="lazy">' +
            '<span>' + esc(w.title) + '</span>' +
          '</div>'
        ).join('')
      : '';

    return '<div class="card" id="card-' + i + '"' +
        ' data-name="' + esc(fullName).toLowerCase() + '"' +
        ' data-medium="' + esc(a.medium || '').toLowerCase() + '"' +
        ' data-membership="' + esc(a.membershipType || '').toLowerCase() + '">' +
      '<div class="card-header">' +
        headshotEl +
        '<div class="name-block">' +
          '<h3>' + fullName + '</h3>' +
          '<div class="badges">' + badges + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="meta">' + websiteLink + ' &middot; ' + esc(a.email) + '</div>' +
      (workThumbs ? '<div class="works-thumbs">' + workThumbs + '</div>' : '') +
      '<div class="actions">' +
        '<button class="primary" onclick="copyCode(' + i + ')">Copy Code for Squarespace</button>' +
        '<details>' +
          '<summary>Preview profile</summary>' +
          '<div class="preview-frame">' + buildSnippet(a) + '</div>' +
        '</details>' +
      '</div>' +
    '</div>';
  }).join('');
}

function copyCode(i) {
  const snippet = buildSnippet(allArtists[i]);
  navigator.clipboard.writeText(snippet).then(() => {
    const btn = document.querySelector('#card-' + i + ' button.primary');
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = '\\u2713 Copied!';
    btn.classList.replace('primary', 'copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.replace('copied', 'primary'); }, 2500);
  }).catch(() => alert('Copy failed — please select and copy manually.'));
}

async function loadArtists() {
  document.getElementById('status').textContent = 'Loading approved artists…';
  document.getElementById('list').innerHTML = '';
  try {
    const resp = await fetch('/api/artistry-feed', { credentials: 'same-origin' });
    if (resp.status === 401) { window.location.href = '/login'; return; }
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'Unknown error');
    allArtists = data.artists || [];
    applySearch();
  } catch (e) {
    document.getElementById('status').textContent = 'Error: ' + e.message;
  }
}

function applySearch() {
  const q = (document.getElementById('search').value || '').toLowerCase().trim();
  const filtered = q
    ? allArtists.filter(a => {
        const name = ((a.firstName || '') + ' ' + (a.lastName || '')).toLowerCase();
        return name.includes(q) || (a.medium || '').toLowerCase().includes(q) || (a.membershipType || '').toLowerCase().includes(q);
      })
    : allArtists;
  renderList(filtered);
}

document.getElementById('refresh').addEventListener('click', loadArtists);
document.getElementById('search').addEventListener('input', applySearch);
document.getElementById('logout').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/login';
});

loadArtists();
</script>
</body>
</html>`;
