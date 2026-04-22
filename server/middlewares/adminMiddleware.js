const AppError = require('../utils/appError');

// 方法：adminMiddleware，负责当前模块中的具体处理逻辑。
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('无后台访问权限', 403));
  }

  next();
};

// 导出当前模块的核心能力。
module.exports = adminMiddleware;
