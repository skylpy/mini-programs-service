const mongoose = require('mongoose');

// 数据模型：downloadHistorySchema，定义“我的下载”记录结构。
const downloadHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Record',
      required: false,
      default: null,
      index: true
    },
    fileName: {
      type: String,
      required: true,
      trim: true
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true
    },
    fileType: {
      type: String,
      default: '',
      trim: true
    },
    sourceType: {
      type: String,
      default: '',
      trim: true
    },
    sourcePage: {
      type: String,
      default: '',
      trim: true
    },
    sourceName: {
      type: String,
      default: '',
      trim: true
    },
    lastDownloadedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    downloadCount: {
      type: Number,
      default: 1
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DownloadHistory', downloadHistorySchema);
