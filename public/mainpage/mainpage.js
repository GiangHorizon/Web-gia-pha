// ======================
// Authentication
// ======================
// Token giờ nằm trong cookie httpOnly (JS không đọc được) — dùng sự hiện
// diện của "user" trong localStorage làm tín hiệu đã đăng nhập ở client.
// Bảo vệ thực sự vẫn do backend kiểm tra cookie ở mỗi API call.
checkLogin();
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!user) {
    window.location.href = "/login/login.html";
}

// ======================
// Admin Dropdown
// ======================

function toggleAdminDropdown(event) {
    event.stopPropagation();

    const dropdown = document.getElementById("adminDropdownMenu");

    dropdown.classList.toggle("hidden");
}

window.addEventListener("click", (event) => {

    const dropdown = document.getElementById("adminDropdownMenu");

    if (
        dropdown &&
        !dropdown.classList.contains("hidden") &&
        !event.target.closest(".id-admin-container")
    ) {
        dropdown.classList.add("hidden");
    }

});

// ======================
// Main
// ======================

document.addEventListener("DOMContentLoaded", () => {

    // ======================
    // Hiển thị User
    // ======================

    document.getElementById("user-name").textContent =
        user.name || user.username;

    document.getElementById("dropdown-name").textContent =
        user.name || user.username;

    document.getElementById("dropdown-role").textContent =
        user.role;

    // ======================
    // Phân quyền
    // ======================

    if (user.role === "Member") {

        document.getElementById("menu-settings")
            ?.classList.add("hidden");

        document.getElementById("menu-statistics")
            ?.classList.add("hidden");

        document.getElementById("menu-dashboard")
            ?.classList.add("hidden");

        document.getElementById("menu-relationship")
            ?.classList.add("hidden");
    }

    // ======================
    // Logout: xử lý bởi onclick="logout()" trong HTML (gọi api.js, có
    // xóa cookie httpOnly ở server) — không cần gắn thêm listener ở đây.
    // ======================

    // ======================
    // Zoom
    // ======================
document.addEventListener("DOMContentLoaded", () => {

    checkLogin();

    const user = getCurrentUser();

    document.getElementById("userName").textContent = user.name;

    document.getElementById("userRole").textContent = user.role;

});
    const zoomInBtn = document.getElementById("zoom-in-btn");
    const zoomOutBtn = document.getElementById("zoom-out-btn");
    const resetViewBtn = document.getElementById("reset-view-btn");
    const compactBtn = document.getElementById("compact-btn");
    const treeContainer = document.getElementById("tree-container");
    const searchInput = document.getElementById("member-search");

    let zoom = 1;

    function applyZoom() {
        treeContainer.style.transform = `scale(${zoom})`;
    }

    zoomInBtn?.addEventListener("click", () => {

        zoom = Math.min(1.4, zoom + 0.1);

        applyZoom();

    });

    zoomOutBtn?.addEventListener("click", () => {

        zoom = Math.max(0.8, zoom - 0.1);

        applyZoom();

    });

    resetViewBtn?.addEventListener("click", () => {

        zoom = 1;

        applyZoom();

    });

    compactBtn?.addEventListener("click", () => {

        treeContainer.classList.toggle("opacity-80");

        treeContainer.classList.toggle("scale-[0.98]");

    });

    // ======================
    // Search
    // ======================

    searchInput?.addEventListener("input", (e) => {

        window.dispatchEvent(

            new CustomEvent("family-search", {

                detail: e.target.value.trim().toLowerCase()

            })

        );

    });

    // ======================
    // Mobile Menu
    // ======================

    const menuToggle = document.getElementById("menu-toggle");

    const sidebarNav = document.getElementById("sidebar-nav");

    menuToggle?.addEventListener("click", () => {

        sidebarNav?.classList.toggle("hidden");

    });

});