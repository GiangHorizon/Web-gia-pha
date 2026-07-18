const API = "http://localhost:3000";

// Lấy id từ URL query string (?id=X)
const urlParams = new URLSearchParams(window.location.search);
const memberId = urlParams.get("id");

let currentMemberData = null;

// Tải dữ liệu từ database khi mở trang
async function loadMemberDetail() {
  if (!memberId) {
    alert("Không tìm thấy ID thành viên hợp lệ!");
    return;
  }

  try {
    const response = await fetch(`${API}/api/members/${memberId}`);
    if (!response.ok) throw new Error("Thành viên không tồn tại");

    const member = await response.json();
    currentMemberData = member;

    // 1. Đổ dữ liệu cá nhân
    document.getElementById("mName").innerText = member.name;
    document.getElementById("mGender").innerText = member.gender_text;
    
    // Xử lý ngày sinh
    if (member.date_birth) {
      const dateObj = new Date(member.date_birth);
      document.getElementById("mDob").innerText = dateObj.toLocaleDateString("vi-VN");
      // Gán định dạng chuẩn YYYY-MM-DD cho ô input date
      document.getElementById("inputDob").value = dateObj.toISOString().split('T')[0];
    } else {
      document.getElementById("mDob").innerText = "---";
      document.getElementById("inputDob").value = "";
    }

    // Gmail & Ghi chú
    document.getElementById("mGmail").innerText = member.gmail || "---";
    document.getElementById("mNote").innerText = member.note || "---";

    // Vai trò và nhãn thiết lập
    const roleBadge = document.getElementById("mRoleBadge");
    roleBadge.innerText = member.role;
    if (member.role === "Admin") {
      roleBadge.className = "text-[10px] font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full uppercase";
    } else if (member.role === "Member") {
      roleBadge.className = "text-[10px] font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full uppercase";
    } else {
      roleBadge.className = "text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full uppercase";
    }

    // Thiết lập Avatar dựa trên ký tự đầu của Tên
    const firstLetter = member.name ? member.name.split(" ").pop().charAt(0) : "?";
    document.getElementById("avatarContainer").innerHTML = member.avatar_url
      ? `<img src="${member.avatar_url}" class="w-24 h-24 rounded-full object-cover border">`
      : `<div class="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-4xl font-bold border border-blue-200 uppercase">${firstLetter}</div>`;

    // 2. Đổ dữ liệu gia đình
    document.getElementById("fName").innerText = member.father_name || "---";
    document.getElementById("moName").innerText = member.mother_name || "---";
    document.getElementById("spName").innerText = member.spouse_name || "---";

    // Con cái
    const childrenList = document.getElementById("childrenList");
    if (member.children && member.children.length > 0) {
      childrenList.innerHTML = member.children
        .map(child => `<li><a href="information.html?id=${child.id}" class="text-blue-600 hover:underline">${child.name}</a></li>`)
        .join("");
    } else {
      childrenList.innerHTML = "<li>Không có dữ liệu</li>";
    }

    // 3. Chuẩn bị sẵn dữ liệu trong ô Input của chế độ Sửa
    document.getElementById("inputName").value = member.name;
    document.getElementById("selectGender").value = member.gender_text;
    document.getElementById("inputGmail").value = member.gmail || "";
    document.getElementById("inputNote").value = member.note || "";

  } catch (error) {
    console.error("Lỗi tải thông tin:", error);
    alert("Không thể tải thông tin thành viên này!");
  }
}

// Chuyển đổi qua lại giữa chế độ Đọc và Chỉnh Sửa
function toggleEditMode(isEdit) {
  const viewMode = document.getElementById("viewMode");
  const editMode = document.getElementById("editMode");

  if (isEdit) {
    viewMode.classList.add("hidden");
    editMode.classList.remove("hidden");
  } else {
    viewMode.classList.remove("hidden");
    editMode.classList.add("hidden");
  }
}

// Lưu thông tin chỉnh sửa trực tiếp vào database
async function saveInformation(event) {
  event.preventDefault();

  const payload = {
    name: document.getElementById("inputName").value.trim(),
    gender: document.getElementById("selectGender").value,
    date_birth: document.getElementById("inputDob").value || null,
    gmail: document.getElementById("inputGmail").value.trim() || null,
    note: document.getElementById("inputNote").value.trim() || null
  };

  if (!payload.name) {
    alert("Họ và tên không được để trống!");
    return;
  }

  try {
    const response = await fetch(`${API}/api/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Lỗi cập nhật server");

    alert("Cập nhật thông tin thành công!");
    toggleEditMode(false);
    loadMemberDetail(); // Tải lại trang sau khi cập nhật thành công

  } catch (error) {
    console.error(error);
    alert("Có lỗi xảy ra khi lưu thông tin!");
  }
}

// Khởi chạy ngay khi mở trang
document.addEventListener("DOMContentLoaded", loadMemberDetail);