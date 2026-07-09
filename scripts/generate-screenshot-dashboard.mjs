import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, "../screenshots");

const LABEL_MAP = {
  "de-home": "DE Home",
  "us-home": "US Home",
  "de-publisher": "DE Publisher Details",
  "de-series": "DE Series Details",
  "de-issue": "DE Issue Details",
  "filter-de": "DE Filter Page",
  "filter-us": "US Filter Page",
  "login": "Login Page",
  "search": "Search Suggestions",
  "sidebar-open": "Mobile Sidebar Open",
  "sidebar-closed": "Desktop Sidebar Closed",
  "filter-expanded": "Mobile Filter Expanded"
};

async function run() {
  console.log("Generating Screenshot Review Dashboard...");
  
  let files;
  try {
    files = await fs.readdir(screenshotsDir);
  } catch (error) {
    console.error(`Could not read screenshots directory at ${screenshotsDir}:`, error.message);
    return;
  }

  // Clean up old screenshots that don't match the new [viewport]-[theme]-[rest] format
  for (const file of files) {
    if (file.endsWith(".png") && file !== "dashboard.png") {
      const parts = file.split("-");
      if (parts.length > 1) {
        const theme = parts[1];
        if (theme !== "light" && theme !== "dark") {
          try {
            await fs.unlink(path.join(screenshotsDir, file));
            console.log(`Cleaned up old screenshot format: ${file}`);
          } catch (e) {
            console.error(`Could not delete ${file}:`, e.message);
          }
        }
      }
    }
  }

  // Re-read files after cleanup
  files = await fs.readdir(screenshotsDir);
  const pngFiles = files.filter(f => f.endsWith(".png") && f !== "dashboard.png");

  // Parse details for each screenshot
  const screenshots = [];
  for (const filename of pngFiles) {
    const parts = filename.replace(".png", "").split("-");
    if (parts.length < 3) continue;

    const viewport = parts[0]; // desktop or mobile
    const theme = parts[1]; // light or dark
    
    // Ignore any files that don't match the theme format
    if (theme !== "light" && theme !== "dark") continue;
    
    let isInteractive = false;
    let key = "";
    
    if (parts[2] === "interactive") {
      isInteractive = true;
      key = parts.slice(3).join("-");
    } else {
      key = parts.slice(2).join("-");
    }

    const label = LABEL_MAP[key] ?? (key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, " "));

    screenshots.push({
      filename,
      viewport,
      theme,
      isInteractive,
      label
    });
  }

  // Group screenshots by viewport and label
  const groupsMap = new Map();
  for (const s of screenshots) {
    const groupKey = `${s.viewport}::${s.label}::${s.isInteractive ? "Interactive" : "Static"}`;
    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        viewport: s.viewport,
        label: s.label,
        isInteractive: s.isInteractive,
        light: null,
        dark: null
      });
    }
    const group = groupsMap.get(groupKey);
    if (s.theme === "light") group.light = s.filename;
    if (s.theme === "dark") group.dark = s.filename;
  }

  const groups = Array.from(groupsMap.values());

  // Sort groups: static first (grouped alphabetically), interactive next
  groups.sort((a, b) => {
    if (a.isInteractive !== b.isInteractive) {
      return a.isInteractive ? 1 : -1;
    }
    return a.label.localeCompare(b.label);
  });

  // Generate HTML with premium styling
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shortbox Visual Audit Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #f8fafc;
      --text-color: #0f172a;
      --card-bg: #ffffff;
      --border-color: #e2e8f0;
      --primary-color: #3b82f6;
      --primary-hover: #2563eb;
      --badge-static: #10b981;
      --badge-interactive: #8b5cf6;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #0b0f19;
        --text-color: #f1f5f9;
        --card-bg: #161e2e;
        --border-color: #2e3b4e;
        --primary-color: #3b82f6;
        --primary-hover: #60a5fa;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      line-height: 1.5;
      padding: 2rem 1.5rem;
      transition: background-color 0.3s, color 0.3s;
    }

    header {
      max-width: 1400px;
      margin: 0 auto 2.5rem auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .title-area {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    h1 {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.025em;
    }

    .subtitle {
      font-size: 1.05rem;
      opacity: 0.7;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      padding: 1rem;
      border-radius: 1rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .control-label {
      font-size: 0.85rem;
      font-weight: 600;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .btn-group {
      display: flex;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .btn {
      background: transparent;
      border: none;
      color: var(--text-color);
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn:not(:last-child) {
      border-right: 1px solid var(--border-color);
    }

    .btn.active {
      background: var(--primary-color);
      color: white;
    }

    .btn:hover:not(.active) {
      background: rgba(0, 0, 0, 0.05);
    }

    @media (prefers-color-scheme: dark) {
      .btn:hover:not(.active) {
        background: rgba(255, 255, 255, 0.05);
      }
    }

    .main-grid {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 3rem;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 1.25rem;
      overflow: hidden;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      margin-bottom: 2rem;
    }

    .card-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
    }

    .badges {
      display: flex;
      gap: 0.5rem;
    }

    .badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge.viewport-desktop {
      background-color: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
    }

    .badge.viewport-mobile {
      background-color: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    .badge.type-static {
      background-color: rgba(16, 185, 129, 0.15);
      color: var(--badge-static);
    }

    .badge.type-interactive {
      background-color: rgba(139, 92, 246, 0.15);
      color: var(--badge-interactive);
    }

    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      padding: 1.5rem;
    }

    @media (max-width: 900px) {
      .comparison-grid {
        grid-template-columns: 1fr;
      }
    }

    .screenshot-pane {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .pane-title {
      font-size: 0.9rem;
      font-weight: 600;
      opacity: 0.8;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pane-title::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .pane-title.light::before {
      background-color: #e2e8f0;
      border: 1px solid #94a3b8;
    }

    .pane-title.dark::before {
      background-color: #0f172a;
    }

    .image-wrapper {
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      overflow: hidden;
      background-color: #0b0f19;
      cursor: zoom-in;
      position: relative;
      aspect-ratio: 16 / 10;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .card.mobile-card .image-wrapper {
      aspect-ratio: 9 / 16;
      max-height: 700px;
    }

    .image-wrapper img {
      width: 100%;
      height: auto;
      display: block;
      transition: transform 0.2s;
    }

    .image-wrapper:hover img {
      transform: scale(1.015);
    }

    .image-placeholder {
      padding: 3rem;
      text-align: center;
      opacity: 0.5;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      background: var(--bg-color);
    }

    /* Modal Overlay for Zooming */
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 2rem;
      cursor: zoom-out;
    }

    .modal-content {
      max-width: 90%;
      max-height: 90%;
      border-radius: 0.75rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 2px solid rgba(255, 255, 255, 0.1);
      overflow-y: auto;
    }

    .modal-content img {
      width: 100%;
      height: auto;
      display: block;
    }

    /* Filters System */
    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>

  <header>
    <div class="title-area">
      <h1>Shortbox Visual Audit</h1>
      <p class="subtitle">Automatische Gegenüberstellung aller Routen, Geräte-Layouts und Farbmodi zur Qualitätssicherung.</p>
    </div>

    <div class="controls">
      <div class="control-group">
        <span class="control-label">Viewport</span>
        <div class="btn-group">
          <button class="btn active" onclick="filterViewport('all', this)">Alle</button>
          <button class="btn" onclick="filterViewport('desktop', this)">Desktop</button>
          <button class="btn" onclick="filterViewport('mobile', this)">Mobile</button>
        </div>
      </div>

      <div class="control-group">
        <span class="control-label">Typ</span>
        <div class="btn-group">
          <button class="btn active" onclick="filterType('all', this)">Alle</button>
          <button class="btn" onclick="filterType('static', this)">Statisch</button>
          <button class="btn" onclick="filterType('interactive', this)">Interaktiv</button>
        </div>
      </div>
    </div>
  </header>

  <main class="main-grid">
    <div>
      <h2 class="section-title">Audit Review Cards</h2>
      
      ${groups.map(g => `
        <div class="card ${g.viewport === "mobile" ? "mobile-card" : ""}" data-viewport="${g.viewport}" data-type="${g.isInteractive ? "interactive" : "static"}">
          <div class="card-header">
            <span class="card-title">${g.label}</span>
            <div class="badges">
              <span class="badge viewport-${g.viewport}">${g.viewport}</span>
              <span class="badge type-${g.isInteractive ? "interactive" : "static"}">${g.isInteractive ? "Interaktiv" : "Statisch"}</span>
            </div>
          </div>
          <div class="comparison-grid">
            
            <div class="screenshot-pane">
              <div class="pane-title light">Light Mode</div>
              <div class="image-wrapper" onclick="zoomImage(this)">
                ${g.light ? `<img src="${g.light}?t=${Date.now()}" alt="${g.label} Light" loading="lazy">` : `<div class="image-placeholder">Kein Light Mode Screenshot vorhanden</div>`}
              </div>
            </div>

            <div class="screenshot-pane">
              <div class="pane-title dark">Dark Mode</div>
              <div class="image-wrapper" onclick="zoomImage(this)">
                ${g.dark ? `<img src="${g.dark}?t=${Date.now()}" alt="${g.label} Dark" loading="lazy">` : `<div class="image-placeholder">Kein Dark Mode Screenshot vorhanden</div>`}
              </div>
            </div>

          </div>
        </div>
      `).join("")}
    </div>
  </main>

  <div id="zoomModal" class="modal" onclick="closeZoom()">
    <div class="modal-content" onclick="event.stopPropagation()">
      <img id="zoomedImg" src="" alt="Zoomed view">
    </div>
  </div>

  <script>
    let activeViewport = 'all';
    let activeType = 'all';

    function filterViewport(viewport, element) {
      activeViewport = viewport;
      applyFilters();
      
      // Update buttons
      const buttons = element.parentNode.querySelectorAll('.btn');
      buttons.forEach(btn => btn.classList.remove('active'));
      element.classList.add('active');
    }

    function filterType(type, element) {
      activeType = type;
      applyFilters();

      // Update buttons
      const buttons = element.parentNode.querySelectorAll('.btn');
      buttons.forEach(btn => btn.classList.remove('active'));
      element.classList.add('active');
    }

    function applyFilters() {
      const cards = document.querySelectorAll('.card');
      cards.forEach(card => {
        const vp = card.getAttribute('data-viewport');
        const ty = card.getAttribute('data-type');
        
        const matchesViewport = (activeViewport === 'all' || vp === activeViewport);
        const matchesType = (activeType === 'all' || ty === activeType);
        
        if (matchesViewport && matchesType) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    }

    function zoomImage(wrapper) {
      const img = wrapper.querySelector('img');
      if (!img) return;
      
      const modal = document.getElementById('zoomModal');
      const zoomedImg = document.getElementById('zoomedImg');
      
      zoomedImg.src = img.src;
      modal.style.display = 'flex';
    }

    function closeZoom() {
      const modal = document.getElementById('zoomModal');
      modal.style.display = 'none';
    }

    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        closeZoom();
      }
    });
  </script>
</body>
</html>`;

  await fs.writeFile(path.join(screenshotsDir, "index.html"), html, "utf8");
  console.log(`Successfully generated visual audit dashboard at: ${path.join(screenshotsDir, "index.html")}`);
}

run().catch(console.error);
