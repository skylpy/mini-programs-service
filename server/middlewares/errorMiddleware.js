const { sendError } = require('../utils/response');

// 方法：notFoundMiddleware，负责当前模块中的具体处理逻辑。
const notFoundMiddleware = (req, res) => {
  return sendError(res, `接口不存在: ${req.originalUrl}`, 404);
};

// 方法：errorMiddleware，负责当前模块中的具体处理逻辑。
const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, '上传文件过大', 400);
    }
    return sendError(res, err.message || '文件上传失败', 400);
  }

  if (err.name === 'ValidationError') {
    return sendError(res, Object.values(err.errors).map((item) => item.message).join('；'), 400);
  }

  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyPattern || {})[0] || '字段';
    return sendError(res, `${duplicateField} 已存在`, 400);
  }

  return sendError(res, err.message || '服务器内部错误', statusCode);
};

// 导出当前模块对外提供的方法集合。
module.exports = {
  notFoundMiddleware,
  errorMiddleware
};
