const mongoose = require('mongoose');
const DownloadHistory = require('../models/DownloadHistory');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/validators');

function normalizeTrimmedValue(value = '') {
  return String(value || '').trim();
}

// 方法：createDownloadHistory，负责新增或更新下载记录。
const createDownloadHistory = asyncHandler(async (req, res) => {
  const { recordId, fileName, fileUrl, fileType, sourceType, sourcePage, sourceName } = req.body || {};

  if (!normalizeTrimmedValue(fileName)) {
    throw new AppError('fileName 必填');
  }

  if (!normalizeTrimmedValue(fileUrl)) {
    throw new AppError('fileUrl 必填');
  }

  const normalizedRecordId = normalizeTrimmedValue(recordId);
  const query = {
    user: req.user._id,
    isDeleted: false
  };

  if (normalizedRecordId && mongoose.Types.ObjectId.isValid(normalizedRecordId)) {
    query.recordId = normalizedRecordId;
  } else {
    query.fileUrl = normalizeTrimmedValue(fileUrl);
  }

  const downloadHistory = await DownloadHistory.findOneAndUpdate(
    query,
    {
      $set: {
        fileName: normalizeTrimmedValue(fileName),
        fileUrl: normalizeTrimmedValue(fileUrl),
        fileType: normalizeTrimmedValue(fileType).toLowerCase(),
        sourceType: normalizeTrimmedValue(sourceType).toLowerCase(),
        sourcePage: normalizeTrimmedValue(sourcePage),
        sourceName: normalizeTrimmedValue(sourceName),
        lastDownloadedAt: new Date(),
        isDeleted: false,
        ...(normalizedRecordId && mongoose.Types.ObjectId.isValid(normalizedRecordId)
          ? { recordId: normalizedRecordId }
          : {})
      },
      $inc: {
        downloadCount: 1
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  ).lean();

  return sendSuccess(res, downloadHistory, '记录成功', 0, 201);
});

// 方法：getDownloadHistory，负责分页获取我的下载记录。
const getDownloadHistory = asyncHandler(async (req, res) => {
  const { page, pageSize, skip } = parsePagination(req.query);
  const query = {
    user: req.user._id,
    isDeleted: false
  };

  const [list, total] = await Promise.all([
    DownloadHistory.find(query)
      .sort({ lastDownloadedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    DownloadHistory.countDocuments(query)
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

module.exports = {
  createDownloadHistory,
  getDownloadHistory
};
