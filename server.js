require("dotenv").config();
const express = require("express");
const cors = require("cors"); // Cross-Origin Resource Sharing: cho phép frontend gọi backend dù khác port
const pool = require("./db");
const bcrypt = require("bcrypt"); // Sử dụng để mã hóa password trước khi lưu vào database
const path = require("path");

const app = express();
const PORT = 3000;

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(cors()); // Sử dụng Middleware cors để cho phép frontend gọi backend
app.use(express.json());

// ==========================================
// AUTHENTICATION APIs (ĐĂNG KÝ / ĐĂNG NHẬP)
// ==========================================
app.post("/register", async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: "Please fill in all fields" });
    }

    const checkUser = await pool.query(
      "SELECT * FROM accounts WHERE username = $1 OR email = $2",
      [username, email],
    );

    if (checkUser.rows.length > 0) {
      const existingAccount = checkUser.rows[0];
      if (existingAccount.username === username) {
        return res.status(400).json({ error: "This username already exists" });
      }
      if (existingAccount.email === email) {
        return res
          .status(400)
          .json({ error: "This email is already registered" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO accounts(name, email, username, password) VALUES($1, $2, $3, $4) RETURNING id, name, email, username",
      [name, email, username, hashedPassword],
    );

    res.status(201).json({
      message: "Register successful!",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Error register: ", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM accounts WHERE username = $1 OR email = $2",
      [username, username],
    );

    if (result.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "Username or password is incorrect" });
    }

    const account = result.rows[0];

    const kt = await bcrypt.compare(password, account.password);

    if (!kt) {
      return res
        .status(400)
        .json({ message: "Username or password is incorrect" });
    }

    res.json({
      message: "Login successful!",
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        username: account.username,
      },
    });
  } catch (err) {
    console.error("Error login: ", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MEMBER MANAGEMENT APIs (QUẢN LÝ THÀNH VIÊN)
// ==========================================

// Lấy danh sách thành viên đầy đủ cho phần hiển thị list 
app.get("/api/members", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id, 
        m.name, 
        CASE 
          WHEN m.male = 1 THEN 'Male'
          WHEN m.female = 1 THEN 'Female'
          ELSE 'Unknown'
        END AS gender, 
        m.date_birth, 
        m.date_death,
        
        -- XÁC ĐỊNH VAI TRÒ (ROLE) TRÊN TRANG WEB
        -- Nếu ID tài khoản là 1 (hoặc admin mặc định) thì hiển thị Admin, có tài khoản thì hiển thị Member, còn lại là Guest (Khách/Chưa tạo tài khoản)
        CASE 
          WHEN a.id = 1 THEN 'Admin'                       -- Tài khoản đầu tiên làm Admin
          WHEN a.id IS NOT NULL THEN 'Member'             -- Có tài khoản đăng nhập
          ELSE 'Guest'                                    -- Thành viên gia phả thuần túy, chưa có tài khoản
        END AS role,
        
        m.avatar_url,
        (SELECT name FROM members WHERE id = m.father_id) AS father_name,
        (SELECT name FROM members WHERE id = m.mother_id) AS mother_name
      FROM members m
      -- LEFT JOIN với bảng accounts dựa trên tên (hoặc email nếu sau này bạn thêm cột email vào bảng members)
      LEFT JOIN accounts a ON m.name = a.name
      ORDER BY m.name ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Database Query Error:", err.message);
    res.status(500).json({
      error: "Không thể lấy danh sách thành viên",
      details: err.message,
    });
  }
});

