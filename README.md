# Web Gia Phả - Hệ Thống Quản Lý Cây Gia Phả Trực Tuyến

## Dự án thực hành: Xây dựng website quản lý và tra cứu thông tin gia phả trực tuyến sử dụng Node.js, Express.js và PostgreSQL.

## Thành Viên Thực Hiện Dự Án
* **Thành Viên:** [Nguyễn Trường Giang]
* **Thành Viên:** Nguyễn Đức Thành

---

## 🛠️ Công nghệ sử dụng

* **Backend:** Node.js, Express.js.
* **Frontend:** HTML5, CSS3, JavaScript, Tailwind CSS.
* **Cơ sở dữ liệu:** PostgreSQL.
* **ORM/Database:** PostgreSQL sử dụng thư viện `pg`.
* **Xác thực:** JWT (JSON Web Token) kết hợp bcrypt.
* **Phân quyền:** Role-Based Access Control (RBAC) với hai vai trò Admin và Member.
* **Hiển thị cây gia phả:** GoJS.
* **Quản lý phiên đăng nhập:** JWT lưu phía Client và gửi qua HTTP Authorization Header.
* **API:** RESTful API.
* **Công cụ phát triển:** Visual Studio Code, PostgreSQL/pgAdmin 4.
* **Quản lý mã nguồn:** Git/GitHub.

---

## ✨ Các tính năng chính

### 👤 Dành cho Thành viên

1. **Đăng ký tài khoản:** Cho phép người dùng tạo tài khoản mới bằng họ tên, email, username và mật khẩu.
2. **Đăng nhập:** Xác thực tài khoản bằng username và mật khẩu.
3. **Đăng xuất:** Xóa thông tin xác thực và kết thúc phiên đăng nhập.
4. **Xem cây gia phả:** Hiển thị trực quan quan hệ giữa các thành viên trong gia đình.
5. **Tra cứu thành viên:** Tìm kiếm thành viên theo tên.
6. **Lọc theo thế hệ:** Cho phép lọc và hiển thị thành viên theo từng thế hệ.
7. **Xem thông tin thành viên:** Hiển thị các thông tin như họ tên, giới tính, ngày sinh, ngày mất và các thông tin liên quan.
8. **Theo dõi quan hệ gia đình:** Xác định quan hệ cha, mẹ và các thành viên thuộc từng thế hệ.

### 🛡️ Dành cho Quản trị viên (Admin)

1. **Dashboard:** Theo dõi tổng quan số lượng thành viên và dữ liệu gia phả.
2. **Quản lý thành viên:** Xem danh sách, thêm, sửa và xóa thông tin thành viên.
3. **Quản lý quan hệ gia đình:** Thiết lập quan hệ cha, mẹ giữa các thành viên.
4. **Quản lý thông tin cá nhân:** Cập nhật ngày sinh, ngày mất, giới tính, địa chỉ, số điện thoại, email, tiểu sử và ghi chú.
5. **Quản lý tài khoản:** Theo dõi các tài khoản người dùng trong hệ thống.
6. **Phân quyền:** Phân biệt quyền truy cập giữa Admin và Member.
7. **Kích hoạt/khóa tài khoản:** Quản trị viên có thể kiểm soát trạng thái hoạt động của tài khoản.
8. **Quản lý cây gia phả:** Cập nhật dữ liệu thành viên và quan hệ để đồng bộ với sơ đồ cây gia phả.

---

## 🔐 Authentication & Authorization

Hệ thống sử dụng cơ chế **Authentication và Authorization** để bảo vệ dữ liệu và kiểm soát quyền truy cập.

### Authentication

Quá trình xác thực được thực hiện thông qua:

```text
Username + Password
        ↓
Kiểm tra tài khoản PostgreSQL
        ↓
bcrypt.compare()
        ↓
Xác thực thành công
        ↓
Tạo JWT
        ↓
Client lưu Token
```

