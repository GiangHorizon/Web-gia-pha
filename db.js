// db.js
const { Pool } = require("pg");

// Hỗ trợ 2 cách cấu hình:
// 1. DATABASE_URL (connection string đầy đủ) — kiểu mà Neon, Supabase,
//    Render, Railway... thường cung cấp sẵn.
// 2. Từng biến riêng (DB_USER, DB_HOST, ...) — dùng cho PostgreSQL local.
//
// DB_SSL=true để bật SSL (bắt buộc với hầu hết DB cloud).
// rejectUnauthorized:false vì nhiều nhà cung cấp cloud dùng chứng chỉ SSL
// tự ký (self-signed) cho kết nối nội bộ — đây là cấu hình phổ biến pg
// khuyến nghị cho các dịch vụ như Neon/Supabase/Render.

const sslEnabled = process.env.DB_SSL === "true";

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false
    });

module.exports = pool;
