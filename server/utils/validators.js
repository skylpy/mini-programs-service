// 手机号格式校验规则。
const MOBILE_REGEX = /^1[3-9]\d{9}$/;
// 邮箱格式校验规则。
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 方法：isValidMobile，负责当前模块中的具体处理逻辑。
const isValidMobile = (mobile) => MOBILE_REGEX.test(String(mobile || '').trim());
// 方法：isValidEmail，负责当前模块中的具体处理逻辑。
const isValidEmail = (email) => EMAIL_REGEX.test(String(email || '').trim());

// 方法：parsePagination，负责当前模块中的具体处理逻辑。
const parsePagination = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);
  const skip = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    skip
  };
};

// 导出当前模块对外提供的方法集合。
module.exports = {
  isValidMobile,
  isValidEmail,
  parsePagination
};
