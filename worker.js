// Developed by Surfboardv2ray, https://github.com/Surfboardv2ray/Trojan-worker
// Version 1.4.1
// Custom version with your own subscription sources

const subLinks = [
  'https://sab-poro1383.ahsan-tepo1383online.workers.dev/?file=config.txt',
  'https://sab-vip10.ahsan-tepo1383online.workers.dev/config1.txt',
  'https://raw.githubusercontent.com/tepo18/online-sshmax98/main/config.txt',
  'https://raw.githubusercontent.com/tepo18/reza-shah1320/main/vip20.txt',
  'https://almasi-9025.batool-sogeli.workers.dev/arista',
  'https://raw.githubusercontent.com/tepo18/reza-shah1320/main/config.txt',
];

    export default {
  async fetch(request) {
    let url = new URL(request.url);
    let pathSegments = url.pathname.split('/').filter(segment => segment !== '');
    let realhostname = pathSegments[0] || '';
    let realpathname = pathSegments[1] || '';

    if (url.pathname === '/') {
      return new Response(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Trojan-worker</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f0f8ff;
              color: #333;
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              flex-direction: column;
            }
            .container {
              text-align: center;
              padding: 20px;
              border-radius: 10px;
              background-color: #ffffff;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            a {
              color: #007BFF;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            p {
              margin: 20px 0;
            }
            button {
              padding: 10px 20px;
              border: none;
              border-radius: 5px;
              background-color: #007BFF;
              color: #ffffff;
              cursor: pointer;
              margin-top: 20px;
            }
            button:hover {
              background-color: #0056b3;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Developed by You</h1>
            <p><a href="https://github.com/YourGitHubUser/YourRepo" target="_blank">https://github.com/YourGitHubUser/YourRepo</a></p>
            <p>Your Subscription link will be:</p>
            <p id="subscription-link"><strong>https://{worker-address}/sub/{clean-ip}</strong></p>
            <button id="get-clean-ip">Get Clean IP</button>
          </div>
          <script>
            document.getElementById('get-clean-ip').onclick = async function() {
              const response = await fetch('https://raw.githubusercontent.com/ircfspace/cf2dns/refs/heads/master/list/ipv4.json');
              const data = await response.json();
              const randomIndex = Math.floor(Math.random() * data.length);
              const cleanIP = data[randomIndex].ip;
              const workerAddress = window.location.hostname;
              const subscriptionLink = \`https://\${workerAddress}/sub/\${cleanIP}\`;
              document.getElementById('subscription-link').innerHTML = \`<a href="\${subscriptionLink}" target="_blank">\${subscriptionLink}</a>\`;
            }
          </script>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    let trojanPaths = new Set();
    let vlessPaths = new Set();
    let vmessPaths = new Set();

    if (url.pathname.startsWith('/sub')) {
      let newConfigs = '';

      for (let subLink of subLinks) {
        try {
          let resp = await fetch(subLink);
          if (!resp.ok) continue;
          let subConfigs = await resp.text();
          let isBase64Encoded = false;

          try { atob(subConfigs); isBase64Encoded = true; } catch (e) { isBase64Encoded = false; }
          if (isBase64Encoded) subConfigs = atob(subConfigs);

          subConfigs = subConfigs.split(/\r?\n/);

          for (let subConfig of subConfigs) {
            subConfig = subConfig.trim();
            if (subConfig === '') continue;

            try {
              if (subConfig.startsWith('vmess://')) {
                let vmessData = subConfig.replace('vmess://', '');
                vmessData = atob(vmessData);
                let vmessConfig = JSON.parse(vmessData);

                if (vmessConfig.sni && !isIp(vmessConfig.sni) && vmessConfig.net === 'ws' && vmessConfig.port === 443) {
                  if (shouldSkipHost(vmessConfig.sni)) continue;

                  let configNew = {
                    v: '2',
                    ps: `Node-${vmessConfig.sni}`,
                    add: realpathname === '' ? url.hostname : realpathname,
                    port: vmessConfig.port,
                    id: vmessConfig.id,
                    net: vmessConfig.net,
                    type: 'ws',
                    host: url.hostname,
                    path: `/${vmessConfig.sni}${vmessConfig.path}`,
                    tls: vmessConfig.tls,
                    sni: url.hostname,
                    aid: '0',
                    scy: 'auto',
                    fp: 'chrome',
                    alpn: 'http/1.1',
                  };

                  let fullPath = configNew.path;
                  if (!vmessPaths.has(fullPath)) {
                    vmessPaths.add(fullPath);
                    let encodedVmess = 'vmess://' + btoa(JSON.stringify(configNew));
                    newConfigs += encodedVmess + '\n';
                  }
                }
              } else if (subConfig.startsWith('vless://')) {
                let vlessParts = subConfig.replace('vless://', '').split('@');
                if (vlessParts.length !== 2) continue;

                let uuid = vlessParts[0];
                let remainingParts = vlessParts[1].split('?');
                if (remainingParts.length !== 2) continue;

                let [ipPort, params] = remainingParts;
                let [ip, port] = ipPort.split(':');
                if (!port) continue;

                let queryParams = new URLSearchParams(params);
                let security = queryParams.get('security');
                let sni = queryParams.get('sni');
                let type = queryParams.get('type');
                if (sni && !isIp(sni) && security === 'tls' && port === '443' && type === 'ws') {
                  if (shouldSkipHost(sni)) continue;

                  let newPath = `/${sni}${decodeURIComponent(queryParams.get('path') || '')}`;
                  if (!vlessPaths.has(newPath)) {
                    vlessPaths.add(newPath);
                    let newVlessConfig = `vless://${uuid}@${realpathname === '' ? url.hostname : realpathname}:${port}?encryption=none&security=${security}&sni=${url.hostname}&alpn=http/1.1&fp=chrome&allowInsecure=1&type=ws&host=${url.hostname}&path=${newPath}#Node-${sni}`;
                    newConfigs += newVlessConfig + '\n';
                  }
                }
              } else if (subConfig.startsWith('trojan://')) {
                let lastHashIndex = subConfig.lastIndexOf('#');
                let configWithoutRemark = subConfig;
                let remark = '';
                if (lastHashIndex !== -1) {
                  configWithoutRemark = subConfig.substring(0, lastHashIndex);
                  remark = subConfig.substring(lastHashIndex + 1);
                }

                let trojanURL = configWithoutRemark.replace('trojan://', '');
                let [passwordAndHost, params] = trojanURL.split('?');
                if (!params) continue;

                let [password, hostAndPort] = passwordAndHost.split('@');
                if (!hostAndPort) continue;

                let [ip, port] = hostAndPort.split(':');
                if (!port) continue;

                let queryParams = new URLSearchParams(params);
                let security = queryParams.get('security');
                let sni = queryParams.get('sni');
                let type = queryParams.get('type');

                if (sni && !isIp(sni) && security === 'tls' && port === '443' && type === 'ws') {
                  if (shouldSkipHost(sni)) continue;

                  let newPath = `/${sni}${decodeURIComponent(queryParams.get('path') || '')}`;
                  if (!trojanPaths.has(newPath)) {
                    trojanPaths.add(newPath);
                    let newTrojanConfig = `trojan://${password}@${realpathname === '' ? url.hostname : realpathname}:${port}?security=${security}&sni=${url.hostname}&alpn=http/1.1&fp=chrome&allowInsecure=1&type=
