const Record = require('../models/Record');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/validators');
const { getFileUrl } = require('../services/ossService');

// 方法：createRecord，负责当前接口的业务处理。
const createRecord = asyncHandler(async (req, res) => {
  const { toolType, sourceFileName, targetFileName, status } = req.body;

  if (!toolType || !String(toolType).trim()) {
    throw new AppError('toolType 必填');
  }

  if (!sourceFileName || !String(sourceFileName).trim()) {
    throw new AppError('sourceFileName 必填');
  }

  const record = await Record.create({
    user: req.user._id,
    toolType: String(toolType).trim(),
    sourceFileName: String(sourceFileName).trim(),
    targetFileName: targetFileName ? String(targetFileName).trim() : '',
    status: status || 'processing'
  });

  return sendSuccess(res, record, '新增成功', 0, 201);
});

// 方法：getRecords，负责当前接口的业务处理。
const getRecords = asyncHandler(async (req, res) => {
  const { page, pageSize, skip } = parsePagination(req.query);

  const query = {
    user: req.user._id,
    isDeleted: false
  };

  const [list, total] = await Promise.all([
    Record.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Record.countDocuments(query)
  ]);

  const normalizedList = list.map((item) => {
    const sourceUrl = item.sourceKey ? getFileUrl(item.sourceKey) : item.sourceUrl || '';
    const pdfUrl = item.pdfKey ? getFileUrl(item.pdfKey) : item.pdfUrl || '';
    const downloadUrl = item.targetKey ? getFileUrl(item.targetKey) : item.downloadUrl || '';

    return {
      ...item,
      sourceStorageType: item.sourceStorageType || '',
      sourceUrl,
      sourceKey: item.sourceKey || '',
      pdfUrl,
      pdfKey: item.pdfKey || '',
      targetKey: item.targetKey || '',
      downloadUrl,
      finishedAt: item.finishedAt || null,
      errorMsg: item.errorMsg || item.errorMessage || '',
      taskType: item.taskType || ''
    };
  });

  return sendSuccess(res, {
    list: normalizedList,
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
  createRecord,
  getRecords
};
