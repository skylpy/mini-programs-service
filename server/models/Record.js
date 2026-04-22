const mongoose = require('mongoose');

// 数据模型：recordSchema，定义 MongoDB 文档结构。
const recordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    toolType: {
      type: String,
      required: true,
      trim: true
    },
    sourceFileName: {
      type: String,
      required: true,
      trim: true
    },
    sourceFilePath: {
      type: String,
      default: '',
      trim: true
    },
    sourceStorageType: {
      type: String,
      default: '',
      trim: true
    },
    sourceUrl: {
      type: String,
      default: '',
      trim: true
    },
    sourceKey: {
      type: String,
      default: '',
      trim: true
    },
    sourceFileSize: {
      type: Number,
      default: 0
    },
    targetFileName: {
      type: String,
      default: '',
      trim: true
    },
    targetKey: {
      type: String,
      default: '',
      trim: true
    },
    targetFilePath: {
      type: String,
      default: '',
      trim: true
    },
    targetFormat: {
      type: String,
      default: '',
      trim: true
    },
    downloadUrl: {
      type: String,
      default: '',
      trim: true
    },
    pdfUrl: {
      type: String,
      default: '',
      trim: true
    },
    pdfKey: {
      type: String,
      default: '',
      trim: true
    },
    finishedAt: {
      type: Date,
      default: null
    },
    errorMessage: {
      type: String,
      default: '',
      trim: true
    },
    errorMsg: {
      type: String,
      default: '',
      trim: true
    },
    taskType: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'processing'],
      default: 'processing'
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

// 导出当前模块的核心能力。
module.exports = mongoose.model('Record', recordSchema);
