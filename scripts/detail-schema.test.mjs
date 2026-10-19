import test from "node:test";
import assert from "node:assert/strict";
import { detailText, validateDetails } from "./detail-schema.mjs";

const source = {title:"测试资料", printPage:210, pdfPage:24,
  verification:{method:"pdf-visual", verifiedAt:"2026-10-19", scope:"仅测试字段"}};
const items = [{label:"用量", text:"2～10g"}, {label:"适用限制", text:"保留具体人群与条件。"}];
const entry = () => ({text:detailText(items), items:structuredClone(items), source:structuredClone(source), reviewStatus:"已复核"});
const errors = details => {
  const result = [];
  validateDetails(details,"test-herb",(ok,message) => {if (!ok) result.push(message);});
  return result;
};

test("legacy text and sourced itemized details are both accepted", () => {
  assert.deepEqual(errors({usage:{text:"已有资料", source:{title:"测试资料",printPage:1}}}),[]);
  assert.deepEqual(errors({usage:entry()}),[]);
});
test("compatibility text cannot omit a dose or a qualifying condition", () => {
  const usage = entry();
  usage.text = "用量：2～10g";
  assert.match(errors({usage}).join("\n"),/preserve every item/);
});
test("reviewed facts require evidence and valid page/date metadata", () => {
  for (const mutate of [
    value => {delete value.source.verification;},
    value => {delete value.source.pdfPage;},
    value => {value.source.pdfPage = 0;},
    value => {value.source.printPage = -1;},
    value => {value.source.verification.verifiedAt = "2026-02-30";},
    value => {value.source.verification.scope = "";},
    value => {value.source.verification.method = "ocr-only";}
  ]) {
    const usage = entry(); mutate(usage);
    assert.ok(errors({usage}).length > 0);
  }
});
test("item overrides must carry their own complete source and review evidence", () => {
  const usage = entry();
  usage.items[0].source = {title:"另一页",printPage:211};
  assert.match(errors({usage}).join("\n"),/needs visual verification/);
  usage.items[0].reviewStatus = "待复核";
  assert.deepEqual(errors({usage}),[]);
});
test("malformed items fail validation without crashing", () => {
  for (const value of [[],{},[null],[{label:"",text:""}]]) {
    const usage = entry(); usage.items = value;
    assert.ok(errors({usage}).length > 0);
  }
});