// Thêm mới một thành viên vào cây gia phả
app.post("/api/addmember", async (req, res) => {
  try {
    const {
      name,
      gender,
      date_birth,
      date_death,
      note,
      relationship,
      father_id,
      mother_id,
    } = req.body;

    if (!name || !gender) {
      return res.status(400).json({ error: "Tên và giới tính là bắt buộc" });
    }

    // Giá trị date_birth và date_death truyền vào sẽ là chuỗi 'YYYY-MM-DD' hoặc null
    const result = await pool.query(
      `
      INSERT INTO members (name, gender, date_birth, date_death, note, relationship, father_id, mother_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        name,
        gender,
        date_birth || null,
        date_death || null,
        note,
        relationship || "Member",
        father_id || null,
        mother_id || null,
      ],
    );

    res.status(201).json({
      message: "Thêm thành viên thành công!",
      member: result.rows[0],
    });
  } catch (err) {
    console.error("Error adding member:", err);
    res.status(500).json({ error: err.message });
  }
});

// Lấy cấu trúc cây gia phả đệ quy (phục vụ cho việc vẽ sơ đồ hiển thị)
app.get('/api/family_tree', async (req, res) => {
  try {
    const selectedGen = req.query.generation; 
    
    let queryText = `
      WITH RECURSIVE family_tree AS (
          SELECT id, name, father_id, mother_id, date_birth, date_death, male, female, 1 AS generation 
          FROM members 
          WHERE father_id IS NULL AND mother_id IS NULL
          
          UNION ALL

          SELECT mb.id, mb.name, mb.father_id, mb.mother_id, mb.date_birth, mb.date_death, mb.male, mb.female, ft.generation + 1
          FROM members mb
          INNER JOIN family_tree ft ON mb.father_id = ft.id OR mb.mother_id = ft.id
      )
      SELECT DISTINCT id, name, father_id, mother_id, date_birth, date_death, male, female, generation 
      FROM family_tree
    `;

    const queryParams = [];
    if (selectedGen && selectedGen !== 'all') {
      queryText += ` WHERE generation <= $1`;
      queryParams.push(parseInt(selectedGen));
    }
    queryText += ` ORDER BY generation ASC, date_birth ASC`;

    const result = await pool.query(queryText, queryParams);
    const members = result.rows;

    const nodeDataArray = [];
    const linkDataArray = [];
    const marriageSet = new Set(); 

    members.forEach(m => {
      // Xác định giới tính dạng text để GoJS tương tác dễ hơn nếu cần
      const genderText = m.male === 1 ? "male" : (m.female === 1 ? "female" : "unknown");

      nodeDataArray.push({
        key: String(m.id), 
        name: m.name,
        birth: m.date_birth, // Trong ảnh DB của bạn giờ đã là DATE chuẩn (ví dụ "1930-01-01")
        death: m.date_death,
        gender: genderText,
        generation: m.generation,
        category: "MEMBER" 
      });

      if (m.father_id && m.mother_id) {
        const marriageKey = `marriage_${m.father_id}_${m.mother_id}`;

        if (!marriageSet.has(marriageKey)) {
          marriageSet.add(marriageKey);

          nodeDataArray.push({ 
            key: marriageKey, 
            category: "MARRIAGE" 
          });

          // Nối trực tiếp từ Bố sang Mẹ (SPOUSE) để ép ngang hàng
          linkDataArray.push({
            from: String(m.father_id),
            to: String(m.mother_id),
            category: "SPOUSE"
          });

          // Treo nút kết hôn ảo xuống dưới người Bố
          linkDataArray.push({
            from: String(m.father_id),
            to: marriageKey,
            category: "CHILD"
          });
        }

        // Tẽ nhánh từ nút kết hôn ảo xuống các con
        linkDataArray.push({ from: marriageKey, to: String(m.id), category: "CHILD" });

      } else if (m.father_id || m.mother_id) {
        const parentId = m.father_id || m.mother_id;
        linkDataArray.push({ from: String(parentId), to: String(m.id), category: "CHILD" });
      }
    });

    res.json({ nodeDataArray, linkDataArray });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
//Search API them thanh vien cho phan add member
app.get("/api/addmember/search", async (req, res) => {
  try {
    const keyword = req.query.q ? req.query.q.trim() : "";

    if (!keyword) {
      return res.json([]);
    }

    const searchPattern = `%${keyword}%`;

    const sqlQuery = `
            SELECT 
                m.id, 
                m.name,
                TO_CHAR(m.date_birth, 'YYYY') AS date_birth, 
                (
                    SELECT DISTINCT s.name 
                    FROM members s 
                    WHERE (s.father_id = m.id AND s.mother_id IS NOT NULL AND s.mother_id <> m.id)
                       OR (s.mother_id = m.id AND s.father_id IS NOT NULL AND s.father_id <> m.id)
                    LIMIT 1
                ) AS spouse_name
            FROM members m
            WHERE m.name ILIKE $1 
               OR TO_CHAR(m.date_birth, 'DD/MM/YYYY') LIKE $1
               OR TO_CHAR(m.date_birth, 'YYYY') LIKE $1
            ORDER BY m.date_birth DESC
            LIMIT 5;
        `;

    const result = await pool.query(sqlQuery, [searchPattern]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error when fetching search results:", error);
    res.status(500).json({ error: "Server error." });
  }
});
// API Endpoint: GET /api/statistics
// ==========================================
app.get('/api/statistics', async (req, res) => {
  try {
    // 1. Tính tổng bằng SUM trực tiếp trên cột male và female cực kỳ tối ưu
    const summaryQuery = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(male) as male,
        SUM(female) as female
      FROM members
    `);
    const summary = summaryQuery.rows[0];

    // 2. Lấy phân bổ thế hệ
    const generationQuery = await pool.query(`
      WITH RECURSIVE family_tree AS (
          SELECT id, father_id, mother_id, 1 AS generation 
          FROM members 
          WHERE father_id IS NULL AND mother_id IS NULL
          
          UNION ALL

          SELECT mb.id, mb.father_id, mb.mother_id, ft.generation + 1
          FROM members mb
          INNER JOIN family_tree ft ON mb.father_id = ft.id OR mb.mother_id = ft.id
      )
      SELECT generation, COUNT(*) as count 
      FROM family_tree 
      GROUP BY generation 
      ORDER BY generation ASC
    `);
    
    const generations = generationQuery.rows;
    const maxGeneration = generations.length > 0 ? generations[generations.length - 1].generation : 0;

    res.json({
      total: parseInt(summary.total || 0),
      male: parseInt(summary.male || 0),
      female: parseInt(summary.female || 0),
      maxGeneration: maxGeneration,
      generationData: generations.map(g => ({
        label: `Generation ${g.generation}`,
        count: parseInt(g.count)
      }))
    });

  } catch (err) {
    console.error("Error fetching statistics:", err);
    res.status(500).json({ error: err.message });
  }
});

