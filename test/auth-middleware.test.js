const { test } = require("node:test");
const assert = require("node:assert/strict");

const { parseCookies } = require("../middlewares/auth.js");

test("parseCookies: đọc đúng token từ header Cookie", () => {
    const req = { headers: { cookie: "token=abc123; other=xyz" } };
    assert.equal(parseCookies(req).token, "abc123");
});

test("parseCookies: không có header Cookie -> trả object rỗng", () => {
    const req = { headers: {} };
    assert.deepEqual(parseCookies(req), {});
});

test("parseCookies: giải mã đúng giá trị đã encodeURIComponent", () => {
    const req = { headers: { cookie: "user=" + encodeURIComponent("Nguyễn Văn A") } };
    assert.equal(parseCookies(req).user, "Nguyễn Văn A");
});

test("parseCookies: bỏ qua phần không có dấu '='", () => {
    const req = { headers: { cookie: "token=abc123; malformed; ok=1" } };
    const cookies = parseCookies(req);
    assert.equal(cookies.token, "abc123");
    assert.equal(cookies.ok, "1");
    assert.equal(Object.keys(cookies).length, 2);
});
