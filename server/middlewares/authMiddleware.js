const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

// 方法：authMiddleware，负责当前接口的业务处理。
const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    throw new AppError('未授权，请先登录', 401);
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    throw new AppError('缺少 token', 401);
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new AppError('token 无效或已过期', 401);
  }

  const user = await User.findOne({
    _id: decoded.id,
    isDeleted: false
  }).select('-password');

  if (!user) {
    throw new AppError('用户不存在', 401);
  }

  if ((user.status || 'active') !== 'active') {
    throw new AppError('账号已被禁用', 403);
  }

  if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
    throw new AppError('token 已失效，请重新登录', 401);
  }

  req.user = user;
  next();
});

// 导出当前模块的核心能力。
module.exports = authMiddleware;
