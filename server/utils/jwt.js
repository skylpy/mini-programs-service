const jwt = require('jsonwebtoken');

// 方法：generateToken，负责当前模块中的具体处理逻辑。
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// 导出当前模块对外提供的方法集合。
module.exports = {
  generateToken
};
