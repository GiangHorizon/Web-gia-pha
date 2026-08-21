
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch (e) {
    return null;
  }
}

function isCurrentUserAdmin() {
  const user = getCurrentUser();
  return user ? user.role === "Admin" : false;
}

const CURRENT_USER = getCurrentUser();
const CURRENT_USER_ID = CURRENT_USER ? CURRENT_USER.id : null;

function toggleAdminDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('adminDropdownMenu');
    dropdown.classList.toggle('hidden');
  }


document.addEventListener("DOMContentLoaded", async () => {
  // Token nằm trong cookie httpOnly — dùng "user" trong localStorage làm
  // tín hiệu UX; apiFetch() (http.js) sẽ tự đưa về login nếu cookie hết hạn.
  if (!CURRENT_USER) {
    window.location.href = "/login/login.html";
    return;
  }
  await loadUserSettings();
  await loadMemberListDropdown();
});

// Chuyển đổi qua lại giữa các Tab
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('bg-blue-50', 'text-blue-600');
    el.classList.add('text-gray-600', 'hover:bg-gray-50');
  });

  document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');
  const activeBtn = document.getElementById(`tab-btn-${tabName}`);
  if (tabName === 'admin') {
    activeBtn.classList.add('bg-red-50', 'text-red-600');
  } else {
    activeBtn.classList.add('bg-blue-50', 'text-blue-600');
  }
}

// Tải thông tin tài khoản hiện tại lên Form
async function loadUserSettings() {
  if (!CURRENT_USER_ID) return;

  try {
    const res = await apiFetch(`/api/settings/account/${CURRENT_USER_ID}`);
    if (!res.ok) return;

    const account = await res.json();

    document.getElementById("setting-name").value = account.name || "";
    document.getElementById("setting-email").value = account.email || "";
    document.getElementById("setting-member-id").value = account.member_id || "";

    // Tab Admin chỉ hiển thị cho tài khoản có role Admin
    if (isCurrentUserAdmin()) {
      document.getElementById("tab-btn-admin").classList.remove("hidden");
    }
  } catch (err) {
    console.error("Lỗi lấy thông tin cài đặt tài khoản:", err);
  }
}

// Tải danh sách thành viên gia phả vào thẻ select dropdown để liên kết
async function loadMemberListDropdown() {
  try {
    const res = await apiFetch("/api/members");
    const members = await res.json();
    const selectDropdown = document.getElementById("setting-member-id");

    members.forEach(m => {
      const option = document.createElement("option");
      option.value = m.id;
      option.textContent = `${m.name} (${m.date_birth ? m.date_birth.split("-")[0] : 'Không rõ năm sinh'})`;
      selectDropdown.appendChild(option);
    });
  } catch (err) {
    console.error("Không thể tải danh sách thành viên cho dropdown:", err);
  }
}

// Xử lý Sự kiện Submit Form Thay đổi thông tin cá nhân
document.getElementById("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("setting-name").value;
  const email = document.getElementById("setting-email").value;
  const member_id = document.getElementById("setting-member-id").value || null;

  try {
    const res = await apiFetch(`/api/settings/account/${CURRENT_USER_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, member_id })
    });
    const data = await res.json();
    alert(data.message || "Cập nhật thành công!");
    location.reload();
  } catch (err) {
    alert("Cập nhật thất bại.");
  }
});

// Xử lý Sự kiện Đổi mật khẩu
document.getElementById("password-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const oldPassword = document.getElementById("old-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmNewPassword = document.getElementById("confirm-new-password").value;

  if (newPassword !== confirmNewPassword) {
    alert("Mật khẩu mới và xác nhận mật khẩu không trùng khớp!");
    return;
  }

  try {
    const res = await apiFetch(`/api/settings/password/${CURRENT_USER_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Đổi mật khẩu thành công!");
      document.getElementById("password-form").reset();
    } else {
      alert(data.message || data.error || "Thao tác thất bại.");
    }
  } catch (err) {
    alert("Lỗi kết nối Server.");
  }
});

// Hàm Backup dữ liệu dành riêng cho Admin
async function backupData() {
  if (!isCurrentUserAdmin()) {
    alert("Chỉ Admin mới có quyền sao lưu dữ liệu.");
    return;
  }

  try {
    const res = await apiFetch("/api/admin/backup");

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Backup thất bại.");
    }

    const data = await res.json();

    // Tạo file download client-side nhanh chóng
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `giapha_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    alert(err.message || "Không thể xuất sao lưu dữ liệu.");
  }
}
