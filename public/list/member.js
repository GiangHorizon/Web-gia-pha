const API = "";  // đường dẫn tương đối — tự khớp với domain đang chạy

const memberSearch = document.getElementById("memberSearch");
const genderFilter = document.getElementById("genderFilter");
const memberTableBody = document.getElementById("memberTableBody");

let memberListData = [];

// Quyền của người dùng hiện tại (lấy từ localStorage sau khi đăng nhập)
function getCurrentUserRole() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user ? user.role : null;
  } catch (e) {
    return null;
  }
}

function isCurrentUserAdmin() {
  return getCurrentUserRole() === "Admin";
}

// Đóng/mở dropdown tài khoản ở góc trên bên phải
function toggleAdminDropdown(event) {
  event.stopPropagation();
  const dropdown = document.getElementById("adminDropdownMenu");
  if (dropdown) dropdown.classList.toggle("hidden");
}

window.addEventListener("click", function (e) {
  if (!e.target.closest(".id-admin-container")) {
    const dropdown = document.getElementById("adminDropdownMenu");
    if (dropdown && !dropdown.classList.contains("hidden")) {
      dropdown.classList.add("hidden");
    }
  }
});

// Normalize text (remove Vietnamese accents & convert to lowercase)
function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Render member list
function renderMembers(members) {
  if (!memberTableBody) return;

  if (members.length === 0) {
    memberTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="p-8 text-center text-slate-500 py-12">
          No matching members found.
        </td>
      </tr>`;
    return;
  }

  memberTableBody.innerHTML = members
    .map((member) => {
      // Ngay sinh
      const dob = member.date_birth
        ? new Date(member.date_birth).toLocaleDateString("vi-VN")
        : "---";

      // Ngay mat
      const dod = member.date_death
        ? new Date(member.date_death).toLocaleDateString("vi-VN")
        : "---";
      //Anh
      const avatarHtml = member.avatar_url
        ? `<img src="${escapeHtml(member.avatar_url)}" alt="${escapeHtml(member.name)}" class="w-10 h-10 rounded-full object-cover border border-gray-200">`
        : `<div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase border border-blue-200">
            ${member.name ? escapeHtml(member.name.split(" ").pop().charAt(0)) : "?"}
           </div>`;

      // Sap xep thu tu
      return `
        <tr class="border-b hover:bg-gray-50 member-row" data-id="${member.id}">
          <!-- 1. Photo -->
          <td class="p-3 w-16 align-middle">
            ${avatarHtml}
          </td>
          
          <!-- 2. Full Name -->
          <td class="p-3 font-medium text-gray-800 align-middle">
          <div class="font-semibold">${escapeHtml(member.name)}</div>
          ${
          member.role === "Admin"
          ? `<span class="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase">Admin</span>`
          : member.role === "Member"
          ? `<span class="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full uppercase">Member</span>`
          : `<span class="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full uppercase">Guest</span>`
  }
</td>
          
          <!-- 3. Gender -->
          <td class="p-3 align-middle text-gray-600">
            ${escapeHtml(member.gender) || "Unknown"}
          </td>
          
          <!-- 4. Date of Birth -->
          <td class="p-3 align-middle text-gray-600">
            ${dob}
          </td>
          
          <!-- 5. Date of Death -->
          <td class="p-3 align-middle text-gray-600">
            ${dod}
          </td>
          
          <!-- 6. Father -->
          <td class="p-3 align-middle text-gray-600">
            ${escapeHtml(member.father_name) || "---"}
          </td>
          
          <!-- 7. Mother -->
          <td class="p-3 align-middle text-gray-600">
            ${escapeHtml(member.mother_name) || "---"}
          </td>
          
          <!-- 8. Actions -->
          <td class="p-3 align-middle text-center whitespace-nowrap">
            <a href="information.html?id=${member.id}" 
               title="View details"
               class="inline-block p-2 text-gray-500 hover:text-blue-600 transition-colors">
              <i class="fas fa-eye text-base"></i>
            </a>
            ${isCurrentUserAdmin() ? `
            <button onclick="editMember(${member.id})" 
                    title="Edit"
                    class="inline-block p-2 ml-1 text-gray-500 hover:text-green-600 transition-colors">
              <i class="fas fa-edit text-base"></i>
            </button>
            <button onclick="deleteMember(${member.id})" 
                    title="Delete"
                    class="inline-block p-2 ml-1 text-gray-500 hover:text-red-600 transition-colors">
              <i class="fas fa-trash text-base"></i>
            </button>
            ` : ``}
          </td>
        </tr>
      `;
    })
    .join("");
}

// Apply search and gender filters
function applyFilters() {
  if (!memberSearch || !genderFilter) return;

  const query = normalizeText(memberSearch.value.trim());
  const gender = genderFilter.value;

  const filtered = memberListData.filter((member) => {
    const matchesSearch =
      !query ||
      normalizeText(member.name).includes(query) ||
      normalizeText(member.relationship || "").includes(query);

    // Filter matches gender ('all', 'Male', or 'Female')
    const matchesGender =
      gender === "all" || (member.gender && member.gender === gender);

    return matchesSearch && matchesGender;
  });

  renderMembers(filtered);
}

// Fetch data from database
async function loadMembers() {
  try {
    memberTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="p-12 text-center text-gray-500">
          <i class="fas fa-spinner fa-spin text-xl"></i><br><br>
          Loading member list...
        </td>
      </tr>`;

    const response = await apiFetch(`${API}/api/members`);

    if (!response.ok) throw new Error("Server error");

    memberListData = await response.json();

    renderMembers(memberListData);
    applyFilters();
  } catch (error) {
    console.error(error);
    memberTableBody.innerHTML = `
      <tr>
        <td colspan="10" class="p-8 text-center text-red-500">
          Failed to load data from server.<br><br>
          <button onclick="loadMembers()" 
                  class="px-5 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-medium">
            Retry
          </button>
        </td>
      </tr>`;
  }
}

// Helper functions for Edit & Delete buttons
window.editMember = function (id) {
  if (!isCurrentUserAdmin()) {
    alert("Chỉ Admin mới có quyền chỉnh sửa thành viên.");
    return;
  }
  window.location.href = `information.html?id=${id}`;
};

window.deleteMember = async function (id) {
  if (!isCurrentUserAdmin()) {
    alert("Chỉ Admin mới có quyền xóa thành viên.");
    return;
  }

  if (!confirm(`Are you sure you want to delete member with ID ${id}?`)) {
    return;
  }

  try {
    const response = await apiFetch(`${API}/api/members/${id}`, {
      method: "DELETE"
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Xóa thành viên thất bại.");
    }

    alert("Đã xóa thành viên thành công!");
    loadMembers(); // Reload after deletion

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
};

// Initialize when page is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  if (memberSearch && genderFilter && memberTableBody) {
    memberSearch.addEventListener("input", applyFilters);
    genderFilter.addEventListener("change", applyFilters);

    loadMembers();
  }

  // Chỉ Admin mới thấy nút "Add Member"
  const addMemberBtn = document.getElementById("addMemberBtn");
  if (addMemberBtn && !isCurrentUserAdmin()) {
    addMemberBtn.style.display = "none";
  }
});
// Show and hide
document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menu-toggle");
  const sidebarNav = document.getElementById("sidebar-nav");

  menuToggle.addEventListener("click", () => {
    // Toggle class 'hidden' của Tailwind để ẩn/hiện phần nav
    sidebarNav.classList.toggle("hidden");
  });
});
