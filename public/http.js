// ==========================================
// http.js
// Wrapper cho fetch() dùng chung cho toàn bộ trang:
// - Tự động gửi kèm cookie httpOnly (credentials: "include")
//   thay vì đọc token từ localStorage như trước (SEC-6).
// - Tự động đưa người dùng về trang đăng nhập nếu phiên hết hạn (401).
// Nạp file này TRƯỚC các script khác có gọi apiFetch().
// ==========================================

async function apiFetch(url, options = {}) {

  const response = await fetch(url, {
    ...options,
    credentials: "include"
  });

  if (response.status === 401) {

    localStorage.removeItem("user");

    const path = window.location.pathname;

    if (!path.includes("/login/") && !path.includes("/register/")) {
      window.location.href = "/login/login.html";
    }

  }

  return response;

}
