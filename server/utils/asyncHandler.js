// 方法：asyncHandler，负责当前模块中的具体处理逻辑。
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 导出当前模块的核心能力。
module.exports = asyncHandler;
