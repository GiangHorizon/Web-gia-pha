require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

const pool = require("./db");

const verifyToken = require("./middlewares/auth");
const { isAdmin, isMember } = require("./middlewares/role");

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================

// Danh sách domain được phép gọi API (đặt trong .env, phân cách bởi dấu phẩy)
// Ví dụ: ALLOWED_ORIGINS=http://localhost:3000,https://giapha.example.com
const allowedOrigins = (process.env.ALLOWED_ORIGINS || `http://localhost:${PORT}`)
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Cho phép request không có origin (Postman, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Không được phép bởi CORS."));
    },
    credentials: true // Cho phép trình duyệt gửi/nhận cookie httpOnly kèm request
}));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// REGISTER
// ==========================================

app.post("/register", async (req, res) => {

    try {

        const {
            name,
            email,
            username,
            password
        } = req.body;

        if (
            !name ||
            !email ||
            !username ||
            !password
        ) {

            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập đầy đủ thông tin."
            });

        }

        // Validate định dạng và độ dài (SEC-8: presence-only là chưa đủ)
        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (name.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Họ tên tối đa 100 ký tự."
            });
        }

        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Tên đăng nhập phải từ 3 đến 50 ký tự."
            });
        }

        if (!EMAIL_REGEX.test(email) || email.length > 150) {
            return res.status(400).json({
                success: false,
                message: "Email không đúng định dạng."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu phải có ít nhất 8 ký tự."
            });
        }

        const checkUser = await pool.query(
            `
            SELECT *
            FROM accounts
            WHERE username = $1
               OR email = $2
            `,
            [username, email]
        );

        if (checkUser.rows.length > 0) {

            return res.status(400).json({
                success: false,
                message: "Username hoặc Email đã tồn tại."
            });

        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const result = await pool.query(
            `
            INSERT INTO accounts
            (
                username,
                password,
                name,
                email,
                role_id,
                is_active
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                2,
                TRUE
            )
            RETURNING
            id,
            username,
            name,
            email
            `,
            [
                username,
                hashedPassword,
                name,
                email
            ]
        );

        res.status(201).json({

            success: true,

            message: "Đăng ký thành công.",

            user: result.rows[0]

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Lỗi Server"

        });

    }

});

// ==========================================
// LOGIN
// ==========================================

// ==========================================
// CHỐNG BRUTE-FORCE ĐĂNG NHẬP (rate limit đơn giản trong bộ nhớ)
// ==========================================

const loginAttempts = new Map(); // key: username|ip -> { count, firstAt }
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 phút

function isLoginRateLimited(key) {
    const rec = loginAttempts.get(key);
    if (!rec) return false;

    if (Date.now() - rec.firstAt > LOGIN_WINDOW_MS) {
        loginAttempts.delete(key);
        return false;
    }

    return rec.count >= LOGIN_MAX_ATTEMPTS;
}

function recordLoginFailure(key) {
    const rec = loginAttempts.get(key);

    if (!rec || Date.now() - rec.firstAt > LOGIN_WINDOW_MS) {
        loginAttempts.set(key, { count: 1, firstAt: Date.now() });
    } else {
        rec.count += 1;
    }
}

function clearLoginFailures(key) {
    loginAttempts.delete(key);
}

