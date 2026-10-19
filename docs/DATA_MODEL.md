# 数据与关联规范

每份数据都是独立 JSON 数组；`data/*.json` 可被公开网页直接读取。不可在这里上传教材 PDF、私人访问密钥或敏感记录。

| 集合 | 关键字段 | 说明 |
|---|---|---|
| chapters | id,number,title,groups | 章节编号与小类独立编号 |
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
      "reviewStatus": "已复核"
    },
    "usage": {"text": "经核实的用法用量", "source": {"title": "资料书名", "printPage": 123}},
    "cautions": {"text": "经核实的使用注意", "source": {"title": "资料书名", "printPage": 123}},
    "pairings": {"text": "经核实的常用配伍", "source": {"title": "资料书名", "printPage": 123}},
    "differentiation": {"text": "经核实的药物鉴别要点", "source": {"title": "资料书名", "printPage": 123}}
  }
}
```

上述仅为字段结构示范，不是任何真实药物的内容。无来源的字段**不要创建或填充**。网站会显示未录入提示；横向比较中未收录字段显示“尚待补充”。不得把药理推测作为学霸笔记原文，也不把原书未写明的内容补成“教材事实”。

## 网站功能补充
- `compare.js` 负责纯前端横向对比；2–4味药，按四气、五味、归经、功效、用法、注意、主治进行列对齐。黄色仅表示字符串内容不同，不意味着医学上的矛盾。
- 在线提交入口采用 GitHub Issue Forms，见 `docs/WORKFLOW.md`；提交 Issue 不会自动合并入正式知识库。
