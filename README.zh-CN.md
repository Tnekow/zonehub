![ZoneHub Banner](public/images/banner.png)

# ZoneHub

*在本地设计 Steam 风格个人主页 — 无需登录，配置保存在本机。*

[![Release](https://img.shields.io/github/v/release/Tnekow/zonehub?label=release)](https://github.com/Tnekow/zonehub/releases)
[![License](https://img.shields.io/github/license/Tnekow/zonehub)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows&logoColor=white)](https://github.com/Tnekow/zonehub/releases)
[![Stars](https://img.shields.io/github/stars/Tnekow/zonehub?style=social)](https://github.com/Tnekow/zonehub/stargazers)

语言：简体中文 | [English](README.md)

ZoneHub 是一款**离线优先的 Electron 桌面应用**，用于设计高还原度的 Steam 风格个人资料页。头像、昵称、展柜、徽章、主题与背景媒体均在本机编辑与保存，无需 Steam 账号或 API。

![功能演示：拖拽展柜、动态背景、导出](public/images/ce7d8fe8-152c-424d-94cd-9f261d8b3db2.gif)

*拖拽展柜 → 应用动态背景 → 导出布局。*

## 功能亮点

- **离线优先** — 核心编辑流程不依赖后端。
- **Steam 风格布局** — 高还原资料页展示（仅视觉参考，不连接 Steam）。
- **拖拽编辑展柜** — 自定义区块、艺术品、徽章、创意工坊条等多种展柜类型。
- **主题与背景** — 预设主题 + 自定义图片/视频 URL（`https`、`blob`、`data`）。
- **视频背景 & 视频转 GIF** — 内置动图背景工作流。
- **配置导入/导出** — 通过本地存储保存与恢复布局。
- **Electron 桌面端** — 主要开发与使用方式（Windows）。
- **多语言** — `zh-CN`、`en-US`、`ja-JP`。

## 快速开始

### 下载（推荐）

从 [GitHub Releases](https://github.com/Tnekow/zonehub/releases) 下载最新 Windows 安装包（`ZoneHub Setup *.exe`）。

### 从源码运行（开发者）

**环境要求：** Node.js `>=22`，npm `>=10`

```bash
npm install
npm run electron:dev
```

该命令会启动 Vite 开发服务器并打开 **Electron** 桌面壳，入口为 `/desktop`。ZoneHub 以 Electron 为主要开发与测试方式 — 日常开发与 Issue 反馈请使用此命令。

### 构建安装包

```bash
npm run electron:build
```

产物：`dist/ZoneHub Setup *.exe`

> **网页 dev 模式（实验性）：** `npm run dev` 启动 Vite 后默认地址是 `http://127.0.0.1:5173/`，根路径 `/` **不是**应用入口，ZoneHub 仅挂载在 `/desktop`。`npm run electron:dev` 会自动打开 `/desktop`；若用浏览器访问，需手动进入该路径。纯网页模式还可能有渲染或功能差异，**推荐始终使用 `npm run electron:dev`**。

<details>
<summary>离线说明</summary>

- 无在线账号或发布依赖，数据保存在本机 localStorage。
- 自定义背景 URL 仅允许 `https`、`blob`、`data` 协议。
- 克隆后若缺少徽章资源：`npm run badges:sync-assets`

</details>

## 截图画廊

不同主题与背景下的成品效果：

![主题画廊](public/images/gallery-themes.png)

## 技术栈

Vite · React 19 · TypeScript · Tailwind CSS · React Router · i18next · Electron

## 许可证

本项目使用 **GNU Affero General Public License v3.0 only**（`AGPL-3.0-only`）。完整文本见 [LICENSE](LICENSE)。

## 致谢

- 赞助者：[朏朏Moonek0](https://steamcommunity.com/profiles/76561198933108580/)
- 社区：[Discord](https://discord.gg/qpunvXZTvA)
- 支持开发：[爱发电](https://afdian.com/a/kuroiuz)

## 反馈与贡献

- Bug 与功能建议：[GitHub Issues](https://github.com/Tnekow/zonehub/issues)
- 欢迎贡献：Fork → 分支 → `npm run lint` → 发起 PR 并说明动机与测试结果。

## 免责声明

本项目仅用于学习和个人用途，与 Valve 或 Steam 无官方关联。