Mật khẩu người dùng không được lưu trực tiếp dưới dạng văn bản thuần. Hệ thống sử dụng **bcrypt** để tạo password hash trước khi lưu vào PostgreSQL.

### Authorization

Hệ thống sử dụng phân quyền dựa trên vai trò:

* **Admin:** Có quyền quản lý thành viên, tài khoản và dữ liệu gia phả.
* **Member:** Có quyền xem, tìm kiếm và tra cứu thông tin gia phả.

Các API quan trọng được bảo vệ bằng middleware `verifyToken`. Backend kiểm tra JWT trước khi cho phép người dùng truy cập tài nguyên yêu cầu xác thực.

---

## 🗄️ Cơ sở dữ liệu

Hệ thống sử dụng **PostgreSQL** với các bảng chính:

### `roles`

Lưu thông tin vai trò:

```text
1 → Admin
2 → Member
```

### `accounts`

Lưu thông tin tài khoản:

```text
id
username
password
name
email
role_id
member_id
is_active
created_at
updated_at
```

### `members`

Lưu thông tin thành viên trong gia phả:

```text
id
name
gender
father_id
mother_id
date_birth
date_death
birth_order
gmail
phone
address
biography
note
avatar_url
created_at
updated_at
```

Quan hệ giữa các thành viên được xây dựng thông qua:

```text
father_id → members.id
mother_id → members.id
```

Nhờ đó hệ thống có thể xác định quan hệ cha/mẹ và xây dựng cây gia phả.

---

## 🌳 Hiển thị cây gia phả

Hệ thống sử dụng **GoJS** để xây dựng giao diện cây gia phả trực quan.

Dữ liệu được lấy từ API:

```text
GET /api/family_tree
```

Backend truy vấn dữ liệu thành viên và quan hệ cha/mẹ từ PostgreSQL, sau đó chuyển thành dữ liệu node và link để frontend hiển thị.

Mô hình dữ liệu:

```text
          Nguyễn Văn A
                 │
        ┌────────┴────────┐
        │                 │
 Nguyễn Văn C       Nguyễn Thị D
        │
   ┌────┴────┐
   │         │
 Nguyễn G   Nguyễn H
```

Người dùng có thể xem cây gia phả, lọc theo thế hệ và tìm kiếm thành viên.

---

## 🔌 Các API chính

### Authentication

```text
POST /register
```

Đăng ký tài khoản mới.

```text
POST /api/login
```

Đăng nhập và nhận JWT.

### Thành viên

```text
GET /api/members
```

Lấy danh sách thành viên.

```text
GET /api/members/:id
```

Lấy thông tin một thành viên.

```text
POST /api/addmember
```

Thêm thành viên.

```text
PUT /api/members/:id
```

Cập nhật thông tin thành viên.

```text
DELETE /api/members/:id
```

Xóa thành viên.

### Cây gia phả

```text
GET /api/family_tree
```

Lấy dữ liệu để xây dựng cây gia phả.

Có thể truyền tham số:

```text
/api/family_tree?generation=1
```

để lọc dữ liệu theo thế hệ.

### Tìm kiếm

```text
GET /api/addmember/search
```

Tìm kiếm thành viên trong hệ thống.

---

## 🔒 Bảo mật hệ thống

Hệ thống áp dụng một số cơ chế bảo mật:

* Sử dụng bcrypt để hash mật khẩu.
* Không lưu mật khẩu dạng plain text.
* Sử dụng JWT để xác thực request.
* Sử dụng middleware `verifyToken` để bảo vệ API.
* Phân quyền Admin và Member.
* Sử dụng biến môi trường `.env` để lưu thông tin cấu hình và JWT Secret.
* Không đưa thông tin mật khẩu database và JWT Secret lên GitHub.
* Kiểm tra trạng thái `is_active` của tài khoản trước khi cho phép đăng nhập.

Các thông tin cấu hình được lưu trong file `.env`:

