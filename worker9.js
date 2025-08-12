const subLinks = [
  'https://raw.githubusercontent.com/Surfboardv2ray/Proxy-sorter/main/ws_tls/proxies/wstls',
  'https://raw.githubusercontent.com/Surfboardv2ray/TGParse/refs/heads/main/configtg.txt',
  'https://raw.githubusercontent.com/soroushmirzaei/telegram-configs-collector/refs/heads/main/protocols/trojan',
  'https://raw.githubusercontent.com/soroushmirzaei/telegram-configs-collector/refs/heads/main/protocols/vmess',
  'https://sab-poro1383.ahsan-tepo1383online.workers.dev/?file=config.txt',
  'https://sab-vip10.ahsan-tepo1383online.workers.dev/config1.txt',
  'https://raw.githubusercontent.com/tepo18/online-sshmax98/main/config.txt',
  'https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip20.txt',
  'https://almasi-9025.batool-sogeli.workers.dev/arista',
  'https://raw.githubusercontent.com/tepo18/reza-shah1320/main/config.txt',
];

const GITHUB_LINK = 'https://github.com/tepo18?tab=repositories';

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_TIME_MS = 30 * 1000; // 30 ثانیه قفل

// برای ذخیره رمز و وضعیت تلاش‌ها از KV استفاده می‌کنیم
// فرض می‌کنیم متغیر محیطی PASSWORD_KV و ATTEMPT_KV داریم که به دو namespace جدا متصل هستند
// اگر نداری باید در تنظیمات Worker اضافه کنی و نامشونو جایگزین کنی

