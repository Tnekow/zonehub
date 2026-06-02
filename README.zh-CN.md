# ZoneHub

ZoneHub 是一个离线优先（offline-first）的社区风格个人资料页设计器，基于 Vite、React 和 TypeScript 构建。项目提供高还原度的 Steam 风格版式参考界面，所有内容在本机编辑与保存，无需 Steam 账号或 API。

语言：简体中文 | [English (default)](README.md)

## 亮点

- 离线优先：核心编辑流程不依赖后端服务。
- 高还原社区风格资料页展示（仅视觉参考，不连接 Steam）。
- 实时编辑，并通过 `localStorage` 自动持久化。
- 支持主题自定义与自定义背景。
- 支持视频背景和视频转 GIF 工作流。
- 支持 Electron 桌面端打包。
- 内置多语言（`zh-CN`、`en-US`、`ja-JP`）。

## 技术栈

- Vite
- React 19
- TypeScript
- Tailwind CSS
- React Router
- i18next
- Electron + electron-builder

## 环境要求

- Node.js `>=22`
- npm `>=10`

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。

## 可用脚本

- `npm run dev` - 启动 Web 开发服务器。
- `npm run build` - 构建 Web 生产版本。
- `npm run preview` - 本地预览生产构建结果。
- `npm run lint` - 运行 ESLint 检查。
- `npm run electron:dev` - 启动 Electron 开发模式。
- `npm run electron:build` - 构建 Electron 发布包。
- `npm run badges:sync-assets` - 同步离线徽章资源。

## Offline OSS 说明

当前仓库已面向离线开源场景整理：

- 已移除 Creator/账号/发布等在线依赖。
- 应用功能默认依赖本地数据与本地存储。
- 使用 `.env.example` 作为可选开关模板（无需再通过环境变量配置 AppID）。
- 自定义背景 URL 仅允许 `https`、`blob`、`data` 协议。

如果克隆后缺少徽章资源：

```bash
npm run badges:sync-assets
```

## 项目结构

```text
src/
  components/      # UI 组件
  pages/           # 路由页面
  routes/          # 路由定义
  content/         # MDX 内容模块
  data/            # 静态数据
  hooks/           # 自定义 hooks
  locales/         # i18n 语言资源
electron/
  main/            # Electron 主进程
docs/              # 项目与架构文档
public/            # 静态资源
scripts/           # 构建与工具脚本
```

## 文档

详细文档见 `docs/README.md`，包括：

- 项目概览
- 技术架构
- 主题系统
- 国际化
- 组件开发指南
- 部署与维护指南

## 贡献

欢迎提交 Issue 和 Pull Request。

推荐流程：

1. Fork 本仓库。
2. 创建功能分支。
3. 运行 `npm run lint` 并确保构建通过。
4. 发起 PR，说明改动动机与测试结果。

## CI 工作流

- `electron-package-windows.yml` - 在 CI 中构建 Windows Electron 安装包。
- `electron-release-on-tag.yml` - 在打 tag 时发布 Electron Release 产物。

Git hooks：

- `npm install` 会安装 Husky，并启用 pre-commit lint。
- `npm run install:no-steam` 使用 `--ignore-scripts`，不会安装 hooks。

## 许可证

本项目使用 GNU Affero General Public License v3.0 only。

- SPDX 标识：`AGPL-3.0-only`
- 完整文本：`LICENSE`

## 免责声明

本项目仅用于学习和个人用途，与 Valve 或 Steam 无官方关联。
