import test from "node:test";
import assert from "node:assert/strict";
import worker from "../server/worker.js";

const env = {ALLOWED_ORIGIN:"https://example.test",ACCESS_TOKEN:"test-only",OPENAI_API_KEY:"test-only",OPENAI_MODEL:"test-only"};
const request = context => new Request("https://worker.example.test/chat", {
  method:"POST",headers:{Origin:env.ALLOWED_ORIGIN,Authorization:"Bearer test-only","Content-Type":"application/json"},
  body:JSON.stringify({question:"测试",context})
});

test("AI rejects oversized context without silently losing later facts", async () => {
  const response = await worker.fetch(request("资".repeat(11501)),env);
  assert.equal(response.status,413);
  assert.match((await response.json()).error,/未截断/);
});
test("AI receives every character up to the existing context limit", async t => {
  const context = "资".repeat(11497) + "禁用。";
  let forwarded;
  t.mock.method(globalThis,"fetch",async (_url, options) => {
    forwarded = JSON.parse(options.body);
    return Response.json({choices:[{message:{content:"测试回复"}}]});
  });
  const response = await worker.fetch(request(context),env);
  assert.equal(response.status,200);
  assert.ok(forwarded.messages[1].content.includes(context));
});