// 1. API: Lấy thông tin chi tiết một thành viên (bao gồm Cha, Mẹ, Vợ/Chồng, Con cái, Gmail và Vai trò)
app.get("/api/members/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy thông tin cá nhân và vai trò
    const memberQuery = await pool.query(`
      SELECT 
        m.*,
        CASE 
          WHEN m.male = 1 THEN 'Nam'
          WHEN m.female = 1 THEN 'Nữ'
          ELSE 'Khác'
        END AS gender_text,
        CASE 
          WHEN a.id = 1 THEN 'Admin'
          WHEN a.id IS NOT NULL THEN 'Member'
          ELSE 'Guest'
        END AS role,
        (SELECT name FROM members WHERE id = m.father_id) AS father_name,
        (SELECT name FROM members WHERE id = m.mother_id) AS mother_name
      FROM members m
      LEFT JOIN accounts a ON m.name = a.name
      WHERE m.id = $1
    `, [id]);

    if (memberQuery.rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy thành viên này." });
    }

    const member = memberQuery.rows[0];

    // Lấy danh sách con cái
    const childrenQuery = await pool.query(`
      SELECT id, name FROM members 
      WHERE father_id = $1 OR mother_id = $1
      ORDER BY date_birth ASC
    `, [id]);

    // Lấy thông tin vợ/chồng (tạm tính dựa trên việc có chung con)
    const spouseQuery = await pool.query(`
      SELECT DISTINCT s.id, s.name 
      FROM members s
      WHERE s.id IN (
        SELECT DISTINCT CASE WHEN father_id = $1 THEN mother_id ELSE father_id END
        FROM members
        WHERE (father_id = $1 AND mother_id IS NOT NULL) OR (mother_id = $1 AND father_id IS NOT NULL)
      )
    `, [id]);

    res.json({
      ...member,
      spouse_name: spouseQuery.rows.length > 0 ? spouseQuery.rows[0].name : "---",
      children: childrenQuery.rows
    });

  } catch (err) {
    console.error("Error detailed member:", err.message);
    res.status(500).json({ error: "Lỗi Server", details: err.message });
  }
});

// 2. API: Cập nhật thông tin trực tiếp
app.put("/api/members/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gender, date_birth, note, gmail } = req.body;

    const male = gender === "Nam" ? 1 : 0;
    const female = gender === "Nữ" ? 1 : 0;

    await pool.query(`
      UPDATE members 
      SET 
        name = $1, 
        male = $2, 
        female = $3, 
        date_birth = $4, 
        note = $5,
        gmail = $6
      WHERE id = $7
    `, [name, male, female, date_birth || null, note || null, gmail || null, id]);

    res.json({ message: "Cập nhật thành công!" });
  } catch (err) {
    console.error("Error updating member:", err.message);
    res.status(500).json({ error: "Không thể cập nhật thông tin." });
  }
});

// ==========================================
// SETTINGS APIs (CÀI ĐẶT HỆ THỐNG & TÀI KHOẢN)
// ==========================================

