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

// Lấy danh sách thành viên rút gọn cho phần hiển thị list
app.get("/api/members", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        gender, 
        date_birth, 
        relationship,
        avatar_url
      FROM members
      ORDER BY name ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching members:", err);
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
// Cấu hình các thư mục tĩnh chứa file giao diện (HTML, CSS, JS công khai)
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "list")));

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
