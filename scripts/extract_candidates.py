#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从用户合法持有的《学霸笔记—中药学》PDF提取待核对的药名候选。
仅用于本机辅助整理：不复制正文、不向公开仓库自动导入未审校数据。
Requires: pip install pymupdf
Usage: python scripts/extract_candidates.py "学霸笔记—中药学.pdf" --out drafts/candidates.json
"""
import argparse
import json
import re
from pathlib import Path
import fitz

PATTERN = re.compile(r"^[\u3400-\u9fff]{2,7}\*?$")
BAN = {"中药名","主治","功效","注意事项","用法用量","性味归经","使用注意","配伍方法","性能特点","适应证"}
PROPERTY_CHARS = set("辛甘苦酸咸淡涩寒热温凉平微大有毒心肝脾肺肾胃胆小肠膀胱三焦")
def find_names(page):
    result = []
    for block in page.get_text("blocks"):
        x0,y0,x1,y1,text,*_ = block
        if not (62 <= x0 <= 126 and 110 <= y0 <= 775):
            continue
        name=re.sub(r"\s+","",text).rstrip("*")
        if not PATTERN.fullmatch(re.sub(r"\s+","",text)):continue
        if name in BAN or set(name).issubset(PROPERTY_CHARS):continue
        if name.startswith("第") or name.startswith("第二"):continue
        result.append({
          "nameCandidate":name,
          "syllabusAsterisk":re.sub(r"\s+","",text).endswith("*"),
          "candidateY":round((y0+y1)/2,1),
          "reviewStatus":"needs_manual_pdf_review"
        })
    return result

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("pdf",type=Path)
    ap.add_argument("--out",type=Path,required=True)
    args=ap.parse_args()
    doc=fitz.open(args.pdf)
    data={"status":"LOCAL_DRAFT_NOT_FOR_PUBLICATION","source":args.pdf.name,"pageCandidates":[]}
    for index,page in enumerate(doc):
        if index<23:continue # 前五章是理论，另行审核入库
        drugs=find_names(page)
        if drugs:data["pageCandidates"].append({"pdfPage":index+1,"drafts":drugs})
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
    print("候选药名（含识别误差）:",sum(len(x["drafts"]) for x in data["pageCandidates"]))
    print("请逐个对照原 PDF 核对药名、性味、主治、用量等；严禁直接发布此候选数据。")

if __name__=="__main__":main()
