-- ==========================================
-- SCHEMA CHO WEB GIA PHẢ
-- Khớp với các câu truy vấn trong server.js hiện tại
-- Chạy: psql -U <user> -d <database> -f database/schema.sql
-- ==========================================

BEGIN;

-- ------------------------------------------
-- BẢNG roles
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    role_name   VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (id, role_name)
VALUES
    (1, 'Admin'),
    (2, 'Member')
ON CONFLICT (id) DO NOTHING;

-- Đảm bảo sequence không bị lệch sau khi insert id cố định
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));


-- ------------------------------------------
-- BẢNG members (thành viên trong cây gia phả)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS members (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    gender       VARCHAR(10),                  -- 'Male' / 'Female'
    father_id    INTEGER REFERENCES members(id) ON DELETE SET NULL,
    mother_id    INTEGER REFERENCES members(id) ON DELETE SET NULL,
    date_birth   DATE,
    date_death   DATE,
    birth_order  INTEGER,
    gmail        VARCHAR(100),
    phone        VARCHAR(20),
    address      VARCHAR(255),
    biography    TEXT,
    note         TEXT,                         -- ghi chú (đang được frontend dùng)
    avatar_url   VARCHAR(255),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_father_id ON members(father_id);
CREATE INDEX IF NOT EXISTS idx_members_mother_id ON members(mother_id);
CREATE INDEX IF NOT EXISTS idx_members_name       ON members(name);


-- ------------------------------------------
-- BẢNG accounts (tài khoản đăng nhập)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
    id           SERIAL PRIMARY KEY,
    username     VARCHAR(50)  NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,        -- lưu bcrypt hash, không lưu plain text
    name         VARCHAR(100),
    email        VARCHAR(150) UNIQUE,
    role_id      INTEGER NOT NULL REFERENCES roles(id) DEFAULT 2,   -- mặc định Member
    member_id    INTEGER REFERENCES members(id) ON DELETE SET NULL, -- liên kết tới hồ sơ trong cây gia phả
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accounts_username  ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_email      ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_member_id  ON accounts(member_id);


-- ------------------------------------------
-- BẢNG marriages (hôn nhân) — thay cho việc suy đoán vợ/chồng qua con chung,
-- vốn không thể biểu diễn được cặp vợ chồng chưa có con.
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS marriages (
    id          SERIAL PRIMARY KEY,
    spouse1_id  INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    spouse2_id  INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    married_on  DATE,
    ended_on    DATE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (spouse1_id <> spouse2_id)
);

CREATE INDEX IF NOT EXISTS idx_marriages_spouse1 ON marriages(spouse1_id);
CREATE INDEX IF NOT EXISTS idx_marriages_spouse2 ON marriages(spouse2_id);


-- ------------------------------------------
-- TRIGGER: tự động cập nhật updated_at khi UPDATE
-- ------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_members_updated_at ON members;
CREATE TRIGGER trg_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- ------------------------------------------
-- DỮ LIỆU MẪU CHO members (tùy chọn — bỏ qua nếu không cần)
-- ------------------------------------------
INSERT INTO members (id, name, gender, father_id, mother_id, date_birth, date_death, birth_order)
VALUES
    (1,  'Nguyễn Văn A',   'Male',   NULL, NULL, '1930-01-01', '2010-01-01', NULL),
    (2,  'Trần Thị B',     'Female', NULL, NULL, '1935-01-01', '2012-01-01', NULL),
    (3,  'Nguyễn Văn C',   'Male',   1,    2,    '1958-01-01', NULL,         1),
    (4,  'Nguyễn Thị D',   'Female', 1,    2,    '1960-01-01', NULL,         2),
    (5,  'Nguyễn Văn E',   'Male',   1,    2,    '1962-01-01', NULL,         3),
    (6,  'Nguyễn Thị F',   'Female', 1,    2,    '1965-01-01', NULL,         4),
    (10, 'Lê Thị K',       'Female', NULL, NULL, '1960-01-01', NULL,         NULL), -- vợ của (3)
    (11, 'Trần Văn M',     'Male',   NULL, NULL, '1958-01-01', NULL,         NULL), -- chồng của (4)
    (7,  'Nguyễn Văn G',   'Male',   3,    10,   '1985-01-01', NULL,         1),
    (8,  'Nguyễn Thị H',   'Female', 3,    10,   '1987-01-01', NULL,         2),
    (9,  'Nguyễn Văn I',   'Male',   11,   4,    '1990-01-01', NULL,         1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('members_id_seq', (SELECT MAX(id) FROM members));


-- ------------------------------------------
-- DỮ LIỆU MẪU CHO marriages
-- ------------------------------------------
INSERT INTO marriages (spouse1_id, spouse2_id, married_on)
SELECT 1, 2, '1955-04-10'
WHERE NOT EXISTS (
    SELECT 1 FROM marriages WHERE (spouse1_id, spouse2_id) IN ((1,2),(2,1))
);

INSERT INTO marriages (spouse1_id, spouse2_id, married_on)
SELECT 3, 10, '1983-06-20'
WHERE NOT EXISTS (
    SELECT 1 FROM marriages WHERE (spouse1_id, spouse2_id) IN ((3,10),(10,3))
);

INSERT INTO marriages (spouse1_id, spouse2_id, married_on)
SELECT 4, 11, '1985-11-02'
WHERE NOT EXISTS (
    SELECT 1 FROM marriages WHERE (spouse1_id, spouse2_id) IN ((4,11),(11,4))
);


-- ------------------------------------------
-- TÀI KHOẢN MẪU — sẵn sàng đăng nhập ngay, không cần đăng ký thủ công
-- Mật khẩu đã được băm sẵn bằng bcrypt (10 rounds), khớp đúng server.js
-- ------------------------------------------
INSERT INTO accounts (username, password, name, email, role_id, member_id)
VALUES
    (
        'admin',
        '$2b$10$lQycSb6N41RZBlfmmiyzzOYhzR9//TIZ8/8CEXooaPfzGlZ/NUAiq', -- mật khẩu: Admin@123
        'Quản trị viên',
        'admin@example.com',
        1, -- Admin
        1  -- liên kết với thành viên Nguyễn Văn A
    ),
    (
        'member',
        '$2b$10$XcP18zvMhjV/JH1LM4viuOENKMFjxCc6Y1tCp5X3VtoogaeUL9Euy', -- mật khẩu: Member@123
        'Thành viên demo',
        'member@example.com',
        2, -- Member
        7  -- liên kết với thành viên Nguyễn Văn G
    )
ON CONFLICT (username) DO NOTHING;

COMMIT;

-- ==========================================
-- ĐĂNG NHẬP THỬ NGAY VỚI 2 TÀI KHOẢN MẪU:
--
--   Admin  →  username: admin   |  mật khẩu: Admin@123
--   Member →  username: member  |  mật khẩu: Member@123
--
-- ĐỔI MẬT KHẨU CÁC TÀI KHOẢN NÀY (hoặc xóa hẳn) TRƯỚC KHI DÙNG THẬT —
-- đây chỉ là tài khoản demo, mật khẩu đã công khai trong file này.
--
-- Muốn tạo thêm tài khoản Admin khác từ tài khoản tự đăng ký:
-- 1. Đăng ký qua web (mặc định sẽ là Member).
-- 2. Chạy: UPDATE accounts SET role_id = 1 WHERE username = 'username_cua_ban';
-- ==========================================
