const mongoose = require('mongoose');

// 数据模型：operationLogSchema，定义后台操作日志结构。
const operationLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    actorType: {
      type: String,
      enum: ['guest', 'user', 'admin'],
      default: 'guest',
      index: true
    },
    actorSnapshot: {
      id: {
        type: String,
        default: '',
        trim: true
      },
      username: {
        type: String,
        default: '',
        trim: true
      },
      mobile: {
        type: String,
        default: '',
        trim: true
      },
      role: {
        type: String,
        default: '',
        trim: true
      }
    },
    method: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
      index: true
    },
    path: {
      type: String,
      default: '',
      trim: true,
      index: true
    },
    originalUrl: {
      type: String,
      default: '',
      trim: true
    },
    module: {
      type: String,
      default: '',
      trim: true,
      index: true
    },
    ip: {
      type: String,
      default: '',
      trim: true
    },
    userAgent: {
      type: String,
      default: '',
      trim: true
    },
    query: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    body: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    statusCode: {
      type: Number,
      default: 200,
      index: true
    },
    success: {
      type: Boolean,
      default: true,
      index: true
    },
    responseMessage: {
      type: String,
      default: '',
      trim: true
    },
    responseData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    errorMessage: {
      type: String,
      default: '',
      trim: true
    },
    durationMs: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

operationLogSchema.index({ createdAt: -1 });
operationLogSchema.index({ module: 1, createdAt: -1 });
operationLogSchema.index({ actorType: 1, createdAt: -1 });
operationLogSchema.index({ statusCode: 1, createdAt: -1 });

// 导出当前模块的核心能力。
module.exports = mongoose.model('OperationLog', operationLogSchema);
