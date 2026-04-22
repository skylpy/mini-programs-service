// 方法：sendSuccess，负责当前模块中的具体处理逻辑。
const sendSuccess = (res, data = {}, message = 'success', code = 0, statusCode = 200) => {
  res.locals.responseMessage = message;
  res.locals.errorMessage = '';
  res.locals.responseData = data;

  return res.status(statusCode).json({
    code,
    message,
    data
  });
};

// 方法：sendError，负责当前模块中的具体处理逻辑。
const sendError = (res, message = 'error', statusCode = 400, code = 1, data = null) => {
  res.locals.responseMessage = message;
  res.locals.errorMessage = message;
  res.locals.responseData = data;

  return res.status(statusCode).json({
    code,
    message,
    data
  });
};

// 导出当前模块对外提供的方法集合。
module.exports = {
  sendSuccess,
  sendError
};
