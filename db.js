// db.js
const { Pool } = require("pg");

// Hỗ trợ 2 cách cấu hình:
// 1. DATABASE_URL (connection string đầy đủ) — kiểu mà Neon, Supabase,
//    Render, Railway... thường cung cấp sẵn.
// 2. Từng biến riêng (DB_USER, DB_HOST, ...) — dùng cho PostgreSQL local.

// Dọn khoảng trắng và dấu nháy thừa nếu người dùng lỡ copy nguyên định dạng
// PG*='...' (có dấu nháy đơn) từ bảng Connection Details của Neon.
function cleanEnv(value) {
  if (!value) return value;
  return value.trim().replace(/^['"]|['"]$/g, "");
}

const dbHost = cleanEnv(process.env.DB_HOST);
const databaseUrl = cleanEnv(process.env.DATABASE_URL);

// Tự động bật SSL khi:
// - DB_SSL được đặt rõ ràng là true (không phân biệt hoa/thường), HOẶC
// - host không phải localhost/127.0.0.1 (database cloud luôn cần SSL,
//   nên không bắt buộc phải nhớ set đúng DB_SSL nữa — tránh lỗi vặt).
const dbSslEnv = cleanEnv(process.env.DB_SSL || "").toLowerCase();
const isLocalHost = dbHost === "localhost" || dbHost === "127.0.0.1";

const sslEnabled =
  dbSslEnv === "true" ||
  (!isLocalHost && dbSslEnv !== "false" && !!(databaseUrl || dbHost));

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      user: cleanEnv(process.env.DB_USER),
      host: dbHost,
      database: cleanEnv(process.env.DB_NAME),
      password: cleanEnv(process.env.DB_PASSWORD),
      port: cleanEnv(process.env.DB_PORT),
      ssl: sslEnabled ? { rejectUnauthorized: false } : false
    });

module.exports = pool;