// 1. Lấy thông tin cấu hình hiện tại của một tài khoản cụ thể
app.get("/api/settings/account/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT id, name, email, username, member_id FROM accounts WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tài khoản không tồn tại" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Cập nhật Thông tin & Liên kết Thành viên Gia phả
app.put("/api/settings/account/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, member_id } = req.body;

    await pool.query(
      "UPDATE accounts SET name = $1, email = $2, member_id = $3 WHERE id = $4",
      [name, email, member_id, id]
    );

    res.json({ message: "Cập nhật cấu hình tài khoản thành công!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. API Đổi mật khẩu an toàn (Bcrypt mã hóa)
app.put("/api/settings/password/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    const userQuery = await pool.query("SELECT password FROM accounts WHERE id = $1", [id]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "User không tồn tại" });
    }

    const correct = await bcrypt.compare(oldPassword, userQuery.rows[0].password);
    if (!correct) {
      return res.status(400).json({ error: "Mật khẩu hiện tại không chính xác!" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE accounts SET password = $1 WHERE id = $2", [hashedNewPassword, id]);

    res.json({ message: "Thay đổi mật khẩu thành công!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. API Sao lưu toàn bộ dữ liệu (Chỉ Admin gọi)
app.get("/api/admin/backup", async (req, res) => {
  try {
    const membersData = await pool.query("SELECT * FROM members ORDER BY id ASC");
    const accountsData = await pool.query("SELECT id, name, email, username, member_id FROM accounts");
    
    res.json({
      backup_version: "1.0",
      timestamp: new Date(),
      members: membersData.rows,
      accounts: accountsData.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Lỗi sao lưu hệ thống: " + err.message });
  }
});

// Giả định ID người dùng đang đăng nhập (Khi làm thực tế, lấy từ req.user.id sau khi xác thực)
const getCurrentUserId = (req) => 3; 

// [GET] Lấy thông tin hồ sơ từ PostgreSQL bao gồm cả việc truy vấn tên Cha/Mẹ từ mối quan hệ trực hệ
app.get('/api/user/profile', async (req, res) => {
  const userId = getCurrentUserId(req);

  try {
    // Câu lệnh SQL nâng cao tự động lấy thêm tên của Cha và Mẹ từ liên kết id nội bộ
    const queryText = `
      SELECT 
        u.*,
        f.name AS father_name,
        m.name AS mother_name
      FROM members u
      LEFT JOIN members f ON u.father_id = f.id
      LEFT JOIN members m ON u.mother_id = m.id
      WHERE u.id = $1
    `;
    
    const result = await pool.query(queryText, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thành viên." });
    }

    const member = result.rows[0];

    // Ánh xạ dữ liệu trả về cho Client khớp với cấu trúc trường trong DB của bạn
    res.json({
      id: member.id,
      name: member.name,
      date_birth: member.date_birth,
      avatar_url: member.avatar_url,
      gmail: member.gmail,
      gender: member.male === 1 ? "Nam" : (member.female === 1 ? "Nữ" : "Khác"),
      father_name: member.father_name || "Chưa rõ",
      mother_name: member.mother_name || "Chưa rõ"
    });

  } catch (error) {
    console.error("Lỗi Database:", error);
    res.status(500).json({ success: false, message: "Lỗi kết nối cơ sơ dữ liệu." });
  }
});

// [PUT] Cập nhật dữ liệu từ form chỉnh sửa trực tiếp vào PostgreSQL
app.put('/api/user/profile', async (req, res) => {
  const userId = getCurrentUserId(req);
  const { name, date_birth, gender, gmail } = req.body;

  // Xử lý chuyển đổi giới tính về định dạng kiểu số (male/female) như thiết kế DB của bạn
  const male = (gender === "Nam") ? 1 : 0;
  const female = (gender === "Nữ") ? 1 : 0;

  try {
    const updateText = `
      UPDATE members 
      SET name = $1, date_birth = $2, male = $3, female = $4, gmail = $5
      WHERE id = $6
    `;
    
    await pool.query(updateText, [name, date_birth, male, female, gmail, userId]);
    res.json({ success: true, message: "Đã cập nhật cơ sở dữ liệu thành công!" });

  } catch (error) {
    console.error("Lỗi khi update DB:", error);
    res.status(500).json({ success: false, message: "Không thể ghi dữ liệu mới vào hệ thống." });
  }
});

app.listen(PORT, () => {
  console.log(`Server kết nối PostgreSQL đang chạy tại: http://localhost:${PORT}`);
});

// Cấu hình các thư mục tĩnh chứa file giao diện (HTML, CSS, JS công khai)
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// VIEW ROUTES (ĐIỀU HƯỚNG GIAO DIỆN)
// ==========================================
app.get("/main", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "mainpage", "index.html"));
});

app.get("/mainpage", (req, res) => {
  res.redirect("/main");
});
// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`Server is now running on http://localhost:${PORT}`);
});
