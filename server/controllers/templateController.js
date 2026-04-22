const Template = require('../models/Template');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

// 方法：getTemplates，负责当前接口的业务处理。
const getTemplates = asyncHandler(async (req, res) => {
  const query = {
    status: true,
    isDeleted: false
  };

  if (req.query.category) {
    query.category = String(req.query.category).trim();
  }

  const list = await Template.find(query)
    .sort({ sort: 1, createdAt: -1 })
    .lean();

  return sendSuccess(res, list);
});

// 导出当前模块对外提供的方法集合。
module.exports = {
  getTemplates
};