app.post("/api/login", async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body;

        const rateLimitKey = `${username}|${req.ip}`;

        if (isLoginRateLimited(rateLimitKey)) {
            return res.status(429).json({
                success: false,
                message: "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút."
            });
        }

        const result = await pool.query(
            `
            SELECT
                a.id,
                a.username,
                a.password,
                a.name,
                a.email,
                a.member_id,
                r.role_name
            FROM accounts a
            JOIN roles r
                ON a.role_id = r.id
            WHERE a.username = $1
              AND a.is_active = TRUE
            `,
            [username]
        );

        if (result.rows.length === 0) {

            recordLoginFailure(rateLimitKey);

            return res.status(401).json({

                success: false,

                message: "Sai tài khoản hoặc mật khẩu."

            });

        }

        const user = result.rows[0];

        const match =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!match) {

            recordLoginFailure(rateLimitKey);

            return res.status(401).json({

                success: false,

                message: "Sai tài khoản hoặc mật khẩu."

            });

        }

        clearLoginFailures(rateLimitKey);

        const token = jwt.sign(

            {

                id: user.id,

                role: user.role_name,

                memberId: user.member_id

            },

            process.env.JWT_SECRET,


            {

                expiresIn: "7d"

            }

        );

        // Lưu token vào cookie httpOnly thay vì trả về trong JSON body.
        // JavaScript phía trình duyệt KHÔNG đọc được cookie httpOnly, nên nếu
        // trang web có bị dính XSS thì kẻ tấn công cũng không lấy được token.
        res.cookie("token", token, {

            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // bắt buộc HTTPS khi lên production
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 // khớp với expiresIn của JWT (7 ngày)

        });

        res.json({

            success: true,

            user: {

                id: user.id,

                username: user.username,

                name: user.name,

                email: user.email,

                role: user.role_name,

                memberId: user.member_id

            }

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Server Error"

        });

    }

});

// ==========================================
// ĐĂNG XUẤT
// ==========================================

app.post("/api/logout", (req, res) => {

    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    });

    res.json({
        success: true,
        message: "Đã đăng xuất."
    });

});

// ==========================================
// CẬP NHẬT THÀNH VIÊN
// ==========================================