export default {
      async fetch(request) {
        let url = new URL(request.url);
        let pathSegments = url.pathname.split('/').filter(segment => segment !== '');
        let realhostname = pathSegments[0] || '';
        let realpathname = pathSegments[1] || '';
    
        if (url.pathname === '/') {
          return new Response(`

    // مقدار رمز فعلی را از KV می‌گیریم، اگر نیست پیش‌فرض 12345678
    let savedPassword = await env.PASSWORD_KV.get('password');
    if (!savedPassword) {
      savedPassword = '12345678';
      await env.PASSWORD_KV.put('password', savedPassword);
    }

    // مقدار تلاش‌های اشتباه و زمان قفل را می‌گیریم
    let attemptDataRaw = await env.ATTEMPT_KV.get(cookies.session || '', { type: 'json' });
    let attemptData = attemptDataRaw || { count: 0, lockedUntil: 0 };

    // مسیر لاگین ساده GET و POST
    if (url.pathname === '/login') {
      if (request.method === 'GET') {
        return new Response(loginPage(''), { headers: { 'Content-Type': 'text/html' } });
      }
      if (request.method === 'POST') {
        const formData = await request.formData();
        const pass = formData.get('password');
        const now = Date.now();

        if (attemptData.lockedUntil > now) {
          return new Response(loginPage('اکانت موقتا قفل شده لطفا بعدا تلاش کنید.'), { headers: { 'Content-Type': 'text/html' } });
        }

        if (pass === savedPassword) {
          // موفقیت: کوکی سشن میسازیم با یک شناسه تصادفی
          const sessionId = crypto.randomUUID();
          await env.ATTEMPT_KV.put(sessionId, JSON.stringify({ count: 0, lockedUntil: 0 }), { expirationTtl: 3600 });
          // کوکی سشن جدید
          return new Response('', {
            status: 302,
            headers: {
              Location: '/',
              'Set-Cookie': `session=${sessionId}; HttpOnly; Path=/; Max-Age=3600`,
            },
          });
        } else {
          // تلاش اشتباه
          attemptData.count++;
          if (attemptData.count >= MAX_FAILED_ATTEMPTS) {
            attemptData.lockedUntil = now + LOCK_TIME_MS;
            attemptData.count = 0; // ریست
          }
          const sess = cookies.session || crypto.randomUUID();
          await env.ATTEMPT_KV.put(sess, JSON.stringify(attemptData), { expirationTtl: 3600 });
          return new Response(loginPage('رمز اشتباه است.'), { headers: { 'Content-Type': 'text/html' } });
        }
      }
    }

    // مسیر تغییر رمز GET و POST
    if (url.pathname === '/changepassword') {
      if (!cookies.session) {
        return redirectToLogin();
      }
      if (request.method === 'GET') {
        return new Response(changePasswordPage(''), { headers: { 'Content-Type': 'text/html' } });
      }
      if (request.method === 'POST') {
        const formData = await request.formData();
        const oldPass = formData.get('oldpassword');
        const newPass = formData.get('newpassword');
        if (oldPass !== savedPassword) {
          return new Response(changePasswordPage('رمز فعلی اشتباه است.'), { headers: { 'Content-Type': 'text/html' } });
        }
        if (!newPass || newPass.length < 8) {
          return new Response(changePasswordPage('رمز جدید باید حداقل 8 کاراکتر باشد.'), { headers: { 'Content-Type': 'text/html' } });
        }
        await env.PASSWORD_KV.put('password', newPass);
        return new Response(changePasswordPage('رمز با موفقیت تغییر کرد.'), { headers: { 'Content-Type': 'text/html' } });
      }
    }

    // کنترل ورود: اگر مسیر غیر /login و کوکی session معتبر نباشد ریدایرکت به لاگین
    if (url.pathname !== '/' && url.pathname !== '/sub' && url.pathname !== '/sub/' && url.pathname !== '/sub/' && !cookies.session) {
      return redirectToLogin();
    }

    if (url.pathname === '/') {
      if (!cookies.session) {
        return redirectToLogin();
      }
      // صفحه اصلی با کادرهای رنگی
      return new Response(mainPage(url.hostname), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // مسیر /sub/{clean-ip}
    if (url.pathname.startsWith('/sub')) {
      if (!cookies.session) {
        return redirectToLogin();
      }
      return handleSubRequest(url, env);
    }

    // پروکسی باقی درخواست‌ها به هاست
    {
      const splitted = url.pathname.replace(/^\/*/, '').split('/');
      const address = splitted[0];
      url.pathname = splitted.slice(1).join('/');
      url.hostname = address;
      url.protocol = 'https:';

      return fetch(new Request(url.toString(), request));
    }
  },
};

function redirectToLogin() {
  return new Response('', {
    status: 302,
    headers: { Location: '/login' },
  });
}

async function handleSubRequest(url, env) {
  const realhostname = url.hostname;
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const cleanIp = pathSegments[1] || '';

  let newConfigs = '';
  let trojanPaths = new Set();
  let vlessPaths = new Set();
  let vmessPaths = new Set();

  for (const subLink of subLinks) {
    try {
      const resp = await fetch(subLink);
      if (!resp.ok) continue;
      let text = await resp.text();

      // تشخیص base64 بودن یا نبودن
      let isBase64 = false;
      try {
        atob(text);
        isBase64 = true;
      } catch {}

      if (isBase64) text = atob(text);

      let lines = text.split(/\r?\n/);
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        try {
          if (line.startsWith('vmess://')) {
            let vmessData = atob(line.substring(8));
            let vmessConfig = JSON.parse(vmessData);
            if (vmessConfig.sni && !isIp(vmessConfig.sni) && vmessConfig.net === 'ws' && vmessConfig.port === 443) {
              if (shouldSkipHost(vmessConfig.sni)) continue;
              let path = `/${vmessConfig.sni}${vmessConfig.path || ''}`;
              if (vmessPaths.has(path)) continue;
              vmessPaths.add(path);

              let newConf = {
                v: "2",
                ps: `Node-${vmessConfig.sni}`,
                add: cleanIp || realhostname,
                port: vmessConfig.port,
                id: vmessConfig.id,
                net: vmessConfig.net,
                type: 'ws',
                host: realhostname,
                path: path,
                tls: vmessConfig.tls,
                sni: realhostname,
                aid: "0",
                scy: "auto",
                fp: "chrome",
                alpn: "http/1.1",
              };
              newConfigs += 'vmess://' + btoa(JSON.stringify(newConf)) + '\n';
            }
          } else if (line.startsWith('vless://')) {
            let [head, query] = line.substring(8).split('?');
            let [uuid, hostport] = head.split('@');
            if (!query || !hostport) continue;
            let [host, port] = hostport.split(':');
            if (!port) continue;

            let params = new URLSearchParams(query);
            let security = params.get('security');
            let sni = params.get('sni');
            let type = params.get('type');
            let path = decodeURIComponent(params.get('path') || '');
            if (sni && !isIp(sni) && security === 'tls' && port === '443' && type === 'ws') {
              if (shouldSkipHost(sni)) continue;
              let newPath = `/${sni}${path}`;
              if (vlessPaths.has(newPath)) continue;
              vlessPaths.add(newPath);

              let newVless = `vless://${uuid}@${cleanIp || realhostname}:${port}?encryption=none&security=${security}&sni=${realhostname}&alpn=http/1.1&fp=chrome&allowInsecure=1&type=ws&host=${realhostname}&path=${encodeURIComponent(newPath)}#Node-${sni}`;
              newConfigs += newVless + '\n';
            }
          } else if (line.startsWith('trojan://')) {
            let idx = line.lastIndexOf('#');
            let remark = '';
            let configLine = line;
            if (idx !== -1) {
              remark = line.substring(idx + 1);
              configLine = line.substring(0, idx);
            }

            let [beforeQuery, query] = configLine.substring(8).split('?');
            if (!query) continue;

            let [password, hostport] = beforeQuery.split('@');
            if (!hostport) continue;
            let [host, port] = hostport.split(':');
            if (!port) continue;

            let params = new URLSearchParams(query);
            let security = params.get('security');
            let sni = params.get('sni');
            let type = params.get('type');
            let path = decodeURIComponent(params.get('path') || '');

            if (sni && !isIp(sni) && security === 'tls' && port === '443' && type === 'ws') {
              if (shouldSkipHost(sni)) continue;
              let newPath = `/${sni}${path}`;
              if (trojanPaths.has(newPath)) continue;
              trojanPaths.add(newPath);

              let newTrojan = `trojan://${password}@${cleanIp || realhostname}:${port}?security=${security}&sni=${realhostname}&alpn=http/1.1&fp=chrome&allowInsecure=1&type=ws&host=${realhostname}&path=${encodeURIComponent(newPath)}#Node-${sni}`;
              newConfigs += newTrojan + '\n';
            }
          }
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  // پارامتر n برای محدود کردن تعداد خروجی‌ها
  let nParam = url.searchParams.get('n');
  if (nParam && !isNaN(nParam) && parseInt(nParam) > 0) {
    let n = Math.min(parseInt(nParam), newConfigs.trim().split('\n').length);
    let lines = newConfigs.trim().split('\n');
    let selected = getRandomItems(lines, n);
    return new Response(selected.join('\n'), { headers: { 'Content-Type': 'text/plain' } });
  }

  return new Response(newConfigs, { headers: { 'Content-Type': 'text/plain' } });
}

function loginPage(msg) {
  return `
  <!DOCTYPE html>
  <html lang="fa" >
  <head>
    <meta charset="UTF-8" />
    <title>ورود به Trojan-worker</title>
    <style>
      body { font-family: 'Vazir', sans-serif; background:#222; color:#eee; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; }
      .container {
