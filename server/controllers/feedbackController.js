const Feedback = require('../models/Feedback');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/validators');

// 方法：createFeedback，负责当前接口的业务处理。
const createFeedback = asyncHandler(async (req, res) => {
  const { content, contact } = req.body;

  if (!content || !String(content).trim()) {
    throw new AppError('content 必填');
  }

  const feedback = await Feedback.create({
    user: req.user._id,
    content: String(content).trim(),
    contact: contact ? String(contact).trim() : ''
  });

  return sendSuccess(res, feedback, '提交成功', 0, 201);
});

// 方法：getFeedbackList，负责当前接口的业务处理。
const getFeedbackList = asyncHandler(async (req, res) => {
  const { page, pageSize, skip } = parsePagination(req.query);

  const query = {
    user: req.user._id,
    isDeleted: false
  };

  const [list, total] = await Promise.all([
    Feedback.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Feedback.countDocuments(query)
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
  createFeedback,
  getFeedbackList
};
