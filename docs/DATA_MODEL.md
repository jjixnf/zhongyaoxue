# 数据与关联规范

每份数据都是独立 JSON 数组；`data/*.json` 可被公开网页直接读取。不可在这里上传教材 PDF、私人访问密钥或敏感记录。

| 集合 | 关键字段 | 说明 |
|---|---|---|
| chapters | id,number,title,groups,type | 完整26章目录，前5章为theory类型，后21章为药物分类 |
| theory | chapterId,title,pdfPages,topics | 前五章理论知识点的原创概要与PDF页码，topic.id稳定 |
| herbs | id,name,chapterId,groupId,nature,flavors,meridians,effects,source,reviewStatus | 以《学霸笔记—中药学》印刷页码为准，未核对标“待逐味复核” |
| knowledge | id,chapterId,herbIds,title,tags | 独立考点，可挂多个药 |
| questions / notes | id,type,title,body,answer,analysis,herbIds,knowledgeIds,createdAt,updatedAt | 多对多关联；原题注明来源，个人笔记和 AI 总结须分层 |
| events | id,date,eventType,entityType,entityId,label | 日期以 Asia/Shanghai 为基准；新增与修改不能混为一谈 |

## 日期和历史

- 系统记录 `createdAt`、`updatedAt`；首次创建日期不随编辑改变。
- 基础数据导入通过 `dataset_import` 事件登记；本机新加的错题/笔记按真实创建日期展示。
- 日历只按日期索引记录，不自动推送间隔复习。
- 公开 GitHub 数据与浏览器本地新增的数据是两层。当前网页不会自动把本地记录推回 GitHub。需要用户导出并提交/交给助手审核后再入库。

## 数据质量

- 保留原书药性、五味、归经的具体用词，包括“微寒”“微苦”等，不擅自简化。
- PDF 提取可能发生错字；`reviewStatus` 只有经逐味图像复核后才能改为“已复核”。
- AI 生成解析不得覆盖教材字段；错题的原始记录、个人错误原因、AI 解读应分开。
- 运行 `node scripts/validate.mjs` 检查主键、外键、必填字段、出处页码与日期格式。

## 单味药扩展详情（可选，尚待逐味录入）

药物 `data/herbs.json` 的每条记录可以增添 `details` 对象：

```json
{
  "details": {
    "indications": {
      "text": "此处只能填写已核对来源的主治内容",
      "source": {"title": "资料书名", "printPage": 123},
      "reviewStatus": "待复核"
    },
    "usage": {"text": "经核实的用法用量", "source": {"title": "资料书名", "printPage": 123}},
    "cautions": {"text": "经核实的使用注意", "source": {"title": "资料书名", "printPage": 123}},
    "pairings": {"text": "经核实的常用配伍", "source": {"title": "资料书名", "printPage": 123}},
    "differentiation": {"text": "经核实的药物鉴别要点", "source": {"title": "资料书名", "printPage": 123}}
  }
}
```

上述仅为字段结构示范，不是任何真实药物的内容。无来源的字段**不要创建或填充**。网站会显示未录入提示；横向比较中未收录字段显示“尚待补充”。不得把药理推测作为学霸笔记原文，也不把原书未写明的内容补成“教材事实”。

### 分条事实与字段级溯源

每节可增加 `items: [{label, text, source?, reviewStatus?}]`。有 `items` 时，兼容字段 `text` 必须严格等于 `items.map(item => item.label + "：" + item.text).join("\n")`，保存全部事实及限定条件，不能只留短摘要。旧有仅 `text` 的条目继续支持。页面、搜索、复制和横向对比都读取完整条目。

每节必须保留独立 `source`；单条未提供 `source` 或 `reviewStatus` 时继承该节对应元数据。提供 `source` 即替换为该条完整来源，不能把其他页面的复核证据混入。来源结构：

```json
{
  "title": "资料书名",
  "printPage": 123,
  "pdfPage": 9,
  "verification": {
    "method": "pdf-visual",
    "verifiedAt": "2026-10-19",
    "scope": "具体已核对的栏位、事实和仍未解决的问题"
  }
}
```

页码必须为正整数；`pdfPage` 从1计数，不是数组下标。已复核字段/条目须有 `pdfPage` 和有效的 `verification`（人工对照 PDF 图像、真实日期、具体范围），OCR 结果本身不能视为复核。`verification` 记录核对动作，`reviewStatus` 记录结论状态，两者不能混同：图像已比对但原书跨页冲突仍可为“待差异核对”。药物总状态与各节独立；部分字段已复核不升级整味药。

出处与校对数据集中在详情底部默认折叠的「资料出处与校对」入口。重要事实疑点必须同时写入可见条目，保留各处页码和差异，不藏在维护提示里。本次麻黄 `cautions` 保留198页与210页的慎/禁用差异，尚待核清；不得将其标为已终审。

## 网站功能补充
- `compare.js` 负责纯前端横向对比；2–4味药，按四气、五味、归经、功效、主治、用法、炮制、注意、配伍、辨析、毒性及其他考点列对齐。黄色仅表示字符串内容不同，不意味着医学上的矛盾。
- 在线提交入口采用 GitHub Issue Forms，见 `docs/WORKFLOW.md`；提交 Issue 不会自动合并入正式知识库。

## 完整教材录入原则
- **收录范围为整本《学霸笔记—中药学》**，不限于性味归经；但对外不复制原书长篇文字、表格截图。
- 目前前五章理论先录主题概要，后续逐节补全考研知识要点。药物条目逐味填写主治、用量、注意、配伍、鉴别等字段，逐项标记原书页码和复核状态。
- 知识点文件 `data/knowledge.json` 同时保存 `kp-t0*` 理论节点和 `kp-herb-*` 药物节点；一条笔记或错题可关联多个节点。
- 用户无需自行在网站提交，一切新增资料先经过助手分析和来源复核，再提交 GitHub。

**扩展字段约定**：`details.processing`（炮制与用法特点）、`details.toxicity`（毒性）、`details.specialNotes`（其他教材特有考点）采用同一 `{text,source,reviewStatus}` 结构；未核对不填。药物 `syllabusLevel` 保留原书 * 重点标记，不能把所有药物默认为同一级。