```env
PORT=3000

JWT_SECRET=your_secret_key

DB_USER=postgres
DB_HOST=localhost
DB_NAME=family_tree
DB_PASSWORD=your_password
DB_PORT=5432
```

---

## 🔑 Tài khoản thử nghiệm (Demo Accounts)

### 1. Tài khoản Quản trị viên (Admin)

* **Username:** `admin`
* **Mật khẩu:** `Admin@123`
* **Role:** `Admin`

### 2. Tài khoản Thành viên (Member)

* **Username:** `member`
* **Mật khẩu:** `Member@123`
* **Role:** `Member`

> Mật khẩu thực tế được lưu dưới dạng bcrypt hash trong cơ sở dữ liệu.

---

# 💻 Hướng dẫn chạy dự án dưới Local

## 1. Yêu cầu hệ thống

Cài đặt các phần mềm:

* Node.js.
* Visual Studio Code.
* PostgreSQL.
* pgAdmin 4.
* Git.

Kiểm tra Node.js:

```bash
node -v
```

Kiểm tra npm:

```bash
npm -v
```

---

## 2. Clone project

Clone repository về máy:

```bash
git clone <repository-url>
```

Di chuyển vào thư mục project:

```bash
cd Web-gia-pha-updated
```

---

## 3. Cài đặt thư viện

Chạy:

```bash
npm install
```

Nếu xuất hiện lỗi thiếu `dotenv`, chạy:

```bash
npm install dotenv
```

Các thư viện chính của backend bao gồm:

```text
express
pg
bcrypt
jsonwebtoken
dotenv
cors
```

---

## 4. Cấu hình PostgreSQL

Tạo database:

```sql
CREATE DATABASE family_tree;
```

Sau đó chạy file schema:

```text
database/schema.sql
```

File schema sẽ tạo các bảng:

```text
roles
members
accounts
```

và các quan hệ cần thiết cho hệ thống.

---

## 5. Cấu hình `.env`

Tạo file:

```text
.env
```

với nội dung:

```env
PORT=3000

JWT_SECRET=familytree_secret_key

DB_USER=postgres
DB_HOST=localhost
DB_NAME=family_tree
DB_PASSWORD=your_password
DB_PORT=5432
```

Thay `your_password` bằng mật khẩu PostgreSQL trên máy.

Không đưa file `.env` lên GitHub.

---

## 6. Khởi động Backend

Chạy:

```bash
npm start
```

hoặc:

```bash
node server.js
```

Nếu server chạy thành công:

```text
Server running on port 3000
```

Website có thể được truy cập tại:

```text
http://localhost:3000
```

---

## 7. Đăng nhập

Mở trang đăng nhập:

```text
http://localhost:3000/login/login.html
```

Sử dụng tài khoản:

```text
Username: admin
Password: Admin@123
```

hoặc:

```text
Username: member
Password: Member@123
```

---

# 📝 Nhật ký cập nhật tiến độ công việc

## 1. Phần Authentication & Authorization

* Xây dựng chức năng đăng ký tài khoản.
* Xây dựng chức năng đăng nhập.
* Sử dụng bcrypt để hash và kiểm tra mật khẩu.
* Tích hợp JWT để xác thực người dùng.
* Xây dựng middleware `verifyToken` để bảo vệ API.
* Xây dựng cơ chế phân quyền giữa Admin và Member.
* Kiểm tra trạng thái hoạt động của tài khoản thông qua trường `is_active`.
* Xây dựng chức năng đăng xuất và xóa thông tin xác thực phía Client.

## 2. Phần Cơ sở dữ liệu

* Xây dựng PostgreSQL database cho hệ thống gia phả.
* Tạo bảng `members` để lưu thông tin thành viên.
* Tạo bảng `accounts` để quản lý tài khoản.
* Tạo bảng `roles` để quản lý quyền.
* Xây dựng quan hệ cha/mẹ bằng khóa ngoại `father_id` và `mother_id`.
* Thêm index cho các trường thường xuyên được tìm kiếm.
* Xây dựng trigger tự động cập nhật `updated_at`.

