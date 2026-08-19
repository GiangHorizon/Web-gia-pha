# Web Gia Phả

Ứng dụng web quản lý cây gia phả (family tree) — Node.js/Express + PostgreSQL,
frontend HTML/CSS/JS thuần (không framework, không build step).

## Tính năng

- Đăng ký / Đăng nhập (JWT lưu trong cookie `httpOnly`, không lưu ở
  `localStorage` phía client).
- Phân quyền 2 vai trò:
  - **Admin**: xem, thêm, sửa, xóa thành viên; xem Thống kê; sao lưu dữ liệu.
  - **Member**: chỉ xem danh sách/chi tiết thành viên và cây gia phả.
- Xem cây gia phả dạng lưới (render bằng HTML/CSS thuần, không dùng thư viện
  vẽ đồ thị ngoài).
- Danh sách thành viên: tìm kiếm, lọc theo giới tính.
- Trang chi tiết thành viên: cha/mẹ, vợ/chồng (bảng `marriages`), con cái.
- Hồ sơ cá nhân, Cài đặt tài khoản, đổi mật khẩu.
- Trang Thống kê (chỉ Admin): tổng số thành viên, theo giới tính, theo thế hệ.

## Yêu cầu

- Node.js 18+ (khuyến nghị 20+, hỗ trợ `node --test`)
- PostgreSQL 13+

## Cài đặt

```bash
git clone https://github.com/GiangHorizon/Web-gia-pha.git
cd Web-gia-pha
npm install
```

### Cấu hình biến môi trường

Sao chép `.env.example` thành `.env` và điền giá trị thật:

```bash
cp .env.example .env
```

**Không commit file `.env` thật lên Git** — file này chứa mật khẩu database và
`JWT_SECRET`. `.gitignore` đã được cấu hình để chặn việc này.

#### Dùng database cloud (Neon, Supabase, Render, Railway...)

Thay vì cài PostgreSQL local, bạn có thể trỏ thẳng tới database cloud: lấy
connection string nhà cung cấp đưa cho bạn (dạng
`postgresql://user:password@host:5432/dbname`) rồi điền vào `.env`:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_SSL=true
```

Hầu hết database cloud bắt buộc kết nối qua SSL — nhớ đặt `DB_SSL=true`,
nếu không sẽ bị lỗi kết nối.

### Khởi tạo database

```bash
psql -U <user> -d <database> -f database/schema.sql
```

Nếu dùng database cloud, chạy bằng connection string thay vì `-U`/`-d`:

```bash
psql "postgresql://user:password@host:5432/dbname" -f database/schema.sql
```

Script này tạo bảng `roles`, `members`, `accounts`, `marriages`, seed sẵn 2
role (`Admin`, `Member`) và vài thành viên mẫu. Xem comment cuối file
`database/schema.sql` để biết cách tạo tài khoản Admin đầu tiên (đăng ký qua
web rồi nâng quyền bằng `UPDATE`).

### Chạy server

```bash
npm start
```

Mặc định chạy ở `http://localhost:3000`.

## Test

```bash
npm test
```

Bộ test hiện có kiểm tra các hàm thuần túy không phụ thuộc database
(`escapeHtml`, `parseCookies`). Đây là bước khởi đầu — dự án hiện **chưa có**
test tích hợp cho các route API (cần một database test riêng để chạy an
toàn, không ảnh hưởng dữ liệu thật).

## Cấu trúc thư mục

```
server.js              Toàn bộ route API (khuyến nghị tách nhỏ khi mở rộng thêm)
db.js                   Kết nối PostgreSQL (pg Pool)
middlewares/            verifyToken, isAdmin, isMember
database/schema.sql     Schema + dữ liệu mẫu
public/                 Frontend (mỗi tính năng 1 thư mục con: list, mainpage,
                         profile, settings, statistics, documents, login,
                         register)
public/http.js          Wrapper fetch() dùng chung (gửi cookie, tự xử lý 401)
public/api.js           Đăng nhập/đăng ký/đăng xuất + render cây gia phả
public/role-guard.js    Ẩn menu chỉ dành cho Admin, dùng chung mọi trang
public/escape-html.js   Escape HTML chống XSS, dùng chung mọi trang
test/                   Unit test (node:test, không cần cài thêm gói)
```

## Bảo mật — lưu ý khi triển khai thật

- Đặt `NODE_ENV=production` khi deploy qua HTTPS để cookie JWT bắt buộc
  `secure` (chỉ gửi qua HTTPS).
- Đặt `ALLOWED_ORIGINS` đúng domain thật thay vì để mặc định localhost.
- `JWT_SECRET` và `DB_PASSWORD` trong repo này **đã từng bị commit vào Git
  ở lịch sử cũ** — nếu bạn dùng lại repo này, hãy đổi cả hai giá trị trước
  khi deploy, kể cả sau khi đã dọn `.gitignore`.

## Việc còn tồn đọng (chưa xử lý)

- Tailwind được nạp qua CDN (`cdn.tailwindcss.com`) — dùng tốt để phát triển
  nhưng không khuyến nghị cho production (chậm hơn, không tối ưu được CSS
  không dùng tới). Nên chuyển sang Tailwind CLI/PostCSS build khi deploy thật.
- Sidebar/menu tài khoản còn lặp lại thủ công giữa nhiều trang HTML thay vì
  1 partial dùng chung — dễ bị lệch nếu sửa 1 trang mà quên trang khác.
- Chưa có test tích hợp cho các route API.
