const Faq = require('../models/Faq');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

// 方法：getFaqs，负责当前接口的业务处理。
const getFaqs = asyncHandler(async (req, res) => {
  const list = await Faq.find({
    status: true,
    isDeleted: false
  })
    .sort({ sort: 1, createdAt: -1 })
    .lean();

  return sendSuccess(res, list);
});

// 导出当前模块对外提供的方法集合。
module.exports = {
  getFaqs
};
