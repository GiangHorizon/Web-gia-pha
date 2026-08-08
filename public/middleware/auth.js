const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Xác thực thất bại: Bạn chưa cung cấp Access Token" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Access Token không hợp lệ hoặc đã hết hạn" });
    }
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;