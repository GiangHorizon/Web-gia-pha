const API = 'http://localhost:3000';

// Chặn truy cập trực tiếp nếu không phải Admin
(function guardAdminOnly() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'Admin') {
      alert('Chỉ Admin mới có quyền thêm thành viên.');
      window.location.href = 'member.html';
    }
  } catch (e) {
    window.location.href = '../login/login.html';
  }
})();

function toggleAdminDropdown(event) {
  event.stopPropagation();
  const dropdown = document.getElementById('adminDropdownMenu');
  if (dropdown) dropdown.classList.toggle('hidden');
}

window.addEventListener('click', function (e) {
  if (!e.target.closest('.id-admin-container')) {
    const dropdown = document.getElementById('adminDropdownMenu');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      dropdown.classList.add('hidden');
    }
  }
});

document.getElementById('addMemberForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const gender = document.getElementById('gender').value;
    const date_birth = document.getElementById('date_birth').value || null;
    const date_death = document.getElementById('date_death').value || null;
    const note = document.getElementById('note').value.trim() || null;

    if (!name || !gender) {
        alert("Please enter Full Name and select Gender!");
        return;
    }

    const newMember = {
        name,
        gender, // Sẽ mang giá trị "Male" hoặc "Female" từ HTML mới
        date_birth,
        date_death,
        note,
        relationship: "Member" // Đã chuyển từ "Thành viên" -> "Member"
    };

    try {
        const response = await apiFetch(`${API}/api/addmember`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newMember)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error ${response.status}`);
        }

        alert("Member added successfully!");
        window.location.href = "member.html";

    } catch (error) {
        console.error(error);
        alert("Failed to add member: " + error.message);
    }
});

// Search and filter functionality for parent selection

const searchInput = document.getElementById('parent-search');
    const resultsContainer = document.getElementById('search-results');
    const hiddenInput = document.getElementById('selected-parent-id');
    let debounceTimer;

    // Sự kiện khi người dùng nhập thông tin
    searchInput.addEventListener('input', function() {
        const keyword = this.value.trim();
        
        // Xóa bộ đếm thời gian cũ 
        clearTimeout(debounceTimer);

        if (!keyword) {
            resultsContainer.classList.add('hidden');
            hiddenInput.value = "";
            return;
        }

        // Đợi người dùng dừng gõ 300ms rồi mới gọi API
        debounceTimer = setTimeout(() => {
            fetchMembersFromDB(keyword);
        }, 300);
    });

    // Hàm gọi API đến Backend để truy vấn PostgreSQL
    async function fetchMembersFromDB(query) {
        try {
            // Thay đường dẫn API phù hợp với route backend của bạn
            const response = await apiFetch(`${API}/api/addmember/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            renderResults(data);
        } catch (error) {
            console.error("Lỗi khi kết nối với database:", error);
        }
    }

    // Hàm hiển thị các Thẻ kết quả dựa trên cấu trúc database thật
    function renderResults(members) {
        resultsContainer.innerHTML = ''; 

        if (members.length === 0) {
            resultsContainer.innerHTML = '<div class="p-3 text-sm text-gray-500 text-center">Không tìm thấy thành viên nào</div>';
            resultsContainer.classList.remove('hidden');
            return;
        }

        members.forEach(member => {
            const card = document.createElement('div');
            card.className = "p-3 hover:bg-blue-50 cursor-pointer transition-colors";
            
            // Xử lý thông tin hiển thị trực quan (Khớp với các cột trong ảnh)
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-semibold text-sm text-gray-800">${escapeHtml(member.name)}</span>
                    <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">ID: ${member.id}</span>
                </div>
                <div class="text-xs text-gray-500 mt-1">
                    <span>Năm sinh: <strong>${escapeHtml(member.date_birth) || 'Chưa rõ'}</strong></span>
                    ${member.spouse_name ? `<span class="mx-2">|</span><span>Phối ngẫu: <strong>${escapeHtml(member.spouse_name)}</strong></span>` : ''}
                </div>
            `;

            // Khi click chọn thành viên
            card.addEventListener('click', function() {
                searchInput.value = `${member.name} (Sinh năm ${member.date_birth || '?'})`;
                hiddenInput.value = member.id; // Gán ID thật từ PostgreSQL vào input ẩn
                resultsContainer.classList.add('hidden');
            });

            resultsContainer.appendChild(card);
        });

        resultsContainer.classList.remove('hidden');
    }

    // Ẩn kết quả khi bấm ra ngoài
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });