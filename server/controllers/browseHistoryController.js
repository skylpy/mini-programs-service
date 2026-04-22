const BrowseHistory = require('../models/BrowseHistory');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/validators');

// 方法：createBrowseHistory，负责当前接口的业务处理。
const createBrowseHistory = asyncHandler(async (req, res) => {
  const { title, type, path } = req.body;

  if (!title || !String(title).trim()) {
    throw new AppError('title 必填');
  }

  if (!type || !String(type).trim()) {
    throw new AppError('type 必填');
  }

  if (!path || !String(path).trim()) {
    throw new AppError('path 必填');
  }

  const browseHistory = await BrowseHistory.create({
    user: req.user._id,
    title: String(title).trim(),
    type: String(type).trim(),
    path: String(path).trim()
  });

  return sendSuccess(res, browseHistory, '新增成功', 0, 201);
});

// 方法：getBrowseHistory，负责当前接口的业务处理。
const getBrowseHistory = asyncHandler(async (req, res) => {
  const { page, pageSize, skip } = parsePagination(req.query);

  const query = {
    user: req.user._id,
    isDeleted: false
  };

  const [list, total] = await Promise.all([
    BrowseHistory.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    BrowseHistory.countDocuments(query)
  ]);

  return sendSuccess(res, {
    list,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

// 导出当前模块对外提供的方法集合。
module.exports = {
  createBrowseHistory,
  getBrowseHistory
};