## 3. Phần Quản lý thành viên

* Xây dựng API lấy danh sách thành viên.
* Xây dựng chức năng thêm thành viên.
* Xây dựng chức năng cập nhật thông tin thành viên.
* Xây dựng chức năng xóa thành viên.
* Hiển thị thông tin cha và mẹ của từng thành viên.
* Hỗ trợ lưu ngày sinh, ngày mất, giới tính, địa chỉ, số điện thoại, email, tiểu sử và ghi chú.
* Hỗ trợ hình ảnh đại diện cho thành viên.

## 4. Phần Cây gia phả

* Xây dựng API `/api/family_tree`.
* Truy vấn quan hệ giữa các thành viên bằng PostgreSQL.
* Chuyển dữ liệu thành node và link để frontend xử lý.
* Tích hợp GoJS để trực quan hóa cây gia phả.
* Phân loại thành viên theo thế hệ.
* Xây dựng chức năng lọc theo thế hệ.
* Xây dựng chức năng tìm kiếm thành viên.
* Hiển thị ngày sinh và ngày mất theo định dạng dễ đọc.

## 5. Phần Giao diện người dùng

* Xây dựng giao diện bằng HTML, CSS và JavaScript.
* Sử dụng Tailwind CSS để thiết kế giao diện.
* Xây dựng trang đăng nhập.
* Xây dựng trang đăng ký.
* Xây dựng trang chính hiển thị cây gia phả.
* Xây dựng giao diện quản lý thành viên.
* Xây dựng menu điều hướng dựa trên vai trò người dùng.
* Ẩn các chức năng quản trị đối với tài khoản Member.

## 6. Phần API và Backend

* Xây dựng RESTful API bằng Express.js.
* Kết nối Node.js với PostgreSQL thông qua thư viện `pg`.
* Xử lý request/response bằng JSON.
* Thiết lập CORS.
* Xây dựng middleware xác thực JWT.
* Xử lý lỗi API và trả về HTTP status phù hợp.
* Sử dụng biến môi trường để quản lý cấu hình hệ thống.

## 7. Cập nhật và sửa lỗi hệ thống

* Khắc phục lỗi kết nối PostgreSQL.
* Khắc phục lỗi thiếu thư viện `dotenv`.
* Kiểm tra và xử lý lỗi API đăng ký tài khoản.
* Kiểm tra lỗi xác thực JWT.
* Điều chỉnh API lấy dữ liệu thành viên.
* Sửa lỗi truy vấn dữ liệu không tương thích với schema PostgreSQL.
* Kiểm tra đồng bộ dữ liệu giữa database, backend và frontend.
* Cải thiện khả năng tìm kiếm và lọc thành viên.
* Kiểm tra quyền truy cập đối với các API yêu cầu xác thực.

---

# 📌 Kiến trúc hệ thống

Hệ thống được tổ chức theo mô hình:

```text
                    FRONTEND
                       │
              HTML / CSS / JS
                       │
                 REST API
                       │
                       ▼
                EXPRESS.JS
                       │
          ┌────────────┴────────────┐
          │                         │
   Authentication              Business Logic
      JWT/bcrypt                     │
          │                          │
          └────────────┬─────────────┘
                       │
                       ▼
                  PostgreSQL
                       │
          ┌────────────┼────────────┐
          │            │            │
        roles       accounts      members
                                    │
                              father_id
                              mother_id
```

Hệ thống được chia thành ba lớp chính:

1. **Frontend:** Hiển thị giao diện và tương tác với người dùng.
2. **Backend:** Xử lý nghiệp vụ, Authentication, Authorization và REST API.
3. **Database:** Lưu trữ tài khoản, vai trò và thông tin thành viên gia phả.
