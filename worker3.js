// ======= Config =======
const PASSWORD = "15601560"; // 馃攽 乇賲夭 賵乇賵丿 倬賳賱

// ======= 賲賳丕亘毓 卮禺氐蹖 卮賲丕 =======
const STATIC_SOURCES = ["
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip30.json",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip30.txt",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip30.yaml",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip20.json",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip20.json",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/vip30.json",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/vip30.txt",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/vip5.txt",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/vip20.txt",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/vip10.txt",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/vip10.json",
  "https://sab-vip10.ahsan-tepo1383online.workers.dev/fregment3.json",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip30.json",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip30.txt",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip30.yaml",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip20.json",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip10.yaml",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip20.json",  
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip20.json",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip30.yaml",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip30.txt",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip30.json",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip20.txt",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip10.txt",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip10.json",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip10.yaml",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/fregment3.json"
  "https://ssh-max18.ahsan-tepo1383online.workers.dev/sub/104.18.101.226",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/config3.txt",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/config.txt",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/config.txt",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip20.txt",
  "https://raw.githubusercontent.com/tepo18/sab-vip15606/main/config.txt",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/config3.txt",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/config5.txt",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/config.txt",
  "https://sab-vip10.ahsan-tepo1383online.workers.dev/config.txt",
  "https://sab-vip10.ahsan-tepo1383online.workers.dev/config4.txt"
];

// ======= Helpers =======
const VALID_PREFIX = ["vmess://", "vless://", "trojan://", "ss://"];
const OUTPUT_CHOICES = [50, 500, 1500, 3000];

const cookieGet = (req, k) => {
  const c = req.headers.get("Cookie") || "";
  const m = c.match(new RegExp(`(?:^|; )${k}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
};
const cookieSet = (k, v, maxAge=3600) =>
  `${k}=${encodeURIComponent(v)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

const isIp = (s) => /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])(\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])){3}$/.test(s);

