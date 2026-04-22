const mongoose = require('mongoose');

// 数据模型：feedbackSchema，定义 MongoDB 文档结构。
const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    contact: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'processed'],
      default: 'pending'
    },
    reply: {
      type: String,
      default: '',
      trim: true
    },
    processedAt: {
      type: Date,
      default: null
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
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
module.exports = mongoose.model('Feedback', feedbackSchema);
