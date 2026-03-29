# OSINT_workspace

## Timeline Server

- 本地调试：`pnpm run timeline:dev`（或 `pnpm run timeline:start`）

## Vercel 控制台部署（推荐）

本项目时间线页面可作为静态站点部署，推荐直接连接 GitHub 仓库到 Vercel（不通过命令行 `vercel --prod`）。

在 Vercel 新建项目并导入本仓库后，Build & Output Settings 建议配置为：

- Framework Preset：`Other`
- Install Command：`pnpm install --frozen-lockfile`
- Build Command：留空（或 `echo "no build"`）
- Output Directory：`src/timeline-server/public`
- Node.js Version：`20.x`（或与你本地一致的 LTS 版本）

### 说明

- 当前时间线页面代码位于 `src/timeline-server/public`，是可直接托管的静态资源目录。
- 页面使用浏览器 File System Access API 读取本地目录，不依赖服务端 API 即可运行。
- 若未来需要部署 Node 服务端（`src/timeline-server/server.mjs`），需改为 Vercel Serverless/Functions 方案，届时不应继续使用上述静态输出目录配置。
