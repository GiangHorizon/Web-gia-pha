const API_URL = "";  // đường dẫn tương đối — tự khớp với domain đang chạy

async function login() {

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
        alert("Vui lòng nhập đầy đủ thông tin");
        return;
    }

    try {

        const response = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include", // để trình duyệt nhận cookie httpOnly từ server
            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Đăng nhập thất bại");
            return;
        }

        // Token nằm trong cookie httpOnly (server tự set) — JS không lưu token nữa.
        localStorage.setItem("user", JSON.stringify(data.user));

        alert("Đăng nhập thành công");

        window.location.href = "/mainpage/mainpage.html";

    } catch (err) {

        console.error(err);
        alert("Không kết nối được server");

    }

}

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            login();
        });
    }

});