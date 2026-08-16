// ==========================================
// escape-html.js
// Hàm dùng chung để escape dữ liệu trước khi chèn vào innerHTML,
// tránh Stored XSS khi tên/ghi chú thành viên chứa mã HTML độc hại.
// Nạp file này TRƯỚC các script khác có dùng escapeHtml().
// ==========================================

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c];
  });
}

// Cho phép require() được từ Node.js (viết test) mà không ảnh hưởng
// tới cách dùng như 1 hàm global bình thường trong trình duyệt qua <script>.
if (typeof module !== "undefined" && module.exports) {
  module.exports = escapeHtml;
}
