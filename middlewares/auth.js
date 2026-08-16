const jwt = require("jsonwebtoken");

// Tự đọc header Cookie thủ công, không cần thêm dependency cookie-parser.
function parseCookies(req) {

    const header = req.headers.cookie;
    const cookies = {};

    if (!header) return cookies;

    header.split(";").forEach(part => {

        const idx = part.indexOf("=");
        if (idx === -1) return;

        const key = part.slice(0, idx).trim();
        const val = part.slice(idx + 1).trim();

        cookies[key] = decodeURIComponent(val);

    });

    return cookies;

}

function verifyToken(req, res, next) {

    // Ưu tiên cookie httpOnly (dùng bởi web frontend — an toàn hơn trước XSS
    // vì JavaScript trên trình duyệt không đọc được cookie httpOnly).
    // Vẫn hỗ trợ header Authorization: Bearer <token> cho các API client khác
    // (Postman, script, mobile app...) không dùng cookie.
    const cookies = parseCookies(req);
    let token = cookies.token;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            token = authHeader.split(" ")[1];
        }
    }

    if (!token) {
        return res.status(401).json({
            message: "Chưa đăng nhập"
        });
    }

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (err) {

        return res.status(401).json({
            message: "Token hết hạn hoặc không hợp lệ"
        });

    }

}

module.exports = verifyToken;
module.exports.parseCookies = parseCookies; // export riêng để viết unit test dễ dàng
