const { test } = require("node:test");
const assert = require("node:assert/strict");

const escapeHtml = require("../public/escape-html.js");

test("escapeHtml: escape đủ 5 ký tự nguy hiểm cho HTML", () => {
    assert.equal(
        escapeHtml(`<script>alert("xss")</script>`),
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
});

test("escapeHtml: chuỗi thường không bị thay đổi", () => {
    assert.equal(escapeHtml("Nguyễn Văn A"), "Nguyễn Văn A");
});

test("escapeHtml: null/undefined trả về chuỗi rỗng, không throw", () => {
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
});

test("escapeHtml: số được chuyển thành chuỗi", () => {
    assert.equal(escapeHtml(123), "123");
});

test("escapeHtml: ngăn được kịch bản chèn thuộc tính onerror qua ảnh", () => {
    const malicious = `"><img src=x onerror=alert(1)>`;
    const escaped = escapeHtml(malicious);
    assert.ok(!escaped.includes("<img"));
    assert.ok(!escaped.includes('"'));
});
