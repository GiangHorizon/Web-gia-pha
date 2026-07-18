const API = "http://localhost:3000";

// ==========================================
// 1. XỬ LÝ ĐĂNG KÝ / ĐĂNG NHẬP
// ==========================================
async function register() { // method POST
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  
  if (!name || !email || !username || !password) {
    alert("Please fill in all fields");
    return;
  }
  if (password !== confirmPassword) {
    alert("Password and confirm password do not match");
    return;
  }
  
  try {
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, username, password })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Registration successful");
      window.location.href = "/public/mainpage/index.html"; // Giữ theo code 2, thay bằng "/main" nếu dùng router
    } else {
      alert(data.error || "Registration failed");
    }
  } catch (error) {
    console.error("Register error:", error);
  }
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("Please fill in all fields");
    return;
  }

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.message);
      window.location.href = "/public/mainpage/index.html"; // Giữ theo code 2, thay bằng "/main" nếu dùng router
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Login error:", error);
  }
}

// ==========================================
// 2. XỬ LÝ CÂY GIA PHẢ (FAMILY TREE)
// ==========================================
const selectEl = document.getElementById('generation-select');
const container = document.getElementById('tree-container');
let allMembers = [];
let currentGeneration = 'all';

// Hàm lọc thành viên theo từ khóa tìm kiếm (Lấy từ Code 1)
function filterMembers(members, keyword) {
  if (!keyword) return members;
  return members.filter(member =>
    member.name.toLowerCase().includes(keyword.toLowerCase())
  );
}
function formatDate(dateString) {
  if (!dateString) return "";
  // Tách lấy phần ngày trước chữ 'T' (YYYY-MM-DD)
  const datePart = dateString.split("T")[0]; 
  const [year, month, day] = datePart.split("-");
  return `${day}/${month}/${year}`; // Trả về định dạng DD/MM/YYYY thân thiện

  
}
// Hàm call API và vẽ cây gia phả đầy đủ tính năng
async function fetchAndRenderTree(generation, keyword = '') {
  try {
    currentGeneration = generation;
    const response = await fetch(`${API}/api/family_tree?generation=${generation}`);
    const data = await response.json(); // Nhận object { nodeDataArray, linkDataArray } từ Backend
    
    // Lấy danh sách thành viên thực tế từ nodeDataArray (bỏ qua các node kết hôn "MARRIAGE")
    // Đồng thời map lại thuộc tính ngày sinh/ngày mất cho đúng với phần hiển thị HTML bên dưới
    const members = (data.nodeDataArray || [])
      .filter(node => node.category === "MEMBER")
      .map(node => ({
        id: node.key,
        name: node.name,
        generation: node.generation,
        date_birth: node.birth, // map từ 'birth' của backend sang 'date_birth' của frontend
        date_death: node.death  // map từ 'death' của backend sang 'date_death' của frontend
      }));

    allMembers = members;
    
    // Lọc danh sách theo từ khóa tìm kiếm
    const filteredMembers = filterMembers(members, keyword);
    
    // Kiểm tra nếu không có thành viên nào khớp (Lúc này filteredMembers đã là một Array chuẩn)
    if (!filteredMembers.length) {
      container.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Không tìm thấy thành viên phù hợp.</div>';
      return;
    }

    // Gom các object từ database theo generation
    const groupedByGen = {};
    filteredMembers.forEach(member => {
      if (!groupedByGen[member.generation]) {
        groupedByGen[member.generation] = [];
      }
      groupedByGen[member.generation].push(member);
    });

    let htmlContent = `
      <div class="bg-slate-50 h-[700px] relative p-10 overflow-auto">
    `;

    Object.keys(groupedByGen).forEach((genKey, index) => {
      const listMembers = groupedByGen[genKey];
      const marginTopClass = index === 0 ? '' : 'mt-24';
      
      htmlContent += `<div class="flex justify-center gap-10 ${marginTopClass}">`;

      listMembers.forEach(member => {
        // Xử lý hiển thị vòng đời 
        const lifespan = (member.date_birth && member.date_death) 
          ? `${member.date_birth} - ${member.date_death}` 
          : (member.date_birth ? `${member.date_birth}` : "Chưa cập nhật");

        htmlContent += `
          <div class="bg-white shadow rounded-2xl w-64 p-4 text-center border border-gray-100 z-10">
            <h3 class="font-bold text-lg text-slate-800">${member.name}</h3>
            <p class="text-slate-500 text-sm">${lifespan}</p>
          </div>
        `;
      });

      htmlContent += `</div>`; 
    });

    htmlContent += `
        <div class="absolute bottom-6 right-6 w-40 h-40 border rounded-xl bg-white flex items-center justify-center text-gray-400 shadow-sm z-20">
          Mini Map
        </div>
      </div>
    `;
    
    // Đổ HTML vào container
    container.innerHTML = htmlContent;

  } catch (error) {
    console.error("Failed to load family tree:", error);
    container.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-center">
        Can't load family tree. Please try again later.
      </div>`;
  }
  const lifespan = (member.date_birth && member.date_death) 
  ? `${formatDate(member.date_birth)} - ${formatDate(member.date_death)}` 
  : (member.date_birth ? `${formatDate(member.date_birth)}` : "Chưa cập nhật");
}

// ==========================================
// 3. LẮNG NGHE SỰ KIỆN (EVENT LISTENERS)
// ==========================================

// Sự kiện thay đổi đời (Generation) trên thanh Select
if (selectEl) {
  selectEl.addEventListener('change', function() {
    const searchInput = document.getElementById('member-search');
    fetchAndRenderTree(this.value, searchInput ? searchInput.value : '');
  });
}

// Sự kiện tìm kiếm thành viên từ ô tìm kiếm ngoài (Global Event)
window.addEventListener('family-search', (event) => {
  fetchAndRenderTree(currentGeneration, event.detail || '');
});

// Kích hoạt load dữ liệu mặc định cho lần đầu tiên tải trang
document.addEventListener("DOMContentLoaded", () => {
  fetchAndRenderTree('all');
});