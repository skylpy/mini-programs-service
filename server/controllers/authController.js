const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { generateToken } = require('../utils/jwt');
const { isValidMobile, isValidEmail } = require('../utils/validators');
const { getMiniProgramSession, getPhoneNumberByCode } = require('../services/wechatService');

function generateWechatUserPassword() {
  return crypto.randomBytes(18).toString('hex');
}

function buildWechatUsername({ nickname, mobile, openid }) {
  const nicknameValue = String(nickname || '').trim();

  if (nicknameValue) {
    return nicknameValue;
  }

  const mobileValue = String(mobile || '').trim();

  if (mobileValue) {
    return `微信用户${mobileValue.slice(-4)}`;
  }

  return `微信用户${String(openid || '').slice(-6)}`;
}

async function issueLoginResponse(res, user, message = '登录成功', extraData = {}) {
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken({
    id: user._id,
    role: user.role || 'user',
    tokenVersion: user.tokenVersion || 0
  });

  return sendSuccess(
    res,
    {
      token,
      user: user.toSafeObject(),
      ...extraData
    },
    message
  );
}

// 方法：register，负责当前接口的业务处理。
const register = asyncHandler(async (req, res) => {
  const { username, mobile, email, password } = req.body;

  if (!username || !String(username).trim()) {
    throw new AppError('username 必填');
  }

  if (!mobile || !isValidMobile(mobile)) {
    throw new AppError('mobile 格式不正确');
  }

  if (!password || String(password).length < 6) {
    throw new AppError('password 长度至少 6 位');
  }

  if (email && !isValidEmail(email)) {
    throw new AppError('email 格式不正确');
  }

  const existingMobile = await User.findOne({ mobile: String(mobile).trim(), isDeleted: false });

  if (existingMobile) {
    throw new AppError('手机号已注册');
  }

  if (email) {
    const existingEmail = await User.findOne({ email: String(email).trim(), isDeleted: false });
    if (existingEmail) {
      throw new AppError('邮箱已被使用');
    }
  }

  const user = await User.create({
    username: String(username).trim(),
    mobile: String(mobile).trim(),
    email: email ? String(email).trim() : '',
    password: String(password),
    avatar: ''
  });

  return sendSuccess(
    res,
    {
      user: user.toSafeObject()
    },
    '注册成功',
    0,
    201
  );
});

// 方法：login，负责当前接口的业务处理。
const login = asyncHandler(async (req, res) => {
  const { account, password } = req.body;

  if (!account || !password) {
    throw new AppError('account 和 password 必填');
  }

  const accountValue = String(account).trim();
  const user = await User.findOne({
    isDeleted: false,
    $or: [{ mobile: accountValue }, { username: accountValue }]
  });

  if (!user) {
    throw new AppError('账号或密码错误', 401);
  }

  if ((user.status || 'active') !== 'active') {
    throw new AppError('账号已被禁用', 403);
  }

  const isMatch = await user.comparePassword(String(password));

  if (!isMatch) {
    throw new AppError('账号或密码错误', 401);
  }

  return issueLoginResponse(res, user);
});

// 方法：wechatMiniProgramLogin，负责当前接口的业务处理。
const wechatMiniProgramLogin = asyncHandler(async (req, res) => {
  const { loginCode, phoneCode, nickname, avatar } = req.body;

  if (!loginCode || !String(loginCode).trim()) {
    throw new AppError('loginCode 必填');
  }

  if (!phoneCode || !String(phoneCode).trim()) {
    throw new AppError('phoneCode 必填');
  }

  const { openid, unionid } = await getMiniProgramSession(loginCode);
  const phoneInfo = await getPhoneNumberByCode(phoneCode);
  const mobile = String(phoneInfo.purePhoneNumber || phoneInfo.phoneNumber || '').trim();

  if (!mobile || !isValidMobile(mobile)) {
    throw new AppError('获取到的微信手机号无效', 400);
  }

  let user = await User.findOne({
    wechatOpenid: openid,
    isDeleted: false
  });
  let isNewUser = false;

  if (!user) {
    user = await User.findOne({
      mobile,
      isDeleted: false
    });

    if (user && user.wechatOpenid && user.wechatOpenid !== openid) {
      throw new AppError('该手机号已绑定其他微信账号', 409);
    }
  }

  if (!user) {
    isNewUser = true;
    user = await User.create({
      username: buildWechatUsername({ nickname, mobile, openid }),
      mobile,
      password: generateWechatUserPassword(),
      avatar: String(avatar || '').trim(),
      email: '',
      wechatOpenid: openid,
      wechatUnionid: unionid || '',
      loginType: 'wechat-mini-program',
      lastLoginAt: new Date()
    });

    return issueLoginResponse(res, user, '微信登录成功', { isNewUser });
  }

  if ((user.status || 'active') !== 'active') {
    throw new AppError('账号已被禁用', 403);
  }

  if (user.mobile !== mobile) {
    const existingMobileUser = await User.findOne({
      _id: { $ne: user._id },
      mobile,
      isDeleted: false
    });

    if (existingMobileUser) {
      throw new AppError('当前微信手机号已绑定其他账号，请联系管理员处理', 409);
    }

    user.mobile = mobile;
  }

  if (!user.wechatOpenid) {
    user.wechatOpenid = openid;
  }

  if (unionid && user.wechatUnionid !== unionid) {
    user.wechatUnionid = unionid;
  }

  if (!user.username || /^微信用户/.test(user.username)) {
    user.username = buildWechatUsername({ nickname, mobile, openid });
  }

  if (!user.avatar && avatar) {
    user.avatar = String(avatar).trim();
  }

  user.loginType = 'wechat-mini-program';

  return issueLoginResponse(res, user, '微信登录成功', { isNewUser });
});

// 方法：forgotPassword，负责当前接口的业务处理。
const forgotPassword = asyncHandler(async (req, res) => {
  const { username, mobile, email, newPassword } = req.body;

  if (!username || !String(username).trim()) {
    throw new AppError('username 必填');
  }

  if (!mobile || !isValidMobile(mobile)) {
    throw new AppError('mobile 格式不正确');
  }

  if (email && !isValidEmail(email)) {
    throw new AppError('email 格式不正确');
  }

  if (!newPassword || String(newPassword).length < 6) {
    throw new AppError('newPassword 长度至少 6 位');
  }

  const query = {
    username: String(username).trim(),
    mobile: String(mobile).trim(),
    isDeleted: false
  };

  if (email) {
    query.email = String(email).trim();
  }

  const user = await User.findOne(query);

  if (!user) {
    throw new AppError('用户信息不匹配，无法重置密码', 400);
  }

  if ((user.status || 'active') !== 'active') {
    throw new AppError('账号已被禁用', 403);
  }

  const isSamePassword = await user.comparePassword(String(newPassword));

  if (isSamePassword) {
    throw new AppError('新密码不能与当前密码相同');
  }

  user.password = String(newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return sendSuccess(res, {}, '密码重置成功，请重新登录');
});

// 方法：logout，负责当前接口的业务处理。
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $inc: {
      tokenVersion: 1
    }
  });

  return sendSuccess(res, {}, '退出登录成功');
});

// 导出当前模块对外提供的方法集合。
module.exports = {
  register,
  login,
  wechatMiniProgramLogin,
  forgotPassword,
  logout
};
