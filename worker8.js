// ======= Cloudflare Worker: Pro Panel v1 (Auth + Source Manager + Sub Output + Filters + Tools) =======
// Password for the panel login
const PASSWORD = "12345678"; // change me

// Optional KV binding: Bind a KV namespace named "SUBS" in Worker settings.
// KV keys used: "sources" (JSON array of source URLs)
let MEMORY_SOURCES = [
  // default sample (you can remove/keep)
  "https://raw.githubusercontent.com/soroushmirzaei/telegram-configs-collector/refs/heads/main/protocols/vmess",
  "https://raw.githubusercontent.com/soroushmirzaei/telegram-configs-collector/refs/heads/main/protocols/trojan",
  "https://raw.githubusercontent.com/Surfboardv2ray/Proxy-sorter/main/ws_tls/proxies/wstls"
];

// ---------------- Utilities ----------------
function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp("(^|; )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}
function setCookie(name, value, maxAgeSeconds = 3600) {
  return `${name}=${value}; Path=/; HttpOnly; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}
function json(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8", ...headers }
  });
}
function html(content, status=200, headers={}) {
  return new Response(content, {
    status,
    headers: { "Content-Type": "text/html; charset=UTF-8", ...headers }
  });
}
function text(s, status=200, headers={}) {
  return new Response(s, {
    status,
    headers: { "Content-Type": "text/plain; charset=UTF-8", ...headers }
  });
}
function b64decode(str) {
  try { return atob(str); } catch { return ""; }
}
function b64encode(str) {
  try { return btoa(str); } catch { return ""; }
}
function safeJSON(str) {
  try { return JSON.parse(str); } catch { return null; }
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i=a.length-1; i>0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function chunk(arr, size) {
  const res = [];
  for (let i=0;i<arr.length;i+=size) res.push(arr.slice(i, i+size));
  return res;
}

// KV helpers
async function loadSources(env) {
  if (env.SUBS) {
    const s = await env.SUBS.get("sources");
    if (!s) return MEMORY_SOURCES.slice();
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr;
    } catch {}
    return MEMORY_SOURCES.slice();
  } else {
    return MEMORY_SOURCES.slice();
  }
}
async function saveSources(env, arr) {
  if (!Array.isArray(arr)) arr = [];
  if (env.SUBS) {
    await env.SUBS.put("sources", JSON.stringify(arr));
  } else {
    MEMORY_SOURCES = arr.slice();
  }
}

// ---------------- Clash JSON Builder (Clash accepts JSON config) ----------------
function buildClashJSON(proxies) {
  const proxyNames = proxies.map(p => p.name);
  const cfg = {
    "mixed-port": 7890,
    "allow-lan": false,
    "mode": "rule",
    "ipv6": false,
    "log-level": "info",
    "external-controller": "0.0.0.0:9090",
    "dns": {
      "enable": true,
      "listen": "0.0.0.0:53",
      "ipv6": false,
      "default-nameserver": ["223.5.5.5","114.114.114.114"],
      "nameserver": ["223.5.5.5","114.114.114.114","119.29.29.29","180.76.76.76"],
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/16",
      "fake-ip-filter": [
        "*.lan","*.localdomain","*.example","*.invalid","*.localhost","*.test",
        "*.local","*.home.arpa","router.asus.com","localhost.sec.qq.com",
        "localhost.ptlogin2.qq.com","+.msftconnecttest.com"
      ]
    },
    "tun": {
      "enable": true,
      "stack": "system",
      "auto-route": true,
      "auto-detect-interface": true,
      "dns-hijack": ["114.114.114.114","180.76.76.76","119.29.29.29","223.5.5.5","8.8.8.8","8.8.4.4","1.1.1.1","1.0.0.1"]
    },
    "proxies": proxies,
    "proxy-groups": [
      { "name": "Proxy-Select", "type": "select", "proxies": ["Auto-Select","DIRECT"].concat(proxyNames) },
      { "name": "Auto-Select", "type": "url-test", "url": "http://www.gstatic.com/generate_204", "proxies": proxyNames, "interval": 300, "tolerance": 5000 },
      { "name": "Direct", "type": "select", "proxies": ["DIRECT","Proxy-Select","Auto-Select"]},
      { "name": "Reject", "type": "select", "proxies": ["REJECT","DIRECT"]},
      { "name": "Final", "type": "select", "proxies": ["Proxy-Select","Direct","Auto-Select"].concat(proxyNames)}
    ],
    "rules": [
      "DOMAIN-SUFFIX,localhost,Direct",
      "IP-CIDR,192.168.0.0/16,Direct,no-resolve",
      "MATCH,Final"
    ]
  };
  return JSON.stringify(cfg, null, 2);
}

// ---------------- Parsers (vless, vmess, trojan, ss) => Clash proxy dicts ----------------
function cleanName(s) {
  return (s || "").replace(/[^\w\s-]/g, "").trim() || "Proxy";
}

function parseVLESS(line) {
  try {
    const url = new URL(line);
    const uuid = decodeURIComponent(url.username || "");
    const server = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : 443;
    const q = url.searchParams;

    const p = {
      name: cleanName(q.get("sni") || server || "vless"),
      type: "vless",
      server,
      port,
      uuid,
      udp: true,
      encryption: "none"
    };
    const security = q.get("security");
    if (security === "tls") {
      p.tls = true;
      const sni = q.get("sni");
      if (sni) p.servername = sni;
    }
    const type = q.get("type");
    if (type === "ws") {
      p.network = "ws";
      p["ws-opts"] = {};
      const path = q.get("path");
      if (path) p["ws-opts"].path = path;
      const host = q.get("host");
      if (host) p["ws-opts"].headers = { Host: host };
    } else if (type === "grpc") {
      p.network = "grpc";
    } else {
      p.network = "tcp";
    }
    return p;
  } catch { return null; }
}

function parseVMESS(line) {
  try {
    const b = line.slice("vmess://".length);
    const decoded = b64decode(b);
    const info = safeJSON(decoded);
    if (!info) return null;
    const p = {
      name: cleanName(info.ps || info.add || "vmess"),
      type: "vmess",
      server: info.add,
      port: parseInt(info.port || "443", 10),
      uuid: info.id,
      alterId: parseInt(info.aid || "0", 10),
      cipher: "auto",
      udp: true
    };
    if (info.tls === "tls") {
      p.tls = true;
      if (info.sni) p.servername = info.sni;
    }
    if (info.net === "ws") {
      p.network = "ws";
      p["ws-opts"] = { path: info.path || "/" };
      if (info.host) p["ws-opts"].headers = { Host: info.host };
    } else {
      p.network = info.net || "tcp";
    }
    return p;
  } catch { return null; }
}

function parseTROJAN(line) {
  try {
    const url = new URL(line);
    const pass = decodeURIComponent(url.username || "");
    const server = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : 443;
    const q = url.searchParams;

    const p = {
      name: cleanName(q.get("sni") || server || "trojan"),
      type: "trojan",
      server,
      port,
      password: pass,
      udp: true
    };
    const security = q.get("security");
    if (security === "tls") p.tls = true;

    const type = q.get("type");
    if (type === "ws") {
      p.network = "ws";
      p["ws-opts"] = {};
      const path = q.get("path");
      if (path) p["ws-opts"].path = path;
      const host = q.get("host");
      if (host) p["ws-opts"].headers = { Host: host };
    } else {
      p.network = "tcp";
    }
    const sni = q.get("sni");
    if (sni) p.sni = sni;
    return p;
  } catch { return null; }
}

function parseSS(line) {
  try {
    // Try URL form
    let working = line;
    let name = "ss";
    const hidx = line.indexOf("#");
    if (hidx !== -1) {
      name = cleanName(decodeURIComponent(line.slice(hidx + 1)));
      working = line.slice(0, hidx);
    }
    const url = new URL(working);
    let method = "";
    let password = "";
    if (url.username && url.password) {
      method = decodeURIComponent(url.username);
      password = decodeURIComponent(url.password);
    } else {
      // maybe base64(method:password) before '@'
      const raw = working.replace("ss://", "");
      const b64 = raw.split("@")[0];
      const decoded = b64decode(b64);
      if (decoded.includes(":")) {
        const m = decoded.split(":");
        method = m[0]; password = m.slice(1).join(":");
      }
    }
    return {
      name,
      type: "ss",
      server: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 8388,
      cipher: method || "aes-128-gcm",
      password: password || "password"
    };
  } catch { return null; }
}

function parseLinesToProxies(lines, filterSet) {
  const proxies = [];
  const nameCount = {};
  const allow = filterSet && filterSet.size ? filterSet : null;

  for (const raw of lines) {
    const line = (raw || "").trim();
    if (!line) continue;
    let p = null;

    if (line.startsWith("vless://")) {
      if (!allow || allow.has("vless")) p = parseVLESS(line);
    } else if (line.startsWith("vmess://")) {
      if (!allow || allow.has("vmess")) p = parseVMESS(line);
    } else if (line.startsWith("trojan://")) {
      if (!allow || allow.has("trojan")) p = parseTROJAN(line);
    } else if (line.startsWith("ss://")) {
      if (!allow || allow.has("ss")) p = parseSS(line);
    } else {
      continue;
    }

    if (!p) continue;

    // dedupe name
    let base = p.name || "Proxy";
    if (nameCount[base] == null) { nameCount[base] = 0; }
    else { nameCount[base] += 1; base = `${base}${nameCount[base]}`; }
    p.name = base;

    proxies.push(p);
  }
  return proxies;
}

// ---------------- RAW/Clash builders ----------------
function parseToRawValidLines(allText, filterSet) {
  const lines = allText.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const protocols = ["vless://","vmess://","trojan://","ss://"];
  let valid = lines.filter(l => protocols.some(p => l.startsWith(p)));
  if (filterSet && filterSet.size) {
    valid = valid.filter(l => {
      if (l.startsWith("vless://")) return filterSet.has("vless");
      if (l.startsWith("vmess://")) return filterSet.has("vmess");
      if (l.startsWith("trojan://")) return filterSet.has("trojan");
      if (l.startsWith("ss://")) return filterSet.has("ss");
      return false;
    });
  }
  // dedupe exact line
  const seen = new Set();
  const out = [];
  for (const l of valid) {
    if (seen.has(l)) continue;
    seen.add(l);
    out.push(l);
  }
  return out;
}

function buildRawOutput(lines, count, doShuffle, groupSize) {
  let arr = lines.slice();
  if (doShuffle) arr = shuffle(arr);
  if (count > 0 && count < arr.length) arr = arr.slice(0, count);
  if (groupSize > 0) {
    const groups = chunk(arr, groupSize);
    return groups.map(g => g.join("\n")).join("\n\n\n");
  }
  return arr.join("\n");
}

function buildClashFromRaw(lines, count, doShuffle, filterSet) {
  let arr = lines.slice();
  if (doShuffle) arr = shuffle(arr);
  if (count > 0 && count < arr.length) arr = arr.slice(0, count);
  const proxies = parseLinesToProxies(arr, filterSet);
  return buildClashJSON(proxies);
}

// ---------------- HTML (Pro Panel UI) ----------------
function panelHTML(hostname) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Pro Worker Panel</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.cdnfonts.com/css/inter" rel="stylesheet">
<style>
  body { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
  .badge { @apply inline-block text-xs px-2 py-1 rounded bg-blue-100 text-blue-700; }
  .card { @apply bg-white rounded-xl shadow p-4; }
  .muted { @apply text-slate-500; }
  .tiny { @apply text-xs; }
</style>
</head>
<body class="bg-slate-100 min-h-screen">
  <div class="max-w-7xl mx-auto p-4">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Cloudflare Worker Sub Panel</h1>
      <div class="text-sm text-slate-500">Base: <code>https://${hostname}</code></div>
    </div>

    <div class="grid xl:grid-cols-3 gap-4">
      <!-- Sources -->
      <div class="card xl:col-span-1">
        <div class="flex items-center justify-between mb-2">
          <h2 class="font-semibold">Sources</h2>
          <span class="badge">Manager</span>
        </div>
        <textarea id="newSources" class="w-full border rounded p-2" rows="6" placeholder="Paste one URL per line"></textarea>
        <div class="flex gap-2 mt-2">
          <button id="addSources" class="px-3 py-2 bg-blue-600 text-white rounded">Add</button>
          <button id="reloadSources" class="px-3 py-2 bg-slate-700 text-white rounded">Reload</button>
          <button id="clearSources" class="px-3 py-2 bg-red-600 text-white rounded">Clear All</button>
        </div>
        <div class="flex gap-2 mt-2">
          <button id="exportSources" class="px-3 py-2 bg-emerald-600 text-white rounded">Export</button>
          <label class="px-3 py-2 bg-indigo-600 text-white rounded cursor-pointer">
            Import <input id="importFile" type="file" accept=".txt" class="hidden" />
          </label>
        </div>
        <div class="mt-3">
          <div class="text-sm muted mb-1">Current Sources:</div>
          <ul id="sourceList" class="list-disc pl-5 text-sm"></ul>
        </div>
      </div>

      <!-- Output -->
      <div class="card xl:col-span-2">
        <div class="flex items-center justify-between mb-2">
          <h2 class="font-semibold">Output</h2>
          <span class="badge">Builder</span>
        </div>
        <div class="grid md:grid-cols-3 gap-3">
          <div>
            <label class="tiny">Format</label>
            <select id="fmt" class="w-full border rounded p-2">
              <option value="raw">RAW (lines)</option>
              <option value="rawb64">RAW (Base64)</option>
              <option value="clash">Clash (JSON config)</option>
            </select>
          </div>
          <div>
            <label class="tiny">Count</label>
            <select id="count" class="w-full border rounded p-2">
              <option value="0" selected>All</option>
              <option value="50">50</option>
              <option value="200">200</option>
              <option value="500">500</option>
              <option value="1500">1500</option>
            </select>
          </div>
          <div>
            <label class="tiny">Shuffle</label>
            <select id="shuffle" class="w-full border rounded p-2">
              <option value="1" selected>Yes</option>
              <option value="0">No</option>
            </select>
          </div>
          <div>
            <label class="tiny">Group Size (RAW)</label>
            <input id="group" class="w-full border rounded p-2" placeholder="e.g. 30" />
          </div>
          <div class="md:col-span-2">
            <label class="tiny block">Protocol Filters</label>
            <div class="flex gap-4 items-center">
              <label class="flex items-center gap-1"><input type="checkbox" id="f_vless" checked> vless</label>
              <label class="flex items-center gap-1"><input type="checkbox" id="f_vmess" checked> vmess</label>
              <label class="flex items-center gap-1"><input type="checkbox" id="f_trojan" checked> trojan</label>
              <label class="flex items-center gap-1"><input type="checkbox" id="f_ss" checked> ss</label>
            </div>
          </div>
        </div>
        <div class="flex gap-2 mt-3">
          <button id="preview" class="px-3 py-2 bg-slate-700 text-white rounded">Preview</button>
          <button id="copyLink" class="px-3 py-2 bg-emerald-600 text-white rounded">Copy Link</button>
          <a id="openLink" target="_blank" class="px-3 py-2 bg-indigo-600 text-white rounded">Open Link</a>
        </div>
        <div class="mt-3">
          <label class="tiny">Generated Link</label>
          <div id="linkBox" class="border rounded p-2 text-xs break-all"></div>
        </div>
      </div>

      <!-- Result -->
      <div class="card xl:col-span-3">
        <div class="flex items-center justify-between mb-2">
          <h2 class="font-semibold">Preview</h2>
          <span class="badge">Result</span>
        </div>
        <pre id="result" class="bg-slate-50 border rounded p-3 text-xs overflow-auto max-h-[60vh]"></pre>
      </div>

      <!-- Tools -->
      <div class="card xl:col-span-3">
        <div class="flex items-center justify-between mb-2">
          <h2 class="font-semibold">Latency Test</h2>
          <span class="badge">Tools</span>
        </div>
        <button id="testLatency" class="px-3 py-2 bg-blue-600 text-white rounded">Run Test</button>
        <div id="latencyBox" class="mt-3 text-sm"></div>
      </div>
    </div>
  </div>

<script>
async function api(path, method="GET", body=null) {
  const opt = { method, headers: {} };
  if (body) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
  const r = await fetch(path, opt);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
function buildLink() {
  const fmt = document.getElementById('fmt').value;
  const count = document.getElementById('count').value;
  const shuffle = document.getElementById('shuffle').value;
  const group = document.getElementById('group').value.trim();
  const fv = document.getElementById('f_vless').checked ? "1":"0";
  const fm = document.getElementById('f_vmess').checked ? "1":"0";
  const ft = document.getElementById('f_trojan').checked ? "1":"0";
  const fs = document.getElementById('f_ss').checked ? "1":"0";
  let u = location.origin + "/sub?format=" + encodeURIComponent(fmt)
    + "&count=" + encodeURIComponent(count)
    + "&shuffle=" + encodeURIComponent(shuffle)
    + "&vless=" + fv + "&vmess=" + fm + "&trojan=" + ft + "&ss=" + fs;
  if (group) u += "&group=" + encodeURIComponent(group);
  return u;
}
async function loadSources() {
  const ul = document.getElementById('sourceList');
  ul.innerHTML = "Loading sources...";
  try {
    const data = await api("/api/sources");
    ul.innerHTML = "";
    (data.sources || []).forEach((u, i) => {
      const li = document.createElement("li");
      li.className = "mb-1";
      li.innerHTML = '<span class="text-slate-700">' + u + '</span> '+
        '<button class="ml-2 text-red-600 underline text-xs" data-remove="'+i+'">remove</button> '+
        '<button class="ml-2 text-indigo-600 underline text-xs" data-test="'+i+'">test</button>';
      ul.appendChild(li);
    });
    ul.addEventListener('click', async (e) => {
      if (e.target.dataset.remove != null) {
        if (!confirm("Remove this source?")) return;
        const idx = parseInt(e.target.dataset.remove, 10);
        await api("/api/sources", "DELETE", { index: idx });
        loadSources();
      } else if (e.target.dataset.test != null) {
        const idx = parseInt(e.target.dataset.test, 10);
        const r = await api("/api/test?index=" + idx);
        alert("Status: " + r.status + " | Time: " + r.ms + " ms | Lines: " + r.lines);
      }
    }, { once: true });
  } catch {
    ul.innerHTML = "Error loading sources.";
  }
}
async function addSources() {
  const ta = document.getElementById('newSources');
  const lines = ta.value.split("\\n").map(s => s.trim()).filter(Boolean);
  if (!lines.length) return alert("Paste at least one URL.");
  await api("/api/sources", "POST", { urls: lines });
  ta.value = "";
  await loadSources();
}
async function exportSources() {
  const data = await api("/api/sources");
  const content = (data.sources || []).join("\\n");
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sources.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}
async function importSources(file) {
  const txt = await file.text();
  const lines = txt.split("\\n").map(s=>s.trim()).filter(Boolean);
  if (!lines.length) return alert("Empty file.");
  // merge-add
  await api("/api/sources", "POST", { urls: lines });
  await loadSources();
}
async function doPreview() {
  const link = buildLink();
  document.getElementById('linkBox').textContent = link;
  document.getElementById('openLink').setAttribute("href", link);
  document.getElementById('result').textContent = "Loading preview...";
  const r = await fetch(link);
  const txt = await r.text();
  document.getElementById('result').textContent = txt.slice(0, 500000);
}
async function testLatency() {
  document.getElementById('latencyBox').textContent = "Testing all sources...";
  const r = await api("/api/latency");
  let html = "";
  r.results.forEach(o => {
    html += '<div class="mb-1">'+(o.ok?'✅':'❌')+' <span class="text-slate-700">'+o.url+'</span> '+
      '<span class="muted ml-2">('+o.ms+' ms, '+o.lines+' lines, '+o.status+')</span></div>';
  });
  document.getElementById('latencyBox').innerHTML = html || "No sources.";
}
document.getElementById('addSources').addEventListener('click', addSources);
document.getElementById('reloadSources').addEventListener('click', loadSources);
document.getElementById('clearSources').addEventListener('click', async () => {
  if (!confirm("Clear ALL sources?")) return;
  await api("/api/sources", "PUT", { urls: [] });
  await loadSources();
});
document.getElementById('exportSources').addEventListener('click', exportSources);
document.getElementById('importFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (f) await importSources(f);
});
document.getElementById('preview').addEventListener('click', doPreview);
document.getElementById('copyLink').addEventListener('click', async () => {
  await navigator.clipboard.writeText(buildLink());
  alert("Link copied.");
});
document.getElementById('openLink').addEventListener('click', () => {
  document.getElementById('linkBox').textContent = buildLink();
});
loadSources().then(()=>{ document.getElementById('linkBox').textContent = buildLink(); });
</script>
</body>
</html>`;
}

function loginHTML() {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Login</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.cdnfonts.com/css/inter" rel="stylesheet">
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center" style="font-family: Inter, system-ui;">
  <form method="POST" action="/login" class="bg-white p-6 rounded-xl shadow w-80">
    <h1 class="text-xl font-semibold mb-3">Panel Login</h1>
    <input name="password" type="password" placeholder="8-digit password" pattern="\\d{8}" required class="w-full border rounded p-2 mb-2" />
    <button class="w-full bg-blue-600 text-white rounded p-2">Login</button>
    <div class="text-xs text-slate-500 mt-2">Default: 12345678</div>
  </form>
</body></html>`;
}

// ---------------- Fetching & Building ----------------
async function fetchAllSources(sources) {
  const fetches = sources.map(u => fetch(u).then(r => r.ok ? r.text() : "").catch(()=> ""));
  const texts = await Promise.all(fetches);
  return texts.join("\n");
}

// ---------------- Worker Handler ----------------
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;
      const isAuth = getCookie(request, "sess_auth") === "1";

      // Routes
      if (path === "/" && method === "GET") {
        if (!isAuth) return html(loginHTML());
        return html(panelHTML(url.hostname));
      }
      if (path === "/login" && method === "POST") {
        const body = await request.text();
        const params = new URLSearchParams(body);
        const pass = (params.get("password") || "").trim();
        if (pass === PASSWORD) {
          return new Response("", {
            status: 302,
            headers: { "Location": "/", "Set-Cookie": setCookie("sess_auth","1", 3600) }
          });
        }
        return html("<h3>Wrong password</h3><a href='/'>Back</a>", 401);
      }

      // Protect panel/api/sub behind auth
      if (!isAuth) {
        if (path.startsWith("/api") || path.startsWith("/sub") || path === "/panel") {
          return new Response("", { status: 302, headers: { "Location": "/" } });
        }
      }

      // API: sources CRUD
      if (path === "/api/sources" && method === "GET") {
        const src = await loadSources(env);
        return json({ sources: src });
      }
      if (path === "/api/sources" && method === "POST") {
        const data = await request.json().catch(()=> ({}));
        const urls = Array.isArray(data.urls) ? data.urls : [];
        if (!urls.length) return json({ ok:false, error:"no urls" }, 400);
        const exist = await loadSources(env);
        const set = new Set(exist);
        urls.forEach(u => { const v = String(u).trim(); if (v) set.add(v); });
        const merged = Array.from(set);
        await saveSources(env, merged);
        return json({ ok:true, count: merged.length });
      }
      if (path === "/api/sources" && method === "PUT") {
        const data = await request.json().catch(()=> ({}));
        const urls = Array.isArray(data.urls) ? data.urls : [];
        await saveSources(env, urls.map(u => String(u).trim()).filter(Boolean));
        return json({ ok:true });
      }
      if (path === "/api/sources" && method === "DELETE") {
        const data = await request.json().catch(()=> ({}));
        const idx = typeof data.index === "number" ? data.index : -1;
        const src = await loadSources(env);
        if (idx < 0 || idx >= src.length) return json({ ok:false, error:"bad index" }, 400);
        src.splice(idx, 1);
        await saveSources(env, src);
        return json({ ok:true });
      }

      // API: test one source
      if (path === "/api/test" && method === "GET") {
        const idx = parseInt(url.searchParams.get("index") || "-1", 10);
        const src = await loadSources(env);
        if (isNaN(idx) || idx < 0 || idx >= src.length) return json({ ok:false, error:"bad index" }, 400);
        const u = src[idx];
        const t0 = Date.now();
        try {
          const r = await fetch(u, { cf: { cacheTtl: 0 } });
          const ms = Date.now() - t0;
          const tx = await r.text();
          return json({ ok: r.ok, status: r.status, ms, lines: tx.split(/\r?\n/).filter(Boolean).length, url: u });
        } catch (e) {
          const ms = Date.now() - t0;
          return json({ ok:false, status:0, ms, lines: 0, url: u });
        }
      }

      // API: latency test
      if (path === "/api/latency" && method === "GET") {
        const src = await loadSources(env);
        const out = [];
        for (const u of src) {
          const t0 = Date.now();
          try {
            const r = await fetch(u, { cf: { cacheTtl: 0 } });
            const ms = Date.now() - t0;
            const tx = await r.text();
            out.push({ url: u, ok: r.ok, status: r.status, ms, lines: tx.split(/\r?\n/).filter(Boolean).length });
          } catch {
            out.push({ url: u, ok:false, status: 0, ms: Date.now() - t0, lines: 0 });
          }
        }
        return json({ results: out });
      }

      // SUB endpoint
      if (path === "/sub") {
        const fmt = (url.searchParams.get("format") || "raw").toLowerCase(); // raw | rawb64 | clash
        const count = parseInt(url.searchParams.get("count") || "0", 10);
        const shuffleFlag = (url.searchParams.get("shuffle") || "1") === "1";
        const groupSize = parseInt(url.searchParams.get("group") || "0", 10);

        const f_vless = (url.searchParams.get("vless") || "1") === "1";
        const f_vmess = (url.searchParams.get("vmess") || "1") === "1";
        const f_trojan = (url.searchParams.get("trojan") || "1") === "1";
        const f_ss = (url.searchParams.get("ss") || "1") === "1";
        const filterSet = new Set();
        if (f_vless) filterSet.add("vless");
        if (f_vmess) filterSet.add("vmess");
        if (f_trojan) filterSet.add("trojan");
        if (f_ss) filterSet.add("ss");

        const sources = await loadSources(env);
        const allText = await fetchAllSources(sources);

        // Build raw lines obeying filter
        let validLines = parseToRawValidLines(allText, filterSet);

        if (fmt === "clash") {
          const out = buildClashFromRaw(validLines, isNaN(count)?0:count, shuffleFlag, filterSet);
          return text(out, 200, { "Content-Type": "application/json; charset=UTF-8" });
        } else if (fmt === "rawb64") {
          const s = buildRawOutput(validLines, isNaN(count)?0:count, shuffleFlag, isNaN(groupSize)?0:groupSize);
          return text(b64encode(s));
        } else {
          const s = buildRawOutput(validLines, isNaN(count)?0:count, shuffleFlag, isNaN(groupSize)?0:groupSize);
          return text(s);
        }
      }

      if (path === "/panel") {
        return html(panelHTML(url.hostname));
      }

      return new Response("Not found", { status: 404 });
    } catch (e) {
      return text("Server error: " + (e && e.message ? e.message : String(e)), 500);
    }
  }
};
