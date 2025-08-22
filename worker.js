// ====== تنظیمات شخصی ======
const PASSWORD = "15601560";   // 🔑 رمز ورود پنل (هر وقت خواستی عوض کن)
const SOURCE_LIST_URL = "https://raw.githubusercontent.com/USERNAME/REPO/main/sources.txt"; 
// 🔗 اینجا لینک فایل sources.txt خودتو بذار
// یا می‌تونی مستقیم پایین، منابع دستی تعریف کنی

// ====== منابع دستی (در صورتی که نخوای از فایل استفاده کنی) ======
const STATIC_SOURCES = [
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

// ====== گرفتن منابع ======
async function fetchSources() {
  try {
    const res = await fetch(SOURCE_LIST_URL);
    if (!res.ok) return STATIC_SOURCES;
    const text = await res.text();
    const dynamicSources = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    return dynamicSources.length > 0 ? dynamicSources : STATIC_SOURCES;
  } catch {
    return STATIC_SOURCES;
  }
}

// ====== هندلر اصلی ======
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 🔒 لاگین ساده
    if (!url.searchParams.has("pass") || url.searchParams.get("pass") !== PASSWORD) {
      return new Response("رمز ورود اشتباه است ❌", { status: 401 });
    }

    // مسیر اصلی
    if (url.pathname === "/feed") {
      const sources = await fetchSources();
      let configs = [];

      for (const src of sources) {
        try {
          const res = await fetch(src);
          if (res.ok) {
            const text = await res.text();
            configs.push(text.trim());
          }
        } catch (e) {
          console.error("خطا در منبع:", src);
        }
      }

      return new Response(configs.join("\n"), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // صفحه اصلی
    return new Response(`
      <html dir="rtl">
        <head><meta charset="utf-8"><title>پنل شخصی</title></head>
        <body style="font-family:tahoma;background:#111;color:#eee;padding:20px;">
          <h2>✅ پنل شخصی فعال است</h2>
          <p>برای دریافت خروجی به لینک زیر برو:</p>
          <code>?pass=${PASSWORD}</code>
          <br><br>
          <a href="/feed?pass=${PASSWORD}" style="color:lime;">📥 دریافت کانفیگ‌ها</a>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
};