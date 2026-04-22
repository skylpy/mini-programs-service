const mongoose = require('mongoose');

// 数据模型：serviceConfigSchema，定义 MongoDB 文档结构。
const serviceConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    wechat: {
      type: String,
      default: '',
      trim: true
    },
    email: {
      type: String,
      default: '',
      trim: true
    },
    workingHours: {
      type: String,
      default: '',
      trim: true
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
module.exports = mongoose.model('ServiceConfig', serviceConfigSchema);