app.put(
    "/api/members/:id",
    verifyToken,
    isAdmin,
    async (req, res) => {

        try {

            const { id } = req.params;

            const {

                name,
                gender,
                father_id,
                mother_id,
                date_birth,
                date_death,
                gmail,
                phone,
                address,
                biography,
                note,
                avatar_url,
                birth_order

            } = req.body;

            // Dùng COALESCE để chỉ ghi đè field nào thực sự được gửi lên,
            // tránh xóa mất dữ liệu cũ khi form chỉ gửi 1 phần thông tin
            // (ví dụ form sửa nhanh ở trang Information chỉ gửi vài field).
            await pool.query(

                `
                UPDATE members
                SET

                    name=COALESCE($1, name),
                    gender=COALESCE($2, gender),
                    father_id=COALESCE($3, father_id),
                    mother_id=COALESCE($4, mother_id),
                    date_birth=COALESCE($5, date_birth),
                    date_death=COALESCE($6, date_death),
                    gmail=COALESCE($7, gmail),
                    phone=COALESCE($8, phone),
                    address=COALESCE($9, address),
                    biography=COALESCE($10, biography),
                    note=COALESCE($11, note),
                    avatar_url=COALESCE($12, avatar_url),
                    birth_order=COALESCE($13, birth_order),
                    updated_at=CURRENT_TIMESTAMP

                WHERE id=$14
                `,

                [

                    name || null,
                    gender || null,
                    father_id || null,
                    mother_id || null,
                    date_birth || null,
                    date_death || null,
                    gmail || null,
                    phone || null,
                    address || null,
                    biography || null,
                    note || null,
                    avatar_url || null,
                    birth_order || null,
                    id

                ]

            );

            res.json({

                success: true,

                message: "Cập nhật thành công."

            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({

                success: false,

                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."

            });

        }

    }

);


// ==========================================
// XÓA THÀNH VIÊN
// ==========================================

app.delete(
    "/api/members/:id",
    verifyToken,
    isAdmin,
    async (req, res) => {

        try {

            const { id } = req.params;

            await pool.query(

                `
                DELETE FROM members
                WHERE id=$1
                `,

                [id]

            );

            res.json({

                success: true,

                message: "Đã xóa thành viên."

            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({

                success: false,

                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."

            });

        }

    }

);


// ==========================================
// DANH SÁCH THÀNH VIÊN (mọi user đã đăng nhập được xem)
// ==========================================

app.get(
    "/api/members",
    verifyToken,
    isMember,
    async (req, res) => {

        try {

            const result = await pool.query(
                `
                SELECT
                    m.id,
                    m.name,
                    m.gender,
                    m.date_birth,
                    m.date_death,
                    m.avatar_url,
                    father.name AS father_name,
                    mother.name AS mother_name,
                    r.role_name AS role
                FROM members m
                LEFT JOIN members father
                    ON father.id = m.father_id
                LEFT JOIN members mother
                    ON mother.id = m.mother_id
                LEFT JOIN accounts a
                    ON a.member_id = m.id
                LEFT JOIN roles r
                    ON r.id = a.role_id
                ORDER BY m.id
                `
            );

            res.json(result.rows);

        }

        catch (err) {

            console.error(err);

            res.status(500).json({
                success: false,
                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."
            });

        }

    }

);


// ==========================================
// CHI TIẾT MỘT THÀNH VIÊN (mọi user đã đăng nhập được xem)
// ==========================================

app.get(
    "/api/members/:id",
    verifyToken,
    isMember,
    async (req, res) => {

        try {

            const { id } = req.params;

            const result = await pool.query(
                `
                SELECT
                    m.*,
                    father.name AS father_name,
                    mother.name AS mother_name,
                    r.role_name AS role
                FROM members m
                LEFT JOIN members father
                    ON father.id = m.father_id
                LEFT JOIN members mother
                    ON mother.id = m.mother_id
                LEFT JOIN accounts a
                    ON a.member_id = m.id
                LEFT JOIN roles r
                    ON r.id = a.role_id
                WHERE m.id = $1
                `,
                [id]
            );

            if (result.rows.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy thành viên."
                });

            }

            const children = await pool.query(
                `
                SELECT id, name
                FROM members
                WHERE father_id = $1
                   OR mother_id = $1
                ORDER BY birth_order NULLS LAST, date_birth
                `,
                [id]
            );

            // Vợ/chồng: lấy trực tiếp từ bảng marriages (không suy đoán qua con chung),
            // ưu tiên cuộc hôn nhân chưa kết thúc (ended_on IS NULL), mới nhất trước.
            const spouse = await pool.query(
                `
                SELECT sp.id, sp.name, mg.married_on, mg.ended_on
                FROM marriages mg
                JOIN members sp
                    ON sp.id = CASE
                        WHEN mg.spouse1_id = $1 THEN mg.spouse2_id
                        ELSE mg.spouse1_id
                    END
                WHERE $1 IN (mg.spouse1_id, mg.spouse2_id)
                ORDER BY mg.ended_on IS NOT NULL, mg.married_on DESC NULLS LAST
                LIMIT 1
                `,
                [id]
            );

            res.json({
                ...result.rows[0],
                spouse_name: spouse.rows[0]?.name || null,
                children: children.rows
            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({
                success: false,
                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."
            });

        }

    }

);


// ==========================================
// THÊM THÀNH VIÊN (chỉ Admin)
// ==========================================

app.post(
    "/api/addmember",
    verifyToken,
    isAdmin,
    async (req, res) => {

        try {

            const {
                name,
                gender,
                father_id,
                mother_id,
                date_birth,
                date_death,
                gmail,
                phone,
                address,
                biography,
                note,
                avatar_url,
                birth_order
            } = req.body;

            if (!name || !gender) {

                return res.status(400).json({
                    success: false,
                    message: "Vui lòng nhập Họ tên và Giới tính."
                });

            }

            if (name.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Họ tên tối đa 100 ký tự."
                });
            }

            if (!["Male", "Female"].includes(gender)) {
                return res.status(400).json({
                    success: false,
                    message: "Giới tính không hợp lệ."
                });
            }

            const result = await pool.query(
                `
                INSERT INTO members
                (
                    name,
                    gender,
                    father_id,
                    mother_id,
                    date_birth,
                    date_death,
                    gmail,
                    phone,
                    address,
                    biography,
                    note,
                    avatar_url,
                    birth_order
                )
                VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
                `,
                [
                    name,
                    gender,
                    father_id || null,
                    mother_id || null,
                    date_birth || null,
                    date_death || null,
                    gmail || null,
                    phone || null,
                    address || null,
                    biography || null,
                    note || null,
                    avatar_url || null,
                    birth_order || null
                ]
            );

            res.status(201).json({
                success: true,
                message: "Thêm thành viên thành công.",
                member: result.rows[0]
            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({
                success: false,
                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."
            });

        }

    }

);


// ==========================================
// SEARCH MEMBER
// ==========================================

app.get(
    "/api/addmember/search",
    verifyToken,
    async (req, res) => {

        try {

            const keyword = (req.query.q || "").trim();

            if (!keyword) {

                return res.json([]);

            }

            const result = await pool.query(

                `
                SELECT

                    id,
                    name,
                    gender,
                    date_birth

                FROM members

                WHERE

                    name ILIKE $1

                ORDER BY

                    name ASC

                LIMIT 10
                `,

                [`%${keyword}%`]

            );

            res.json(result.rows);

        }

        catch (err) {

            console.error(err);

            res.status(500).json({

                success: false,

                message: "Lỗi tìm kiếm."

            });

        }

    }

);
// ==========================================
// FAMILY TREE API
// ==========================================

app.get(
    "/api/family_tree",
    verifyToken,
    isMember,
    async (req, res) => {

        try {

            const generation = req.query.generation || "all";

            let sql = `

                WITH RECURSIVE family_tree AS (

                    SELECT

                        id,
                        name,
                        father_id,
                        mother_id,
                        gender,
                        date_birth,
                        date_death,
                        1 AS generation

                    FROM members

                    WHERE father_id IS NULL
                      AND mother_id IS NULL

                    UNION ALL

                    SELECT

                        m.id,
                        m.name,
                        m.father_id,
                        m.mother_id,
                        m.gender,
                        m.date_birth,
                        m.date_death,
                        ft.generation + 1

                    FROM members m

                    INNER JOIN family_tree ft

                    ON

                        m.father_id = ft.id

                        OR

                        m.mother_id = ft.id

                )

                SELECT *

                FROM family_tree

            `;

            const params = [];

            if (generation !== "all") {

                sql += " WHERE generation <= $1";

                params.push(Number(generation));

            }

            sql += `
                ORDER BY
                generation,
                date_birth,
                id
            `;

            const result = await pool.query(sql, params);

            const members = result.rows;

            const nodeDataArray = [];

            const linkDataArray = [];

            const marriageSet = new Set();

            members.forEach(member => {

                nodeDataArray.push({

                    key: String(member.id),

                    name: member.name,

                    gender: member.gender,

                    birth: member.date_birth,

                    death: member.date_death,

                    generation: member.generation,

                    category: "MEMBER"

                });

            });

            members.forEach(member => {

                if (
                    member.father_id &&
                    member.mother_id
                ) {

                    const marriageKey =
                        `marriage_${member.father_id}_${member.mother_id}`;

                    if (!marriageSet.has(marriageKey)) {

                        marriageSet.add(marriageKey);

                        nodeDataArray.push({

                            key: marriageKey,

                            category: "MARRIAGE"

                        });

                        linkDataArray.push({

                            from: String(member.father_id),

                            to: String(member.mother_id),

                            category: "SPOUSE"

                        });

                        linkDataArray.push({

                            from: String(member.father_id),

                            to: marriageKey,

                            category: "CHILD"

                        });

                    }

                    linkDataArray.push({

                        from: marriageKey,

                        to: String(member.id),

                        category: "CHILD"

                    });

                }

                else {

                    if (member.father_id) {

                        linkDataArray.push({

                            from: String(member.father_id),

                            to: String(member.id),

                            category: "CHILD"

                        });

                    }

                    if (member.mother_id) {

                        linkDataArray.push({

                            from: String(member.mother_id),

                            to: String(member.id),

                            category: "CHILD"

                        });

                    }

                }

            });

            res.json({

                success: true,

                nodeDataArray,

                linkDataArray

            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({

                success: false,

                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."

            });

        }

    }

);
// ==========================================
// PROFILE APIs
// ==========================================

// Lấy thông tin hồ sơ của người đang đăng nhập
app.get(
    "/api/user/profile",
    verifyToken,
    async (req, res) => {

        try {

            const memberId = req.user.memberId;

            if (!memberId) {

                return res.status(404).json({

                    success: false,

                    message: "Tài khoản chưa liên kết thành viên."

                });

            }

            const result = await pool.query(

                `
                SELECT

                    m.id,
                    m.name,
                    m.gender,
                    m.date_birth,
                    m.date_death,
                    m.gmail,
                    m.phone,
                    m.address,
                    m.avatar_url,
                    m.biography,

                    father.name AS father_name,
                    mother.name AS mother_name

                FROM members m

                LEFT JOIN members father
                    ON father.id = m.father_id

                LEFT JOIN members mother
                    ON mother.id = m.mother_id

                WHERE m.id = $1
                `,

                [memberId]

            );

            if (result.rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Không tìm thấy thành viên."

                });

            }

            res.json({

                success: true,

                profile: result.rows[0]

            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({

                success: false,

                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."

            });

        }

    }

);


// ==========================================
// CẬP NHẬT HỒ SƠ
// ==========================================

app.put(
    "/api/user/profile",
    verifyToken,
    async (req, res) => {

        try {

            const memberId = req.user.memberId;

            const {

                name,
                gender,
                date_birth,
                date_death,
                gmail,
                phone,
                address,
                biography,
                avatar_url

            } = req.body;

            await pool.query(

                `
                UPDATE members

                SET

                    name = $1,

                    gender = $2,

                    date_birth = $3,

                    date_death = $4,

                    gmail = $5,

                    phone = $6,

                    address = $7,

                    biography = $8,

                    avatar_url = $9,

                    updated_at = CURRENT_TIMESTAMP

                WHERE id = $10
                `,

                [

                    name,

                    gender,

                    date_birth || null,

                    date_death || null,

                    gmail || null,

                    phone || null,

                    address || null,

                    biography || null,

                    avatar_url || null,

                    memberId

                ]

            );

            res.json({

                success: true,

                message: "Cập nhật hồ sơ thành công."

            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({

                success: false,

                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."

            });

        }

    }

);


// ==========================================
// LẤY THÔNG TIN ACCOUNT
// ==========================================

app.get(
    "/api/user/account",
    verifyToken,
    async (req, res) => {

        try {

            const result = await pool.query(

                `
                SELECT

                    id,

                    username,

                    name,

                    email,

                    role_id,

                    member_id,

                    is_active,

                    created_at

                FROM accounts

                WHERE id = $1
                `,

                [req.user.id]

            );

            if (result.rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Không tìm thấy tài khoản."

                });

            }

            res.json({

                success: true,

                account: result.rows[0]

            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({

                success: false,

                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."

            });

        }

    }

);// ==========================================
// 3C. SETTINGS + BACKUP + PROFILE APIs
// ==========================================

// Lấy thông tin tài khoản
app.get("/api/settings/account/:id", verifyToken, async (req, res) => {
    try {

        const { id } = req.params;

        // Chỉ chính chủ tài khoản hoặc Admin mới được xem
        if (
            String(req.user.id) !== String(id) &&
            req.user.role !== "Admin"
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền xem tài khoản này."
            });
        }

        const result = await pool.query(
            `SELECT id, name, email, username, member_id
             FROM accounts
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy tài khoản"
            });
        }

        res.json(result.rows[0]);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Server Error"
        });

    }
});

// Cập nhật thông tin tài khoản
app.put("/api/settings/account/:id", verifyToken, async (req, res) => {

    try {

        const { id } = req.params;

        // Chỉ chính chủ tài khoản hoặc Admin mới được sửa
        if (
            String(req.user.id) !== String(id) &&
            req.user.role !== "Admin"
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền sửa tài khoản này."
            });
        }

        const { name, email, member_id } = req.body;

        await pool.query(
            `UPDATE accounts
             SET
                name=$1,
                email=$2,
                member_id=$3,
                updated_at=NOW()
             WHERE id=$4`,
            [
                name,
                email,
                member_id || null,
                id
            ]
        );

        res.json({
            message: "Cập nhật thành công"
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Server Error"
        });

    }

});

// Đổi mật khẩu
app.put("/api/settings/password/:id", verifyToken, async (req, res) => {

    try {

        const { id } = req.params;

        // Chỉ chính chủ tài khoản mới được đổi mật khẩu của mình
        // (kể cả Admin cũng không được đổi mật khẩu người khác qua API này)
        if (String(req.user.id) !== String(id)) {
            return res.status(403).json({
                message: "Bạn không có quyền đổi mật khẩu tài khoản này."
            });
        }

        const { oldPassword, newPassword } = req.body;

        const user = await pool.query(
            "SELECT password FROM accounts WHERE id=$1",
            [id]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy tài khoản"
            });
        }

        const check = await bcrypt.compare(
            oldPassword,
            user.rows[0].password
        );

        if (!check) {

            return res.status(400).json({
                message: "Sai mật khẩu cũ"
            });

        }

        const hash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `UPDATE accounts
             SET password=$1,
                 updated_at=NOW()
             WHERE id=$2`,
            [hash, id]
        );

        res.json({
            message: "Đổi mật khẩu thành công"
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Server Error"
        });

    }

});

// Backup (Admin)
app.get(
    "/api/admin/backup",
    verifyToken,
    isAdmin,
    async (req, res) => {

        try {

            const members = await pool.query(
                "SELECT * FROM members ORDER BY id"
            );

            const accounts = await pool.query(
                `SELECT
                    id,
                    username,
                    name,
                    email,
                    role_id,
                    member_id
                 FROM accounts`
            );

            res.json({

                version: "1.0",

                createdAt: new Date(),

                members: members.rows,

                accounts: accounts.rows

            });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message: "Backup failed"
            });

        }

    }
);

// ==========================================
// QUAN HỆ HÔN NHÂN (Relationships / marriages)
// ==========================================

// Danh sách tất cả các cặp vợ/chồng — mọi người đã đăng nhập đều xem được
app.get(
    "/api/relationships",
    verifyToken,
    isMember,
    async (req, res) => {

        try {

            const result = await pool.query(
                `
                SELECT
                    mg.id,
                    mg.married_on,
                    mg.ended_on,
                    s1.id AS spouse1_id,
                    s1.name AS spouse1_name,
                    s2.id AS spouse2_id,
                    s2.name AS spouse2_name
                FROM marriages mg
                JOIN members s1 ON s1.id = mg.spouse1_id
                JOIN members s2 ON s2.id = mg.spouse2_id
                ORDER BY mg.married_on DESC NULLS LAST, mg.id DESC
                `
            );

            res.json(result.rows);

        }

        catch (err) {

            console.error(err);

            res.status(500).json({
                success: false,
                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."
            });

        }

    }

);

// Thêm 1 cặp vợ/chồng mới — chỉ Admin
app.post(
    "/api/relationships",
    verifyToken,
    isAdmin,
    async (req, res) => {

        try {

            const { spouse1_id, spouse2_id, married_on } = req.body;

            if (!spouse1_id || !spouse2_id) {
                return res.status(400).json({
                    success: false,
                    message: "Vui lòng chọn đủ 2 thành viên."
                });
            }

            if (String(spouse1_id) === String(spouse2_id)) {
                return res.status(400).json({
                    success: false,
                    message: "Không thể chọn cùng 1 người cho cả 2 vai trò."
                });
            }

            // Kiểm tra cả 2 id đều là thành viên có thật
            const membersCheck = await pool.query(
                `SELECT id FROM members WHERE id IN ($1, $2)`,
                [spouse1_id, spouse2_id]
            );

            if (membersCheck.rows.length !== 2) {
                return res.status(400).json({
                    success: false,
                    message: "Thành viên được chọn không tồn tại."
                });
            }

            // Tránh tạo trùng (cả 2 chiều spouse1/spouse2)
            const dup = await pool.query(
                `
                SELECT id FROM marriages
                WHERE (spouse1_id = $1 AND spouse2_id = $2)
                   OR (spouse1_id = $2 AND spouse2_id = $1)
                `,
                [spouse1_id, spouse2_id]
            );

            if (dup.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Cặp vợ chồng này đã tồn tại trong hệ thống."
                });
            }

            const result = await pool.query(
                `
                INSERT INTO marriages (spouse1_id, spouse2_id, married_on)
                VALUES ($1, $2, $3)
                RETURNING *
                `,
                [spouse1_id, spouse2_id, married_on || null]
            );

            res.status(201).json({
                success: true,
                message: "Đã thêm quan hệ hôn nhân.",
                marriage: result.rows[0]
            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({
                success: false,
                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."
            });

        }

    }

);

// Cập nhật (ví dụ đánh dấu ngày kết thúc hôn nhân) — chỉ Admin
app.put(
    "/api/relationships/:id",
    verifyToken,
    isAdmin,
    async (req, res) => {

        try {

            const { id } = req.params;
            const { married_on, ended_on } = req.body;

            const result = await pool.query(
                `
                UPDATE marriages
                SET
                    married_on = COALESCE($1, married_on),
                    ended_on = $2
                WHERE id = $3
                RETURNING *
                `,
                [married_on || null, ended_on || null, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy quan hệ này."
                });
            }

            res.json({
                success: true,
                message: "Đã cập nhật.",
                marriage: result.rows[0]
            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({
                success: false,
                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."
            });

        }

    }

);

// Xóa 1 quan hệ hôn nhân — chỉ Admin
app.delete(
    "/api/relationships/:id",
    verifyToken,
    isAdmin,
    async (req, res) => {

        try {

            const { id } = req.params;

            const result = await pool.query(
                `DELETE FROM marriages WHERE id = $1 RETURNING id`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy quan hệ này."
                });
            }

            res.json({
                success: true,
                message: "Đã xóa quan hệ hôn nhân."
            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({
                success: false,
                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."
            });

        }

    }

);

// ==========================================
// THỐNG KÊ (Statistics)
// ==========================================

app.get(
    "/api/statistics",
    verifyToken,
    isAdmin,
    async (req, res) => {

        try {

            const totalResult = await pool.query(
                "SELECT COUNT(*)::int AS total FROM members"
            );

            const genderResult = await pool.query(
                `
                SELECT
                    COALESCE(SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END), 0)::int AS male,
                    COALESCE(SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END), 0)::int AS female
                FROM members
                `
            );

            const generationResult = await pool.query(
                `
                WITH RECURSIVE family_tree AS (
                    SELECT id, 1 AS generation
                    FROM members
                    WHERE father_id IS NULL
                      AND mother_id IS NULL

                    UNION ALL

                    SELECT m.id, ft.generation + 1
                    FROM members m
                    INNER JOIN family_tree ft
                        ON m.father_id = ft.id
                        OR m.mother_id = ft.id
                )
                SELECT
                    generation,
                    COUNT(*)::int AS count
                FROM family_tree
                GROUP BY generation
                ORDER BY generation
                `
            );

            const maxGeneration = generationResult.rows.length
                ? Math.max(...generationResult.rows.map(r => r.generation))
                : 0;

            res.json({
                success: true,
                total: totalResult.rows[0].total,
                male: genderResult.rows[0].male,
                female: genderResult.rows[0].female,
                maxGeneration,
                generationData: generationResult.rows.map(r => ({
                    label: `Thế hệ ${r.generation}`,
                    count: r.count
                }))
            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({
                success: false,
                message: "Đã có lỗi xảy ra. Vui lòng thử lại sau."
            });

        }

    }

);

// ==========================================
// 4. STATIC FILES + VIEW ROUTES + START SERVER
// ==========================================

// Thư mục public
app.use(express.static(path.join(__dirname, "public")));

// Trang chủ
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "login", "login.html")
    );
});

// Main page
app.get("/main", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "mainpage", "mainpage.html")
    );
});

// Redirect
app.get("/mainpage", (req, res) => {
    res.redirect("/main");
});

// Health Check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Family Tree API Running",
        time: new Date()
    });
});

// Global Error Handler
app.use((err, req, res, next) => {

    console.error(err.stack);

    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });

});
// 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API Not Found"
    });
});
// START SERVER
app.listen(PORT, () => {

    console.log("====================================");
    console.log(`Server running at http://localhost:${PORT}`);
    console.log("====================================");

});