const mongoose = require('mongoose');

// 数据模型：templateSchema，定义 MongoDB 文档结构。
const templateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    cover: {
      type: String,
      default: '',
      trim: true
    },
    downloadUrl: {
      type: String,
      default: '',
      trim: true
    },
    sort: {
      type: Number,
      default: 0
    },
    status: {
      type: Boolean,
      default: true
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
module.exports = mongoose.model('Template', templateSchema);
