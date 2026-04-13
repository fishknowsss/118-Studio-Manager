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

- `sync:current`

Worker 只在云端保留一份当前快照。  
“同步并备份”按钮的“备份”改为在前端下载本地 JSON，不再额外写入云端备份槽。
