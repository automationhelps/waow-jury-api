// api/artistry-publisher.js
// Auth-protected publisher page for the WAOW Artistry section.
// Pulls data from /api/artistry-feed and generates Squarespace code blocks.

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
<title>WAOW Artistry Publisher</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f5f1ea;
  color: #2f261f;
  margin: 0; padding: 0;
  font-size: 18px;
  line-height: 1.6;
}
header {
  background: #4a2e1a;
  color: #fff;
  padding: 1.5em 2em;
}
header h1 { margin: 0; font-size: 1.6em; font-weight: 600; }
header p  { margin: 0.4em 0 0; opacity: 0.9; font-size: 1em; }
main { max-width: 980px; margin: 0 auto; padding: 2em 1.5em 4em; }
.instructions {
  background: #fff;
  border-left: 6px solid #4a2e1a;
  padding: 1.5em 1.75em;
  margin-bottom: 2em;
  border-radius: 4px;
  font-size: 1.05em;
}
.instructions h2 { margin: 0 0 0.6em; color: #4a2e1a; font-size: 1.3em; }
.instructions ol { margin: 0.4em 0 0 1.2em; padding: 0; }
.instructions li { margin-bottom: 0.5em; }
.toolbar {
  display: flex; gap: 0.75em;
  margin-bottom: 1.5em;
  flex-wrap: wrap; align-items: center;
}
.toolbar input[type="text"] {
  flex: 1; min-width: 220px;
  padding: 0.75em 1em; font-size: 1.05em;
  border: 2px solid #d4cabc; border-radius: 4px;
  background: #fff;
}
.toolbar button {
  padding: 0.75em 1.4em; font-size: 1.05em;
  border: none; background: #4a2e1a; color: #fff;
  border-radius: 4px; cursor: pointer; font-weight: 500;
}
.toolbar button:hover { background: #3a2214; }
.toolbar .logout {
  background: transparent; color: #4a2e1a;
  border: 2px solid #4a2e1a;
}
.status { font-size: 0.95em; color: #6a5a48; margin-bottom: 1em; }
.card {
  background: #fff; border-radius: 6px;
  padding: 1.5em 1.75em; margin-bottom: 1.5em;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.card-header { display: flex; gap: 1.25em; align-items: flex-start; margin-bottom: 0.75em; }
.card-header img.headshot {
  width: 72px; height: 72px; border-radius: 50%;
  object-fit: cover; border: 2px solid #e5dccd; flex-shrink: 0;
}
.card-header .name-block h3 { margin: 0 0 0.15em; font-size: 1.35em; color: #4a2e1a; }
.card-header .name-block .badges { display: flex; flex-wrap: wrap; gap: 6px; }
.badge {
  display: inline-block; background: #f0e8dc; color: #4a2e1a;
  font-size: 0.8em; font-weight: 700; padding: 0.2em 0.7em;
  border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em;
}
.badge.membership { background: #e8f0e8; color: #2a5a2a; }
.card .summary-text {
  font-size: 0.97em; color: #3a2e26; font-style: italic;
  margin-bottom: 0.6em;
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
  background: #faf7f1; border-radius: 4px; border: 1px dashed #d4cabc;
}
.empty { text-align: center; color: #6a5a48; padding: 3em 1em; }
</style>
</head>
<body>

<header>
  <h1>WAOW Artistry Publisher</h1>
  <p>Copy each artist's profile code and paste it into a Squarespace Code block.</p>
</header>

<main>
  <div class="instructions">
    <h2>How to publish an artist profile</h2>
    <ol>
      <li>Find the artist below (use search by name, medium, or membership).</li>
      <li>Click the green <strong>Copy Code</strong> button — it turns dark green when copied.</li>
      <li>In Squarespace, open the Artistry page, add a <strong>Code</strong> block, paste, and save.</li>
      <li>Each artist gets their own Code block. Arrange blocks in any order you like.</li>
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

// ── Squarespace code block generator ─────────────────────────────────────────
function buildSnippet(a) {
  const fullName = (esc(a.firstName) + ' ' + esc(a.lastName)).trim();
  const website  = esc(a.website || '');
  const websiteHref = normalizeUrl(website);

  // Badges row
  const mediumBadge = a.medium
    ? '<span style="display:inline-block;background:#f0e8dc;color:#4a2e1a;font-size:0.82em;font-weight:700;padding:0.2em 0.75em;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;margin-right:6px;">' + esc(a.medium) + '</span>'
    : '';
  const memberBadge = a.membershipType
    ? '<span style="display:inline-block;background:#e8f0e8;color:#2a5a2a;font-size:0.82em;font-weight:700;padding:0.2em 0.75em;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;">' + esc(a.membershipType) + '</span>'
    : '';
  const badgesHTML = (mediumBadge || memberBadge)
    ? '<p style="margin:0 0 0.75em 0;">' + mediumBadge + memberBadge + '</p>'
    : '';

  // Headshot
  const headshotHTML = a.headshot
    ? '<img src="' + a.headshot + '" alt="' + fullName + '" style="width:100px;height:100px;border-radius:50%;object-fit:cover;display:block;margin:0 0 1em 0;border:3px solid #e5dccd;">'
    : '';

  // Website link
  const websiteHTML = website
    ? '<p style="margin:0 0 0.5em 0;font-size:0.95em;">🌐 <a href="' + websiteHref + '" style="color:#4a2e1a;text-decoration:underline;" target="_blank" rel="noopener">' + website + '</a></p>'
    : '';

  // Summary (one sentence)
  const summaryHTML = a.summary
    ? '<p style="margin:0 0 1em 0;font-style:italic;color:#5a4a3a;font-size:1.05em;">' + esc(a.summary) + '</p>'
    : '';

  // Biography paragraphs
  const bioParas = esc(a.biography || '')
    .split(/\\n\\s*\\n/)
    .filter(p => p.trim())
    .map(p => '<p style="margin:0 0 0.9em 0;">' + p.replace(/\\n/g, '<br>') + '</p>')
    .join('');
  const bioHTML = bioParas
    ? '<div style="font-size:1em;line-height:1.75;margin-bottom:1em;">' + bioParas + '</div>'
    : '';

  // Artist statement (if different from bio)
  const statParas = esc(a.statement || '')
    .split(/\\n\\s*\\n/)
    .filter(p => p.trim())
    .map(p => '<p style="margin:0 0 0.9em 0;">' + p.replace(/\\n/g, '<br>') + '</p>')
    .join('');
  const statHTML = statParas
    ? '<div style="background:#faf7f1;border-left:4px solid #4a2e1a;padding:1em 1.25em;margin-bottom:1.5em;border-radius:0 4px 4px 0;">' +
        '<p style="margin:0 0 0.5em 0;font-size:0.85em;font-weight:700;color:#4a2e1a;text-transform:uppercase;letter-spacing:0.05em;">Artist Statement</p>' +
        statParas +
      '</div>'
    : '';

  // Works grid — each work gets its title below the image
  const worksHTML = (Array.isArray(a.works) && a.works.length)
    ? '<div style="margin-top:1.5em;">' +
        '<p style="margin:0 0 0.75em 0;font-size:0.85em;font-weight:700;color:#4a2e1a;text-transform:uppercase;letter-spacing:0.05em;">Works</p>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">' +
          a.works.map(w =>
            '<div style="text-align:center;">' +
              '<img src="' + w.image + '" alt="' + esc(w.title || fullName) + '" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;display:block;margin-bottom:0.4em;">' +
              (w.title ? '<p style="margin:0;font-size:0.88em;color:#5a4a3a;font-weight:500;">' + esc(w.title) + '</p>' : '') +
            '</div>'
          ).join('') +
        '</div>' +
      '</div>'
    : '';

  return (
'<div class="waow-artist" style="background:#f9f5f0;color:#2f261f;padding:2em;border-radius:6px;font-family:\\'Manrope\\',sans-serif;max-width:760px;margin:0 auto;">\\n' +
'<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">\\n' +
headshotHTML +
'<h2 style="font-family:\\'Cormorant Garamond\\',serif;color:#4a2e1a;font-size:2em;margin:0 0 0.35em 0;">' + fullName + '</h2>\\n' +
badgesHTML +
websiteHTML +
summaryHTML +
bioHTML +
statHTML +
worksHTML + '\\n' +
'</div>'
  );
}

// ── Render cards ──────────────────────────────────────────────────────────────
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

    const badges = [
      a.medium         ? '<span class="badge">' + esc(a.medium) + '</span>'         : '',
      a.membershipType ? '<span class="badge membership">' + esc(a.membershipType) + '</span>' : ''
    ].filter(Boolean).join('');

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

    return \`<div class="card" id="card-\${i}"
        data-name="\${esc(fullName).toLowerCase()}"
        data-medium="\${esc(a.medium || '').toLowerCase()}"
        data-membership="\${esc(a.membershipType || '').toLowerCase()}">
      <div class="card-header">
        \${headshotEl}
        <div class="name-block">
          <h3>\${fullName}</h3>
          <div class="badges">\${badges}</div>
        </div>
      </div>
      \${a.summary ? '<div class="summary-text">"' + esc(a.summary) + '"</div>' : ''}
      <div class="meta">\${websiteLink} · \${esc(a.email)}</div>
      \${workThumbs ? '<div class="works-thumbs">' + workThumbs + '</div>' : ''}
      <div class="actions">
        <button class="primary" onclick="copyCode(\${i})">Copy Code for Squarespace</button>
        <details>
          <summary>Preview</summary>
          <div class="preview-frame">\${buildSnippet(a)}</div>
        </details>
      </div>
    </div>\`;
  }).join('');
}

function copyCode(i) {
  const snippet = buildSnippet(allArtists[i]);
  navigator.clipboard.writeText(snippet).then(() => {
    const btn = document.querySelector('#card-' + i + ' button.primary');
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.classList.replace('primary', 'copied');
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.replace('copied', 'primary');
    }, 2500);
  }).catch(() => alert('Copy failed — please select and copy manually.'));
}

// ── Load & filter ─────────────────────────────────────────────────────────────
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
        const name   = ((a.firstName || '') + ' ' + (a.lastName || '')).toLowerCase();
        const medium = (a.medium || '').toLowerCase();
        const mem    = (a.membershipType || '').toLowerCase();
        return name.includes(q) || medium.includes(q) || mem.includes(q);
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
