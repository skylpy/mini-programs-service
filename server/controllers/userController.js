const User = require('../models/User');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { isValidEmail } = require('../utils/validators');

// 方法：getProfile，负责当前接口的业务处理。
const getProfile = asyncHandler(async (req, res) => {
  return sendSuccess(res, req.user.toSafeObject());
});

// 方法：updateProfile，负责当前接口的业务处理。
const updateProfile = asyncHandler(async (req, res) => {
  const { username, avatar, email } = req.body;
  const updates = {};

  if (username !== undefined) {
    if (!String(username).trim()) {
      throw new AppError('username 不能为空');
    }
    updates.username = String(username).trim();
  }

  if (avatar !== undefined) {
    updates.avatar = String(avatar).trim();
  }

  if (email !== undefined) {
    const emailValue = String(email).trim();
    if (emailValue && !isValidEmail(emailValue)) {
      throw new AppError('email 格式不正确');
    }

    if (emailValue) {
      const existingUser = await User.findOne({
        _id: { $ne: req.user._id },
        email: emailValue,
        isDeleted: false
      });
      if (existingUser) {
        throw new AppError('邮箱已被使用');
      }
    }

    updates.email = emailValue;
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true
  }).select('-password');

  return sendSuccess(res, user.toSafeObject(), '更新成功');
});

// 方法：updatePassword，负责当前接口的业务处理。
const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new AppError('oldPassword 和 newPassword 必填');
  }

  if (String(newPassword).length < 6) {
    throw new AppError('newPassword 长度至少 6 位');
  }

  if (String(oldPassword) === String(newPassword)) {
    throw new AppError('新密码不能与旧密码相同');
  }

  const user = await User.findOne({
    _id: req.user._id,
    isDeleted: false
  });

  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  const isMatch = await user.comparePassword(String(oldPassword));

  if (!isMatch) {
    throw new AppError('旧密码错误', 400);
  }

  user.password = String(newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return sendSuccess(res, {}, '密码修改成功，请重新登录');
});

// 导出当前模块对外提供的方法集合。
module.exports = {
  getProfile,
  updateProfile,
  updatePassword
};
