const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { AxiosError } = require("axios");
const file = path.resolve(__dirname, "../src/api/errorMessage.ts");
const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = new Module(file, module);
loaded.filename = file;
loaded.paths = Module._nodeModulePaths(path.dirname(file));
loaded._compile(compiled, file);
const { errorMessage } = loaded.exports;
function failure(status, data) {
  return new AxiosError("Request failed", undefined, undefined, undefined, { status, data });
}
const html = "<!doctype html><html><title>Server Error</title></html>";
for (const status of [400, 413, 500, 502, 503]) {
  const message = errorMessage(failure(status, html));
  assert(!message.includes("<"));
  assert(message.split("؛").length <= 2); // The HTML string must never split into characters.
  assert(message.length < 250);
}
assert.equal(errorMessage(failure(400, { logo: ["تصویر معتبر نیست."], name: ["نام الزامی است."] })), "تصویر معتبر نیست.؛ نام الزامی است.");
assert.equal(errorMessage(failure(400, { detail: "<html>private error</html>" })), errorMessage(failure(400, html)));
assert(errorMessage(failure(413, html)).includes("حجم فایل"));
assert(errorMessage(failure(403, {})).includes("اجازه"));
assert(errorMessage(new AxiosError("Network Error")).includes("اتصال اینترنت"));
console.log("API error message regression checks passed.");
