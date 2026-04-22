const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 数据模型：userSchema，定义 MongoDB 文档结构。
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, '用户名不能为空'],
      trim: true
    },
    mobile: {
      type: String,
      required: [true, '手机号不能为空'],
      unique: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      default: '',
      sparse: true
    },
    password: {
      type: String,
      required: [true, '密码不能为空'],
      minlength: [6, '密码长度不能少于 6 位']
    },
    avatar: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
      index: true
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    tokenVersion: {
      type: Number,
      default: 0
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

// 在保存用户前统一处理密码加密。
userSchema.pre('save', async function savePassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 实例方法：comparePassword，用于校验明文密码与加密密码是否匹配。
userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

// 实例方法：toSafeObject，用于输出去掉敏感字段后的用户信息。
userSchema.methods.toSafeObject = function toSafeObject(options = {}) {
  const {
    includeRole = false,
    includeStatus = false,
    includeLastLoginAt = false
  } = options;

  const safeObject = {
    id: this._id,
    username: this.username,
    mobile: this.mobile,
    avatar: this.avatar,
    email: this.email,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };

  if (includeRole) {
    safeObject.role = this.role || 'user';
  }

  if (includeStatus) {
    safeObject.status = this.status || 'active';
  }

  if (includeLastLoginAt) {
    safeObject.lastLoginAt = this.lastLoginAt;
  }

  return safeObject;
};

// 导出当前模块的核心能力。
module.exports = mongoose.model('User', userSchema);
