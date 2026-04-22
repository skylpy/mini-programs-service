const mongoose = require('mongoose');

// 数据模型：bannerSchema，定义 MongoDB 文档结构。
const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String,
      required: true,
      trim: true
    },
    link: {
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
module.exports = mongoose.model('Banner', bannerSchema);
