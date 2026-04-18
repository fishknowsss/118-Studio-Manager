# Cloud Sync Worker

这个 Worker 提供 3 个接口：

- `GET /meta`
- `GET /data`
- `PUT /data`

为避免在公开仓库暴露生产域名，本文统一使用占位域名。真实域名请以 Cloudflare Dashboard 或团队运维记录为准。

建议部署到单独的同步自定义域名，例如 `https://sync.example.com`，然后在前端环境变量里填写：

```bash
VITE_SYNC_API_URL=https://sync.example.com
```

## 生产安全模型

- 生产环境对同步接口的真实鉴权边界是 Cloudflare Access，而不是前端静态共享 token。
- 需要同时保护主站自定义域名和同步自定义域名；二者任一遗漏，都会形成可绕过的入口。
- `ALLOWED_ORIGIN` 仅用于 CORS 放行，不承担身份认证作用。
- 不应将 `workers.dev` 地址作为公开生产同步入口；生产流量应走受 Access 保护的自定义域名。
- 每次调整自定义域名、Worker 绑定或 Access application 后，都必须重新验证匿名访问不能直接读取 `/data` 或 `/meta`。
- 前端跨子域访问受保护的同步域时，必须使用携带浏览器凭证的简单请求；否则 Cloudflare Access 重定向或预检拦截会在浏览器里表现为 `Failed to fetch`。

## 最小部署步骤

1. 在 Cloudflare 创建一个 KV Namespace。
2. 把 `wrangler.toml` 里的 `id` 替换成真实的 KV Namespace ID。
3. 把 `ALLOWED_ORIGIN` 改成你的前端域名。
4. 使用 Wrangler 部署这个 Worker。
5. 给 Worker 绑定一个受 Cloudflare Access 保护的同步自定义子域名。
6. 在前端环境变量中把 `VITE_SYNC_API_URL` 指向该同步自定义子域名。
7. 用未登录的浏览器会话验证：同步自定义域名下的 `/data` 与 `/meta` 不能直接返回同步数据。

## Access 联调提示

- 如果同步域名重新加上 Cloudflare Access 保护后，设置页出现 `Failed to fetch`，优先检查三件事：
- 前端请求是否携带了浏览器凭证。
- 同步读请求是否避免了不必要的 CORS 预检。
- Worker 返回是否包含 `Access-Control-Allow-Credentials: true`。

## 数据结构

- `sync:current`

Worker 只在云端保留一份当前快照。  
“同步并备份”按钮的“备份”改为在前端下载本地 JSON，不再额外写入云端备份槽。
