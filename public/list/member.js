const API = "http://localhost:3000";

const memberSearch = document.getElementById("memberSearch");
const genderFilter = document.getElementById("genderFilter");
const memberTableBody = document.getElementById("memberTableBody");

let allMembers = [];

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
        <td colspan="6" class="p-8 text-center text-slate-500 py-12">
          No matching members found.
        </td>
      </tr>`;
    return;
  }

  memberTableBody.innerHTML = members
    .map(
      (member) => `
    <tr class="border-b hover:bg-gray-50 member-row" data-id="${member.id}">
      <td class="p-3">
        <img src="${member.avatar_url || "https://via.placeholder.com/40"}" 
             alt="${member.name}" 
             class="w-10 h-10 rounded-full object-cover border border-gray-200">
      </td>
      <td class="p-3 font-medium text-gray-800">${member.name}</td>
      <td class="p-3">${member.gender || "Unknown"}</td>
      <td class="p-3">${member.date_birth || "---"}</td>
      <td class="p-3">${member.relationship || "Member"}</td>
      <td class="p-3 text-center">
        <a href="information.html?id=${member.id}" 
           title="View details"
           class="inline-block p-2 text-gray-600 hover:text-blue-600 transition-colors">
          <i class="fas fa-eye"></i>
        </a>
        <button onclick="editMember(${member.id})" 
                title="Edit"
                class="inline-block p-2 ml-1 text-gray-600 hover:text-green-600 transition-colors">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="deleteMember(${member.id})" 
                title="Delete"
                class="inline-block p-2 ml-1 text-gray-600 hover:text-red-600 transition-colors">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
}

// Apply search and gender filters
function applyFilters() {
  if (!memberSearch || !genderFilter) return;

  const query = normalizeText(memberSearch.value.trim());
  const gender = genderFilter.value;

  const filtered = allMembers.filter((member) => {
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

    const response = await fetch(`${API}/api/members`);

    if (!response.ok) throw new Error("Server error");

    allMembers = await response.json();

    renderMembers(allMembers);
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
  window.location.href = `editMember.html?id=${id}`;
};

window.deleteMember = function (id) {
  if (confirm(`Are you sure you want to delete member with ID ${id}?`)) {
    // TODO: Call delete API later
    alert(`Deleting member ID: ${id}...`);
    loadMembers(); // Reload after deletion
  }
};

// Initialize when page is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  if (memberSearch && genderFilter && memberTableBody) {
    memberSearch.addEventListener("input", applyFilters);
    genderFilter.addEventListener("change", applyFilters);

    loadMembers();
  }
});
// Show and hide
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarNav = document.getElementById('sidebar-nav');

    menuToggle.addEventListener('click', () => {
      // Toggle class 'hidden' của Tailwind để ẩn/hiện phần nav
      sidebarNav.classList.toggle('hidden');
    });
  });