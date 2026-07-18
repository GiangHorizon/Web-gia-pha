const API_PROFILE_URL = '/api/user/profile';

function toggleAdminDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('adminDropdownMenu');
    dropdown.classList.toggle('hidden');
  }
  
async function loadProfileData() {
  try {
    const response = await fetch(API_PROFILE_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Không thể fetch dữ liệu từ PostgreSQL.');
    
    const data = await response.json();

    // Hiển thị text tổng quan
    document.getElementById('display-name').textContent = data.name || '---';
    document.getElementById('display-role').textContent = data.gmail || 'Chưa cập nhật Email';
    document.getElementById('sys-member-link').textContent = `Mã số: #${data.id}`;
    document.getElementById('sys-generation').textContent = `Bố: ${data.father_name} | Mẹ: ${data.mother_name}`;
    
    // Đổ dữ liệu vào các ô Input của Form (Bao gồm trường mới)
    document.getElementById('input-fullname').value = data.name || '';
    document.getElementById('input-gender').value = data.gender || 'Nam';
    document.getElementById('input-gmail').value = data.gmail || '';
    document.getElementById('input-phone').value = data.phone || '';       // Trường mới
    document.getElementById('input-address').value = data.address || '';   // Trường mới
    
    if (data.date_birth) {
      document.getElementById('input-birthday').value = data.date_birth.split('T')[0];
    }

    // Xử lý avatar
    const avatarImg = document.getElementById('profile-avatar');
    const avatarPlaceholder = document.getElementById('profile-avatar-placeholder');
    if (data.avatar_url) {
      avatarImg.src = data.avatar_url;
      avatarImg.classList.remove('hidden');
      avatarPlaceholder.classList.add('hidden');
    }

    document.querySelectorAll('.current-admin-name').forEach(el => {
      el.textContent = data.name || 'Admin';
    });

  } catch (error) {
    console.error('Lỗi Data Binding:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProfileData();

  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Thu thập thêm phone và address gửi lên server
      const updatedData = {
        name: document.getElementById('input-fullname').value,
        gender: document.getElementById('input-gender').value,
        date_birth: document.getElementById('input-birthday').value,
        gmail: document.getElementById('input-gmail').value,
        phone: document.getElementById('input-phone').value,       // Trường mới
        address: document.getElementById('input-address').value    // Trường mới
      };

      try {
        const response = await fetch(API_PROFILE_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });

        if (response.ok) {
          alert('Dữ liệu đã được lưu thành công vào PostgreSQL!');
          loadProfileData();
        } else {
          alert('Cập nhật thất bại.');
        }
      } catch (error) {
        console.error('Lỗi kết nối mạng:', error);
      }
    });
  }

  const menuToggle = document.getElementById('menu-toggle');
  const sidebarNav = document.getElementById('sidebar-nav');
  if (menuToggle && sidebarNav) {
    menuToggle.addEventListener('click', () => sidebarNav.classList.toggle('hidden'));
  }
});