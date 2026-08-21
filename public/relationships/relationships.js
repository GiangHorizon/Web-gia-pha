const API = "http://localhost:3000";

function isCurrentUserAdmin() {
  const user = getCurrentUser(); // định nghĩa sẵn trong api.js
  return user ? user.role === "Admin" : false;
}

function toggleAdminDropdown(event) {
  event.stopPropagation();
  const dropdown = document.getElementById("adminDropdownMenu");
  if (dropdown) dropdown.classList.toggle("hidden");
}

document.addEventListener("DOMContentLoaded", () => {

  if (!isCurrentUserAdmin()) {
    const addBtn = document.getElementById("addRelationshipBtn");
    if (addBtn) addBtn.style.display = "none";
  }

  loadRelationships();

  document.getElementById("addRelationshipForm")
    .addEventListener("submit", handleAddRelationship);

  wireSpouseSearch("spouse1Search", "spouse1Results", "spouse1Id");
  wireSpouseSearch("spouse2Search", "spouse2Results", "spouse2Id");

});

// ==========================================
// TẢI & HIỂN THỊ DANH SÁCH
// ==========================================

async function loadRelationships() {

  const tbody = document.getElementById("relationshipsTableBody");
  const emptyState = document.getElementById("relationshipsEmpty");

  try {

    const response = await apiFetch(`${API}/api/relationships`);

    if (!response.ok) throw new Error("Không tải được dữ liệu");

    const relationships = await response.json();

    if (relationships.length === 0) {
      tbody.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    tbody.innerHTML = relationships.map(r => {

      const isEnded = !!r.ended_on;
      const statusBadge = isEnded
        ? `<span class="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">Đã kết thúc</span>`
        : `<span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-600">Đang hôn nhân</span>`;

      const adminActions = isCurrentUserAdmin() ? `
        <td class="p-3 text-center whitespace-nowrap">
          ${!isEnded ? `
            <button onclick="endRelationship(${r.id})" title="Đánh dấu kết thúc"
              class="inline-block p-2 text-gray-500 hover:text-amber-600 transition-colors">
              <i class="fas fa-heart-crack text-base"></i>
            </button>
          ` : ``}
          <button onclick="deleteRelationship(${r.id})" title="Xóa"
            class="inline-block p-2 text-gray-500 hover:text-red-600 transition-colors">
            <i class="fas fa-trash text-base"></i>
          </button>
        </td>
      ` : `<td class="p-3"></td>`;

      return `
        <tr class="border-b hover:bg-gray-50">
          <td class="p-3 font-medium text-gray-800">
            ${escapeHtml(r.spouse1_name)} <i class="fas fa-heart text-red-400 mx-1 text-xs"></i> ${escapeHtml(r.spouse2_name)}
          </td>
          <td class="p-3 text-gray-600">${r.married_on || "---"}</td>
          <td class="p-3">${statusBadge}</td>
          ${adminActions}
        </tr>
      `;

    }).join("");

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-red-500">Không tải được dữ liệu.</td></tr>`;
  }

}

// ==========================================
// THÊM QUAN HỆ MỚI (Admin)
// ==========================================

function openAddModal() {
  if (!isCurrentUserAdmin()) {
    alert("Chỉ Admin mới có quyền thêm quan hệ hôn nhân.");
    return;
  }
  document.getElementById("addModal").classList.remove("hidden");
}

function closeAddModal() {
  document.getElementById("addModal").classList.add("hidden");
  document.getElementById("addRelationshipForm").reset();
  document.getElementById("spouse1Id").value = "";
  document.getElementById("spouse2Id").value = "";
}

async function handleAddRelationship(e) {
  e.preventDefault();

  const spouse1_id = document.getElementById("spouse1Id").value;
  const spouse2_id = document.getElementById("spouse2Id").value;
  const married_on = document.getElementById("marriedOn").value;

  if (!spouse1_id || !spouse2_id) {
    alert("Vui lòng chọn cả 2 người từ danh sách gợi ý (gõ tên rồi bấm chọn).");
    return;
  }

  try {

    const response = await apiFetch(`${API}/api/relationships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spouse1_id, spouse2_id, married_on })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Thêm thất bại.");
      return;
    }

    closeAddModal();
    loadRelationships();

  } catch (err) {
    console.error(err);
    alert("Không kết nối được server.");
  }

}

// ==========================================
// TÌM KIẾM THÀNH VIÊN (dùng lại API search sẵn có)
// ==========================================

function wireSpouseSearch(inputId, resultsId, hiddenId) {

  const input = document.getElementById(inputId);
  const results = document.getElementById(resultsId);
  const hidden = document.getElementById(hiddenId);

  let debounceTimer;

  input.addEventListener("input", () => {

    hidden.value = ""; // reset lựa chọn cũ khi người dùng gõ lại
    clearTimeout(debounceTimer);

    const query = input.value.trim();

    if (!query) {
      results.classList.add("hidden");
      results.innerHTML = "";
      return;
    }

    debounceTimer = setTimeout(async () => {

      try {

        const response = await apiFetch(`${API}/api/addmember/search?q=${encodeURIComponent(query)}`);
        const members = await response.json();

        if (!members.length) {
          results.innerHTML = `<div class="p-2 text-gray-400">Không tìm thấy</div>`;
          results.classList.remove("hidden");
          return;
        }

        results.innerHTML = members.map(m => `
          <div class="p-2 hover:bg-gray-100 cursor-pointer" onclick="selectSpouse('${inputId}', '${resultsId}', '${hiddenId}', ${m.id}, '${escapeHtml(m.name).replace(/'/g, "\\'")}')">
            ${escapeHtml(m.name)} ${m.date_birth ? `<span class="text-gray-400">(${m.date_birth.split("-")[0]})</span>` : ""}
          </div>
        `).join("");

        results.classList.remove("hidden");

      } catch (err) {
        console.error(err);
      }

    }, 300);

  });

}

function selectSpouse(inputId, resultsId, hiddenId, id, name) {
  document.getElementById(inputId).value = name;
  document.getElementById(hiddenId).value = id;
  const results = document.getElementById(resultsId);
  results.classList.add("hidden");
  results.innerHTML = "";
}

// ==========================================
// KẾT THÚC / XÓA QUAN HỆ (Admin)
// ==========================================

async function endRelationship(id) {

  if (!isCurrentUserAdmin()) {
    alert("Chỉ Admin mới có quyền thao tác.");
    return;
  }

  if (!confirm("Đánh dấu quan hệ hôn nhân này đã kết thúc?")) return;

  try {

    const today = new Date().toISOString().split("T")[0];

    const response = await apiFetch(`${API}/api/relationships/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ended_on: today })
    });

    if (!response.ok) throw new Error("Cập nhật thất bại");

    loadRelationships();

  } catch (err) {
    console.error(err);
    alert("Không thể cập nhật.");
  }

}

async function deleteRelationship(id) {

  if (!isCurrentUserAdmin()) {
    alert("Chỉ Admin mới có quyền xóa.");
    return;
  }

  if (!confirm("Xóa quan hệ hôn nhân này? Hành động không thể hoàn tác.")) return;

  try {

    const response = await apiFetch(`${API}/api/relationships/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) throw new Error("Xóa thất bại");

    loadRelationships();

  } catch (err) {
    console.error(err);
    alert("Không thể xóa.");
  }

}

// ==========================================
// SIDEBAR TOGGLE (đồng bộ với các trang khác)
// ==========================================

document.getElementById("menu-toggle")?.addEventListener("click", () => {
  const nav = document.getElementById("sidebar-nav");
  if (nav) nav.classList.toggle("hidden");
});

window.addEventListener("click", (e) => {
  if (!e.target.closest(".id-admin-container")) {
    const dropdown = document.getElementById("adminDropdownMenu");
    if (dropdown && !dropdown.classList.contains("hidden")) {
      dropdown.classList.add("hidden");
    }
  }
  if (!e.target.closest("#spouse1Search, #spouse1Results")) {
    document.getElementById("spouse1Results")?.classList.add("hidden");
  }
  if (!e.target.closest("#spouse2Search, #spouse2Results")) {
    document.getElementById("spouse2Results")?.classList.add("hidden");
  }
});
