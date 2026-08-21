// ==========================================
// role-guard.js
// Ẩn các mục menu chỉ dành cho Admin (Settings, Dashboard...)
// một cách đồng bộ trên MỌI trang. Đây chỉ là lớp UX —
// quyền thật sự vẫn được backend kiểm tra ở middleware isAdmin.
// ==========================================

(function () {

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch (e) {
      return null;
    }
  }

  // Các đường dẫn chỉ Admin được phép truy cập.
  // Thêm mục mới vào đây nếu sau này có thêm trang quản trị.
  const ADMIN_ONLY_HREF_PATTERNS = [
    "/settings/settings.html",
    "/statistics/statistics.html",
    "/dashboard/dashboard.html"
  ];

  document.addEventListener("DOMContentLoaded", function () {

    const user = getCurrentUser();

    // Chưa đăng nhập thì để các trang tự xử lý redirect (checkLogin),
    // ở đây không cần làm gì thêm.
    if (!user) return;

    if (user.role !== "Admin") {

      document.querySelectorAll("a[href]").forEach(function (link) {

        const href = link.getAttribute("href") || "";

        const isAdminOnly = ADMIN_ONLY_HREF_PATTERNS.some(function (pattern) {
          return href.includes(pattern);
        });

        if (isAdminOnly) {
          link.style.display = "none";
        }

      });

    }

  });

})();
