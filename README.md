# OSINT_workspace

## Timeline Server

- 本地运行完整服务（含 API + 页面）：`pnpm run timeline:dev`（或 `pnpm run timeline:start`）
- 默认访问地址：`http://localhost:3986`

## Vercel 部署完整服务（含 API）

本项目已支持在 Vercel 以“静态页面 + API Functions”方式部署完整服务，不再是仅静态页面。

### 1) 在 Vercel 控制台连接 GitHub 仓库

创建新项目并导入当前仓库后，建议配置：

- Framework Preset：`Other`
- Install Command：`pnpm install --frozen-lockfile`
- Build Command：`echo no build`（或留空）
- Output Directory：留空（由 `vercel.json` 接管）
- Node.js Version：`20.x`

### 2) 路由与 API

部署后可直接使用：

- 页面：`/`
- API：
  - `/api/root-options`
  - `/api/timeline`
  - `/api/article`

### 3) 数据模式说明

前端支持两种模式：

- `API 服务`（默认）：通过上述 API 读取服务端可见的数据目录
- `本地目录`：使用浏览器 File System Access API 读取你本机目录

> 若使用 `API 服务` 模式，请确保部署运行环境中存在目标数据目录，并可被服务端扫描到（目录下需有 `extracted_mds`）。
