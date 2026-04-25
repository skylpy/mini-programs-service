const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// 方法：optionalAuthMiddleware，负责在 token 合法时挂载用户，否则按匿名继续。
const optionalAuthMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    req.user = null;
    next();
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded.id,
      isDeleted: false
    }).select('-password');

    if (
      user &&
      (user.status || 'active') === 'active' &&
      (decoded.tokenVersion || 0) === (user.tokenVersion || 0)
    ) {
      req.user = user;
      next();
      return;
    }
  } catch (error) {
    // 按匿名继续。
  }

  req.user = null;
  next();
});

module.exports = optionalAuthMiddleware;
