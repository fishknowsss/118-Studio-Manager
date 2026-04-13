# Cloud Sync Worker

这个 Worker 提供 3 个接口：

- `GET /meta`
- `GET /data`
- `PUT /data`

建议部署到单独子域名，例如 `https://sync.fishknowsss.com`，然后在前端环境变量里填写：

```bash
VITE_SYNC_API_URL=https://sync.fishknowsss.com
```

## 最小部署步骤

1. 在 Cloudflare 创建一个 KV Namespace。
2. 把 `wrangler.toml` 里的 `id` 替换成真实的 KV Namespace ID。
3. 把 `ALLOWED_ORIGIN` 改成你的前端域名。
4. 使用 Wrangler 部署这个 Worker。
5. 给 Worker 绑定一个公开可访问的子域名。

## 数据结构

- `sync:current:data`
- `sync:current:meta`
- `sync:backup:manual:data`
- `sync:backup:manual:meta`

其中“手动同步并备份”会覆盖 `sync:backup:manual:*`，始终只保留最新一次手动备份。
