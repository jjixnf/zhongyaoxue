# 🌿 本草研习 · 中药学知识库

开放式中医考研学习资料库。首页以**中药列表＋搜索＋小日历**为中心；每味药关联知识点、个人错题和笔记。由学习者自行安排间隔复习。

## 当前进度（V0.1）

- 已建立《学霸笔记—中药学》第六至第二十六章共21个药物分类章节目录。
- 第六章解表药已录入**27味**，含性味、归经、功效及教材印刷页码；当前**待逐味复核**，不得把这些数据视为已完成全部校对。
- 每味药具有稳定 ID 和独立知识点 ID，错题/笔记可关联多味药与多个知识点；数据目录见 [数据规范](docs/DATA_MODEL.md)。
- 网页可按章节、药名、四气、五味、归经、功效及关联笔记检索；点击关联记录可往返跳转。
- 右侧小日历展示每一天新增/更新，**不自动安排复习任务**。
- 可以在本机添加错题和笔记，JSON 导入/导出备份。**本机新增不自动同步至 GitHub**，换浏览器或清除浏览器数据前请备份。

## 在线部署（免费）

本站是纯静态页面。合并到 `main` 后，在仓库 Settings → Pages 中选择 **Deploy from a branch**，Branch 为 `main`，目录选 **/(root)**。公开网址预计为：

https://jjixnf.github.io/zhongyaoxue/

启用 Pages 后稍等 GitHub 完成发布。如果尚未配置 Pages，该网址暂时不会正常打开。

也可以在仓库目录运行 `python -m http.server 8000`，浏览器打开 `http://localhost:8000/`。注意：直接双击 `index.html` 以 `file://` 打开时，浏览器可能阻止加载 JSON 数据。

## AI 助手（可选）

- 不配置 AI API，也可以检索所有已录入资料、打开笔记和复制当前药物上下文到 ChatGPT。
- 如需在网页内提问，可自行部署 `server/worker.js` 作为 Cloudflare Worker；将真正的 `OPENAI_API_KEY` 存成 Worker 加密 Secret。
- 另建强随机 `ACCESS_TOKEN` 作为访问密码（不能直接使用 OpenAI API Key）。在 Worker 设置 `ALLOWED_ORIGIN=https://jjixnf.github.io`；`OPENAI_MODEL` 由你选择支持的模型。
- 在网站的 **配置 API** 中输入 Worker `https://.../chat` 地址与独立访问令牌。站点只在内存中保存令牌，刷新页面后需重新输入。
- **绝对不要把 API Key、ACCESS_TOKEN 或其他秘密提交到 GitHub。** 公开网站与私人令牌分开；自行控制服务端限额。单靠前端不能保障计费安全。

## 内容原则

书本知识、个人笔记、原始错题、AI 分析分层保存。原 PDF 和大段版权教材原文不放入公开仓库，仅存整理的事实性结构化数据及原创笔记。欢迎在 Issues 提纠错建议。

## 开发检查

```bash
node scripts/validate.mjs
node --check app.js
```
