// ======= Config =======
const PASSWORD = "15601560"; // 🔑 رمز ورود

// ======= منابع ثابت =======
const STATIC_SOURCES = [
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip20.json",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip30.yaml",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip30.txt",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip30.json",
  "https://sab-vip10.ahsan-tepo1383online.workers.dev/fregment3.json",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip30.json",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip30.txt",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip30.yaml",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip20.json",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip10.yaml",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip20.json",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/vip30.json",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/vip30.txt",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/vip5.txt",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/vip20.txt",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/vip10.txt",
  "https://raw.githubusercontent.com/tepo18/online-sshmax98/main/vip10.json",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip30.json",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip30.txt",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip30.yaml",
  "https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip20.json",
  "https://ahsan-tepo1383.almasi-ali98.workers.dev/vip20.json",
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

// ======= HTML لاگین =======
const htmlLogin = `
<!DOCTYPE html>
<html lang="fa">
<head><meta charset="UTF-8"><title>Login</title></head>
<body style="background:#111;color:#eee;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
  <form method="POST">
    <h2>ورود به پنل</h2>
    <input type="password" name="password" placeholder="رمز" style="padding:8px;margin:8px;"/>
    <button type="submit" style="padding:8px 16px;">ورود</button>
  </form>
</body>
</html>
`;

// ======= HTML پنل =======
const htmlPanel = `
<!DOCTYPE html>
<html lang="fa">
<head><meta charset="UTF-8"><title>پنل</title></head>
<body style="background:#222;color:#eee;font-family:sans-serif;">
  <h1>🎛️ پنل اصلی</h1>
  <p>خوش اومدی</p>
</body>
</html>
`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 📌 /feed → چندفایلی
    if (url.pathname === "/feed") {
      let finalSources = [...STATIC_SOURCES];

      if (url.searchParams.has("files")) {
        const files = url.searchParams.get("files")
          .split(",")
          .map(f => f.trim())
          .filter(Boolean);

        if (url.searchParams.get("only") === "1") {
          finalSources = files.map(f => `${url.origin}/${f}`);
        } else {
          for (const f of files) {
            finalSources.push(`${url.origin}/${f}`);
          }
        }
      }

      let results = [];
      for (const src of finalSources) {
        try {
          const r = await fetch(src);
          if (r.ok) results.push(await r.text());
        } catch (e) {}
      }

      return new Response(results.join("\n---\n"), {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    // 📌 صفحه ورود
    if (url.pathname === "/") {
      if (request.method === "POST") {
        const form = await request.formData();
        const password = form.get("password");
        if (password === PASSWORD) {
          return new Response(htmlPanel, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        } else {
          return new Response(htmlLogin, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
      }
      return new Response(htmlLogin, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    return new Response("404 Not Found", { status: 404 });
  }
};