function cleanLines(t) {
  return (t || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && VALID_PREFIX.some(p=>l.startsWith(p)));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Rewriters (only if ip provided) ----
function rewriteVmess(line, ip, host) {
  try {
    const body = line.slice("vmess://".length);
    const json = JSON.parse(atob(body));
    // keep ws/tls/port if valid, force host/sni to domain, add to ip if valid
    if (!json.add) return line;
    json.add = ip;
    if (json.port) json.port = String(json.port);
    json.host = host;
    json.sni = host;
    if (!json.net) json.net = "ws";
    if (!json.tls) json.tls = "tls";
    const enc = btoa(JSON.stringify(json));
    return "vmess://" + enc;
  } catch { return line; }
}

function rewriteVless(line, ip, host) {
  try {
    // vless://uuid@host:port?key=val#tag
    const noProto = line.slice("vless://".length);
    const hashIdx = noProto.indexOf("#");
    const tag = hashIdx >= 0 ? noProto.slice(hashIdx+1) : "";
    const beforeHash = hashIdx >= 0 ? noProto.slice(0, hashIdx) : noProto;

    const qIdx = beforeHash.indexOf("?");
    const head = qIdx >= 0 ? beforeHash.slice(0, qIdx) : beforeHash;
    const query = qIdx >= 0 ? beforeHash.slice(qIdx+1) : "";

    const [user, hostport] = head.split("@");
    if (!user || !hostport) return line;
    const [_, uuid] = user.match(/^([^:]+)$/) || [];
    const [h, p] = hostport.split(":");
    const q = new URLSearchParams(query);

    q.set("security", q.get("security") || "tls");
    q.set("sni", host);
    q.set("type", q.get("type") || "ws");
    q.set("host", host);
    const path = q.get("path") || "/";
    q.set("path", path);

    const port = q.get("security")==="tls" ? "443" : (p || "80");
    const rebuilt = `vless://${uuid}@${ip}:${port}?${q.toString()}${tag?("#"+tag):""}`;
    return rebuilt;
  } catch { return line; }
}

function rewriteTrojan(line, ip, host) {
  try {
    // trojan://password@host:port?key=val#tag
    const noProto = line.slice("trojan://".length);
    const hashIdx = noProto.indexOf("#");
    const tag = hashIdx >= 0 ? noProto.slice(hashIdx+1) : "";
    const beforeHash = hashIdx >= 0 ? noProto.slice(0, hashIdx) : noProto;

    const qIdx = beforeHash.indexOf("?");
    const head = qIdx >= 0 ? beforeHash.slice(0, qIdx) : beforeHash;
    const query = qIdx >= 0 ? beforeHash.slice(qIdx+1) : "";

    const [pass, hostport] = head.split("@");
    if (!pass || !hostport) return line;
    const [h, p] = hostport.split(":");
    const q = new URLSearchParams(query);

    q.set("security", "tls");
    q.set("sni", host);
    q.set("type", q.get("type") || "ws");
    q.set("host", host);
    const path = q.get("path") || "/";
    q.set("path", path);

    const rebuilt = `trojan://${pass}@${ip}:443?${q.toString()}${tag?("#"+tag):""}`;
    return rebuilt;
  } catch { return line; }
}

function rewriteLine(line, ip, host) {
  if (!ip || !isIp(ip)) return line;
  if (line.startsWith("vmess://"))  return rewriteVmess(line, ip, host);
  if (line.startsWith("vless://"))  return rewriteVless(line, ip, host);
  if (line.startsWith("trojan://")) return rewriteTrojan(line, ip, host);
  // ss:// left untouched
  return line;
}

// ======= UI =======
function htmlLogin() {
  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>賵乇賵丿 亘賴 倬賳賱</title>
<style>
html,body{height:100%;margin:0;background:#f7fbff;font-family:Tahoma,Arial}
.wrap{height:100%;display:flex;align-items:center;justify-content:center}
.card{width:360px;background:#fff;padding:22px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.06)}
h1{margin:0 0 12px;font-size:20px}
input{width:100%;padding:10px;border:1px solid #dde3ee;border-radius:8px;margin:8px 0 12px;font-size:15px}
button{width:100%;padding:10px;border:0;border-radius:8px;background:#0b84ff;color:#fff;font-size:15px;cursor:pointer}
.small{color:#666;font-size:12px;margin-top:8px}
</style></head><body><div class="wrap"><form class="card" method="POST" action="/">
<h1>賵乇賵丿 亘賴 倬賳賱</h1>
<input name="password" type="password" placeholder="乇賲夭 鄹 乇賯賲蹖" inputmode="numeric" pattern="\\d{8}" required autofocus />
<button type="submit">賵乇賵丿</button>
<div class="small">乇賲夭 倬蹖卮鈥屬佖必�: <b>${PASSWORD}</b></div>
</form></div></body></html>`;
}

function htmlPanel(origin) {
  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Generic Subscription Panel 鈥� Pro</title>
<style>
:root{--bg:#f7f7f9;--card:#fff;--text:#111;--muted:#667;--pr:#0b84ff;--shadow:0 8px 30px rgba(0,0,0,.06)}
.dark{--bg:#0f141a;--card:#111823;--text:#eaf2ff;--muted:#9ab0c6;--pr:#58adff;--shadow:0 8px 30px rgba(0,0,0,.35)}
html,body{margin:0;height:100%;background:var(--bg);color:var(--text);font-family:Tahoma,Arial}
.wrap{max-width:880px;margin:0 auto;padding:18px}
.card{background:var(--card);border-radius:14px;box-shadow:var(--shadow);padding:16px;margin-bottom:14px}
h2{margin:6px 0 10px}
label{display:block;margin-top:8px;font-weight:600}
input,select,textarea{width:100%;box-sizing:border-box;border:1px solid rgba(120,144,180,.25);border-radius:10px;padding:10px 12px;background:transparent;color:var(--text)}
textarea{height:260px;white-space:pre;overflow:auto}
.row{display:flex;gap:10px;flex-wrap:wrap}
.col{flex:1;min-width:180px}
.btn{background:var(--pr);color:#fff;border:0;border-radius:10px;padding:10px 14px;cursor:pointer}
.btn.secondary{background:#6c757d}
.btn.ghost{background:transparent;color:var(--pr);border:1px solid var(--pr)}
.kicker{font-size:12px;color:var(--muted)}
.hidden{display:none}
</style></head><body><div class="wrap">

<div class="card">
  <div class="row" style="align-items:center">
    <h2 style="margin:0">Generic Subscription Panel 鈥� Pro</h2>
    <div style="margin-inline-start:auto" class="row" >
      <button class="btn ghost" id="toggleTheme">鬲蹖乇賴/乇賵卮賳</button>
      <button class="btn secondary" id="logoutBtn">禺乇賵噩</button>
    </div>
  </div>
  <div class="kicker">Base: <code>${origin}/feed</code></div>

  <div class="row">
    <div class="col">
      <label>丌蹖鈥屬聚� 鬲賲蹖夭 (丕禺鬲蹖丕乇蹖)</label>
      <input id="ip" placeholder="賲孬賱丕賸 104.18.101.226"/>
      <div class="kicker">賴賲 /feed/1.2.3.4 賵 賴賲 ?ip= 倬卮鬲蹖亘丕賳蹖 賲蹖鈥屫促堌�.</div>
    </div>
    <div class="col">
      <label>鬲毓丿丕丿 禺乇賵噩蹖</label>
      <select id="count">
        <option value="50">50</option>
        <option value="500" selected>500</option>
        <option value="1500">1500</option>
        <option value="3000">3000</option>
        <option value="all">All</option>
      </select>
    </div>
    <div class="col">
      <label>乇賳丿賵賲</label>
      <select id="random">
        <option value="0" selected>禺丕賲賵卮</option>
        <option value="1">乇賵卮賳</option>
      </select>
    </div>
  </div>

  <div class="row" style="margin-top:8px">
    <button class="btn" id="build">爻丕禺鬲 賱蹖賳讴 (讴倬蹖)</button>
    <button class="btn" id="open">亘丕夭 讴乇丿賳 賱蹖賳讴</button>
    <button class="btn" id="preview">倬蹖卮鈥屬嗁呚й屫�</button>
    <button class="btn secondary" id="reset">Reset</button>
  </div>

  <label style="margin-top:10px">賱蹖賳讴 爻丕禺鬲賴 卮丿賴:</label>
  <div class="row">
    <input id="link" readonly />
    <button class="btn ghost" id="copyLink">馃搵 讴倬蹖</button>
  </div>
  <div class="kicker">爻丕禺鬲賴 卮丿: <span id="builtAt">鈥�</span></div>

  <label style="margin-top:10px">倬蹖卮鈥屬嗁呚й屫� (鬲丕 500 禺胤):</label>
  <textarea id="previewBox" readonly>亘乇丕蹖 丿蹖丿賳貙 乇賵蹖 芦倬蹖卮鈥屬嗁呚й屫绰� 讴賱蹖讴 讴賳蹖丿.</textarea>
  <div class="row">
    <button class="btn ghost" id="copyContent">馃搵 讴倬蹖 賲丨鬲賵丕</button>
  </div>
</div>

</div>
<script>
(function(){
  const THEME_KEY="gsp_theme_v1";
  function applyTheme(){
    const t = localStorage.getItem(THEME_KEY)||"light";
    document.documentElement.classList.toggle("dark", t==="dark");
  }
  function toggleTheme(){
    const t = localStorage.getItem(THEME_KEY)||"light";
    localStorage.setItem(THEME_KEY, t==="dark"?"light":"dark");
    applyTheme();
  }
  applyTheme();
  document.getElementById("toggleTheme").onclick = toggleTheme;

  const $ = id => document.getElementById(id);
  function buildLink(){
    const ip = $("ip").value.trim();
    const count = $("count").value;
    const rnd = $("random").value;
    let u = location.origin + "/feed";
    if(ip) u += "/" + encodeURIComponent(ip);
    u += (u.includes("?")?"&":"?") + "n=" + encodeURIComponent(count);
    if(rnd==="1") u += "&random=1";
    $("link").value = u;
    $("builtAt").textContent = new Date().toLocaleString();
    if(navigator.clipboard) navigator.clipboard.writeText(u).catch(()=>{});
  }
  $("build").onclick = buildLink;
  $("reset").onclick = ()=>{
    $("ip").value=""; $("count").value="500"; $("random").value="0";
    $("link").value=""; $("previewBox").value="亘乇丕蹖 丿蹖丿賳貙 乇賵蹖 芦倬蹖卮鈥屬嗁呚й屫绰� 讴賱蹖讴 讴賳蹖丿."; $("builtAt").textContent="鈥�";
  };
  $("open").onclick = ()=>{ const u=$("link").value|| (buildLink(), $("link").value); if(u) window.open(u,"_blank"); };
  $("copyLink").onclick = ()=>{ const u=$("link").value; if(!u) return; navigator.clipboard&&navigator.clipboard.writeText(u); };
  $("copyContent").onclick = ()=>{ const t=$("previewBox").value; if(!t) return; navigator.clipboard&&navigator.clipboard.writeText(t); };

  $("preview").onclick = async ()=>{
    const u = $("link").value || (buildLink(), $("link").value);
    if(!u){ alert("丕賵賱 賱蹖賳讴 亘爻丕夭."); return; }
    $("previewBox").value = "丿乇 丨丕賱 賵丕讴卮蹖鈥�";
    try{
      const res = await fetch(u);
      const txt = await res.text();
      const lines = txt.split("\\n").map(l=>l.trim()).filter(Boolean);
      $("previewBox").value = (lines.slice(0,500).join("\\n")) || "禺乇賵噩蹖 禺丕賱蹖 丕爻鬲.";
    }catch(e){
      $("previewBox").value = "鉂� 禺胤丕: " + e.message;
    }
  };

  document.getElementById("logoutBtn").onclick = ()=>{
    document.cookie = "sess=; Max-Age=0; Path=/";
    location.href="/";
  };

  // 倬蹖卮鈥屬佖必� 賱蹖賳讴 乇賵 亘爻丕夭
  buildLink();
})();
</script>
</body></html>`;
}

// ======= Worker =======
export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // --- Auth ---
      const sess = cookieGet(request, "sess");
      const authed = sess === "1";

      if ((path === "/" || path === "/index.html") && method === "GET") {
        if (!authed) return new Response(htmlLogin(), { headers: { "Content-Type":"text/html; charset=UTF-8" } });
        return new Response(null, { status: 302, headers: { Location: "/panel" } });
      }

      if ((path === "/" || path === "/index.html") && method === "POST") {
        const body = await request.text();
        const params = new URLSearchParams(body);
        const pass = (params.get("password")||"").trim();
        if (pass === PASSWORD) {
          return new Response(null, {
            status: 302,
            headers: {
              "Location": "/panel",
              "Set-Cookie": cookieSet("sess","1", 60*60)
            }
          });
        } else {
          return new Response(htmlLogin().replace("</form>","<div class='small' style='color:#c00'>乇賲夭 丕卮鬲亘丕賴 丕爻鬲.</div></form>"), { headers: { "Content-Type":"text/html; charset=UTF-8" }, status: 401 });
        }
      }

      if (path === "/panel") {
        if (!authed) return new Response(null, { status: 302, headers: { Location: "/" } });
        const origin = `${url.protocol}//${url.host}`;
        return new Response(htmlPanel(origin), { headers: { "Content-Type":"text/html; charset=UTF-8" } });
      }

      // --- FEED ---
      if (path.startsWith("/feed")) {
        // optional /feed/{ip}
        const segs = path.split("/").filter(Boolean);
        const cleanIp = segs.length>=2 ? segs[1] : (url.searchParams.get("ip")||"");
        const wantRandom = url.searchParams.get("random")==="1";
        let nParam = url.searchParams.get("n") || url.searchParams.get("count") || "500";
        const host = url.hostname;

        // fetch all sources (simple & robust)
        const fetches = STATIC_SOURCES.map(src =>
          fetch(src).then(r => r.ok ? r.text() : "").catch(()=> "")
        );
        const texts = await Promise.all(fetches);
        let lines = [];
        for (const t of texts) lines.push(...cleanLines(t));

        // dedupe
        const uniq = Array.from(new Set(lines));

        // optional rewrite
        const finalLines = cleanIp && isIp(cleanIp)
          ? uniq.map(l => rewriteLine(l, cleanIp, host))
          : uniq;

        // randomize
        let arr = wantRandom ? shuffle(finalLines) : finalLines;

        // limit
        let out;
        if (nParam.toLowerCase() === "all") {
          out = arr;
        } else {
          const n = parseInt(nParam,10);
          const limit = Number.isFinite(n) && n>0 ? Math.min(n, arr.length) :
                        OUTPUT_CHOICES.includes(n) ? n : 500;
          out = arr.slice(0, limit);
        }
        return new Response(out.join("\n"), { headers: { "Content-Type":"text/plain; charset=UTF-8" } });
      }

      // fallback 404
      return new Response("Not found", { status: 404 });
    } catch (e) {
      return new Response("Server error: " + (e && e.message ? e.message : String(e)), { status: 500 });
    }
  }
};
