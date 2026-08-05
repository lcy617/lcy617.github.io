# Lithos · 个人学术博客

> 用代码探索地质 — 梁承艺的个人学术博客

基于 [Hexo](https://hexo.io/) 的静态博客，使用自建主题 **Lithos**（希腊语「岩石」）。
记录计算机背景跨入地质工程研究的学习与思考。

## 站点信息

- **作者**：梁承艺
- **在线访问**：<https://lcy617.github.io>
- **技术栈**：Hexo 8 + 自建 Lithos 主题 + GitHub Pages + GitHub Actions

## 博客结构

| 板块 | 路径 | 内容 |
|------|------|------|
| 首页 | `/` | Hero + 矿物晶格粒子可视化 + 近期笔记 |
| 关于 | `/about/` | 个人简介、跨学科故事、联系方式 |
| 笔记 | `/notes/` | 技术文章、地质学习、思考记录 |
| 作品 | `/works/` | 项目展示 |
| 研究展望 | `/research/` | 读研规划、技术工具箱、期望方向 |

支持中英双语切换，英文版位于 `/en/`。

## 本地开发

```bash
# 安装依赖
npm install

# 启动本地预览（http://localhost:4000）
npx hexo server

# 生成静态文件到 public/
npx hexo generate
```

## 部署

推送到 `main` 分支会自动触发 GitHub Actions：
1. 安装依赖
2. 用 Hexo 构建
3. 发布到 GitHub Pages

无需手动操作。

## 主题说明

主题文件位于 `themes/lithos/`，从零自建，包含：
- `layout/` — EJS 模板
- `source/css/` — 地层配色样式（深岩黑 + 矿物青绿）
- `source/js/lattice.js` — 首页矿物晶格粒子 Canvas 可视化
- `languages/` — 中英双语文案

---

© 梁承艺
