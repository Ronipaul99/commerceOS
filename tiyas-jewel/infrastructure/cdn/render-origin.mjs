import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import { validateHosts } from "./cloudflare-rules.mjs";

const [rangesFile, ...names] = process.argv.slice(2);
const [canonical, alias] = validateHosts(names);
const ranges = JSON.parse(readFileSync(rangesFile, "utf8"));
if (
  ranges.success !== true ||
  !ranges.result?.ipv4_cidrs?.length ||
  !ranges.result?.ipv6_cidrs?.length
)
  throw Error("Provide the verified Cloudflare IPs API export.");
const networks = [...ranges.result.ipv4_cidrs, ...ranges.result.ipv6_cidrs];
if (
  networks.some((network) => {
    if (
      typeof network !== "string" ||
      !/^[0-9a-f.:]+\/[0-9]{1,3}$/i.test(network)
    )
      return true;
    const [address, prefix] = network.split("/");
    const family = isIP(address);
    return (
      !family ||
      Number(prefix) < 8 ||
      Number(prefix) > (family === 4 ? 32 : 128)
    );
  })
)
  throw Error("Invalid CIDR in the Cloudflare IP export.");

const tls = `
    ssl_certificate /etc/nginx/tiyas-tls/fullchain.pem;
    ssl_certificate_key /etc/nginx/tiyas-tls/privkey.pem;
`;
const proxy = (upstream) => `
        proxy_pass http://${upstream};
        proxy_set_header Host ${canonical};
        proxy_set_header X-Forwarded-Host ${canonical};
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Port 443;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header CF-Connecting-IP "";
        proxy_set_header Forwarded "";
`;
process.stdout
  .write(`# Generated for TIYAS JEWEL. Use the private Compose network and an edge-restricted firewall.
upstream tiyas_web { server web:3000; }
upstream tiyas_api { server api-cdn:4000; }
${networks.map((network) => `set_real_ip_from ${network};`).join("\n")}
real_ip_header CF-Connecting-IP;
real_ip_recursive off;
ssl_protocols TLSv1.2 TLSv1.3;

server {
    listen 80 default_server;
    server_name _;
    return 444;
}
server {
    listen 443 ssl default_server;
    server_name _;
    ssl_reject_handshake on;
    return 444;
}
server {
    listen 80;
    server_name ${[canonical, alias].filter(Boolean).join(" ")};
    return 308 https://${canonical}$request_uri;
}
${
  alias
    ? `server {
    listen 443 ssl;
    server_name ${alias};
    ${tls}
    return 308 https://${canonical}$request_uri;
}`
    : ""
}
server {
    listen 443 ssl;
    server_name ${canonical};
    ${tls}
    server_tokens off;
    proxy_cache off;
    client_max_body_size 1m;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Frame-Options DENY always;

    location = /api/v1/admin/images {
        client_max_body_size 6m;
        proxy_read_timeout 60s;
        ${proxy("tiyas_api")}
    }
    location /api/ {
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
        ${proxy("tiyas_api")}
    }
    location /images/uploads/ {
        ${proxy("tiyas_api")}
    }
    location /media/public/ {
        ${proxy("tiyas_api")}
    }
    location / {
        proxy_http_version 1.1;
        ${proxy("tiyas_web")}
    }
}
`);
