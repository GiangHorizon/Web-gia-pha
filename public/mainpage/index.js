function toggleAdminDropdown(event) {
  event.stopPropagation();
  const dropdownMenu = document.getElementById("adminDropdownMenu");
  dropdownMenu.classList.toggle("hidden");
}

window.addEventListener("click", function (event) {
  const dropdownMenu = document.getElementById("adminDropdownMenu");
  if (!dropdownMenu.classList.contains("hidden") && !event.target.closest(".id-admin-container")) {
    dropdownMenu.classList.add("hidden");
  }
});

window.addEventListener("DOMContentLoaded", () => {
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

  searchInput?.addEventListener("input", (e) => {
    window.dispatchEvent(new CustomEvent("family-search", { detail: e.target.value.trim().toLowerCase() }));
  });
});
// Show and hide
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarNav = document.getElementById('sidebar-nav');

    
  });


  