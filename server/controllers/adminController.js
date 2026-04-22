const mongoose = require('mongoose');
const User = require('../models/User');
const Banner = require('../models/Banner');
const Faq = require('../models/Faq');
const Template = require('../models/Template');
const ServiceConfig = require('../models/ServiceConfig');
const Feedback = require('../models/Feedback');
const Record = require('../models/Record');
const OperationLog = require('../models/OperationLog');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { generateToken } = require('../utils/jwt');
const { isValidEmail, parsePagination } = require('../utils/validators');

// 后台允许设置的用户角色枚举。
const USER_ROLES = ['user', 'admin'];
// 后台允许设置的用户状态枚举。
const USER_STATUSES = ['active', 'disabled'];
// 后台允许设置的反馈处理状态枚举。
const FEEDBACK_STATUSES = ['pending', 'processed'];
// 后台允许筛选的操作日志操作者类型。
const OPERATION_LOG_ACTOR_TYPES = ['guest', 'user', 'admin'];

// 方法：escapeRegExp，负责当前模块中的具体处理逻辑。
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 方法：buildKeywordRegex，负责当前模块中的具体处理逻辑。
const buildKeywordRegex = (value) => new RegExp(escapeRegExp(String(value).trim()), 'i');

// 方法：parseBooleanInput，负责当前模块中的具体处理逻辑。
const parseBooleanInput = (value, fieldName = 'status') => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['true', '1'].includes(normalized)) {
    return true;
  }

  if (['false', '0'].includes(normalized)) {
    return false;
  }

  throw new AppError(`${fieldName} 必须是布尔值`);
};

// 方法：parseNumberInput，负责当前模块中的具体处理逻辑。
const parseNumberInput = (value, fieldName = 'sort') => {
  if (value === undefined) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    throw new AppError(`${fieldName} 必须是数字`);
  }

  return parsedValue;
};

// 方法：ensureObjectId，负责当前模块中的具体处理逻辑。
const ensureObjectId = (id, fieldName = 'id') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`${fieldName} 无效`);
  }
};

// 方法：formatAdminUser，负责当前模块中的具体处理逻辑。
const formatAdminUser = (user) => ({
  id: user._id || user.id,
  username: user.username,
  mobile: user.mobile,
  email: user.email,
  avatar: user.avatar,
  role: user.role || 'user',
  status: user.status || 'active',
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// 方法：formatOperationLog，负责统一输出操作日志结构。
const formatOperationLog = (log) => ({
  _id: log._id,
  actor: log.actor,
  actorType: log.actorType || 'guest',
  actorSnapshot: log.actorSnapshot || {
    id: '',
    username: '',
    mobile: '',
    role: ''
  },
  method: log.method || '',
  path: log.path || '',
  originalUrl: log.originalUrl || '',
  module: log.module || '',
  ip: log.ip || '',
  userAgent: log.userAgent || '',
  query: log.query || {},
  body: log.body || {},
  statusCode: log.statusCode || 0,
  success: Boolean(log.success),
  responseMessage: log.responseMessage || '',
  responseData: log.responseData ?? null,
  errorMessage: log.errorMessage || '',
  durationMs: log.durationMs || 0,
  createdAt: log.createdAt,
  updatedAt: log.updatedAt
});

// 方法：buildBannerPayload，负责当前模块中的具体处理逻辑。
const buildBannerPayload = (body, isCreate = false) => {
  const payload = {};

  if (body.title !== undefined) {
    if (!String(body.title).trim()) {
      throw new AppError('title 不能为空');
    }
    payload.title = String(body.title).trim();
  } else if (isCreate) {
    throw new AppError('title 必填');
  }

  if (body.image !== undefined) {
    if (!String(body.image).trim()) {
      throw new AppError('image 不能为空');
    }
    payload.image = String(body.image).trim();
  } else if (isCreate) {
    throw new AppError('image 必填');
  }

  if (body.link !== undefined) {
    payload.link = String(body.link).trim();
  }

  const sort = parseNumberInput(body.sort);
  if (sort !== undefined) {
    payload.sort = sort;
  }

  const status = parseBooleanInput(body.status);
  if (status !== undefined) {
    payload.status = status;
  }

  return payload;
};

// 方法：buildFaqPayload，负责当前模块中的具体处理逻辑。
const buildFaqPayload = (body, isCreate = false) => {
  const payload = {};

  if (body.question !== undefined) {
    if (!String(body.question).trim()) {
      throw new AppError('question 不能为空');
    }
    payload.question = String(body.question).trim();
  } else if (isCreate) {
    throw new AppError('question 必填');
  }

  if (body.answer !== undefined) {
    if (!String(body.answer).trim()) {
      throw new AppError('answer 不能为空');
    }
    payload.answer = String(body.answer).trim();
  } else if (isCreate) {
    throw new AppError('answer 必填');
  }

  const sort = parseNumberInput(body.sort);
  if (sort !== undefined) {
    payload.sort = sort;
  }

  const status = parseBooleanInput(body.status);
  if (status !== undefined) {
    payload.status = status;
  }

  return payload;
};

// 方法：buildTemplatePayload，负责当前模块中的具体处理逻辑。
const buildTemplatePayload = (body, isCreate = false) => {
  const payload = {};

  if (body.title !== undefined) {
    if (!String(body.title).trim()) {
      throw new AppError('title 不能为空');
    }
    payload.title = String(body.title).trim();
  } else if (isCreate) {
    throw new AppError('title 必填');
  }

  if (body.category !== undefined) {
    if (!String(body.category).trim()) {
      throw new AppError('category 不能为空');
    }
    payload.category = String(body.category).trim();
  } else if (isCreate) {
    throw new AppError('category 必填');
  }

  if (body.description !== undefined) {
    payload.description = String(body.description).trim();
  }

  if (body.cover !== undefined) {
    payload.cover = String(body.cover).trim();
  }

  if (body.downloadUrl !== undefined) {
    payload.downloadUrl = String(body.downloadUrl).trim();
  }

  const sort = parseNumberInput(body.sort);
  if (sort !== undefined) {
    payload.sort = sort;
  }

  const status = parseBooleanInput(body.status);
  if (status !== undefined) {
    payload.status = status;
  }

  return payload;
};

// 方法：buildServicePayload，负责当前模块中的具体处理逻辑。
const buildServicePayload = (body) => {
  const payload = {};

  if (body.name !== undefined) {
    if (!String(body.name).trim()) {
      throw new AppError('name 不能为空');
    }
    payload.name = String(body.name).trim();
  }

  if (body.wechat !== undefined) {
    payload.wechat = String(body.wechat).trim();
  }

  if (body.email !== undefined) {
    const emailValue = String(body.email).trim();
    if (emailValue && !isValidEmail(emailValue)) {
      throw new AppError('email 格式不正确');
    }
    payload.email = emailValue;
  }

  if (body.workingHours !== undefined) {
    payload.workingHours = String(body.workingHours).trim();
  }

  const status = parseBooleanInput(body.status);
  if (status !== undefined) {
    payload.status = status;
  }

  return payload;
};

// 方法：adminLogin，负责当前接口的业务处理。
const adminLogin = asyncHandler(async (req, res) => {
  const { account, password } = req.body;

  if (!account || !password) {
    throw new AppError('account 和 password 必填');
  }

  const accountValue = String(account).trim();
  const user = await User.findOne({
    role: 'admin',
    isDeleted: false,
    $or: [{ mobile: accountValue }, { username: accountValue }, { email: accountValue }]
  });

  if (!user) {
    throw new AppError('管理员账号或密码错误', 401);
  }

  if (user.status !== 'active') {
    throw new AppError('管理员账号已被禁用', 403);
  }

  const isMatch = await user.comparePassword(String(password));

  if (!isMatch) {
    throw new AppError('管理员账号或密码错误', 401);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken({
    id: user._id,
    role: user.role,
    tokenVersion: user.tokenVersion || 0
  });

  return sendSuccess(
    res,
    {
      token,
      user: user.toSafeObject({
        includeRole: true,
        includeStatus: true,
        includeLastLoginAt: true
      })
    },
    '登录成功'
  );
});

// 方法：getAdminProfile，负责当前接口的业务处理。
const getAdminProfile = asyncHandler(async (req, res) => {
  return sendSuccess(
    res,
    req.user.toSafeObject({
      includeRole: true,
      includeStatus: true,
      includeLastLoginAt: true
    })
  );
});

// 方法：getDashboard，负责当前接口的业务处理。
const getDashboard = asyncHandler(async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 通过并行查询一次性汇总首页所需的统计数据和最近动态，减少后台首屏等待时间。
  const [userStats, recordStats, feedbackStats, bannerCount, faqCount, templateCount, recentUsers, recentRecords, recentFeedbacks] =
    await Promise.all([
      User.aggregate([
        {
          $match: {
            isDeleted: false
          }
        },
        {
          $group: {
            _id: null,
            totalUsers: {
              $sum: {
                $cond: [{ $eq: ['$role', 'user'] }, 1, 0]
              }
            },
            activeUsers: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $eq: ['$role', 'user'] }, { $eq: ['$status', 'active'] }]
                  },
                  1,
                  0
                ]
              }
            },
            adminUsers: {
              $sum: {
                $cond: [{ $eq: ['$role', 'admin'] }, 1, 0]
              }
            }
          }
        }
      ]),
      Record.aggregate([
        {
          $match: {
            isDeleted: false
          }
        },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            successRecords: {
              $sum: {
                $cond: [{ $eq: ['$status', 'success'] }, 1, 0]
              }
            },
            failedRecords: {
              $sum: {
                $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
              }
            },
            processingRecords: {
              $sum: {
                $cond: [{ $eq: ['$status', 'processing'] }, 1, 0]
              }
            },
            todayRecords: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', todayStart] }, 1, 0]
              }
            }
          }
        }
      ]),
      Feedback.aggregate([
        {
          $match: {
            isDeleted: false
          }
        },
        {
          $group: {
            _id: null,
            totalFeedbacks: { $sum: 1 },
            pendingFeedbacks: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
              }
            },
            processedFeedbacks: {
              $sum: {
                $cond: [{ $eq: ['$status', 'processed'] }, 1, 0]
              }
            }
          }
        }
      ]),
      Banner.countDocuments({ isDeleted: false, status: true }),
      Faq.countDocuments({ isDeleted: false, status: true }),
      Template.countDocuments({ isDeleted: false, status: true }),
      User.find({ isDeleted: false, role: 'user' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('-password')
        .lean(),
      Record.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'username mobile')
        .lean(),
      Feedback.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'username mobile')
        .populate('processedBy', 'username mobile')
        .lean()
    ]);

  return sendSuccess(res, {
    overview: {
      users: userStats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        adminUsers: 0
      },
      records: recordStats[0] || {
        totalRecords: 0,
        successRecords: 0,
        failedRecords: 0,
        processingRecords: 0,
        todayRecords: 0
      },
      feedbacks: feedbackStats[0] || {
        totalFeedbacks: 0,
        pendingFeedbacks: 0,
        processedFeedbacks: 0
      },
      contents: {
        activeBanners: bannerCount,
        activeFaqs: faqCount,
        activeTemplates: templateCount
      }
    },
    recent: {
      users: recentUsers.map(formatAdminUser),
      records: recentRecords,
      feedbacks: recentFeedbacks
    }
  });
});

// 方法：getAdminUsers，负责当前接口的业务处理。
const getAdminUsers = asyncHandler(async (req, res) => {
  const { page, pageSize, skip } = parsePagination(req.query);
  const { keyword, role, status } = req.query;
  const query = {
    isDeleted: false
  };

  if (role) {
    if (!USER_ROLES.includes(String(role).trim())) {
      throw new AppError('role 参数无效');
    }
    query.role = String(role).trim();
  }

  if (status) {
    if (!USER_STATUSES.includes(String(status).trim())) {
      throw new AppError('status 参数无效');
    }
    query.status = String(status).trim();
  }

  if (keyword && String(keyword).trim()) {
    const keywordRegex = buildKeywordRegex(keyword);
    query.$or = [
      { username: keywordRegex },
      { mobile: keywordRegex },
      { email: keywordRegex }
    ];
  }

  const [list, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select('-password')
      .lean(),
    User.countDocuments(query)
  ]);

  return sendSuccess(res, {
    list: list.map(formatAdminUser),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

// 方法：getAdminUserDetail，负责当前接口的业务处理。
const getAdminUserDetail = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const user = await User.findOne({
    _id: req.params.id,
    isDeleted: false
  })
    .select('-password')
    .lean();

  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  return sendSuccess(res, formatAdminUser(user));
});

// 方法：updateAdminUser，负责当前接口的业务处理。
const updateAdminUser = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const user = await User.findOne({
    _id: req.params.id,
    isDeleted: false
  });

  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  const { username, email, avatar, role, status } = req.body;

  if (username !== undefined) {
    if (!String(username).trim()) {
      throw new AppError('username 不能为空');
    }
    user.username = String(username).trim();
  }

  if (email !== undefined) {
    const emailValue = String(email).trim();

    if (emailValue && !isValidEmail(emailValue)) {
      throw new AppError('email 格式不正确');
    }

    if (emailValue) {
      const existingUser = await User.findOne({
        _id: { $ne: user._id },
        email: emailValue,
        isDeleted: false
      });

      if (existingUser) {
        throw new AppError('邮箱已被使用');
      }
    }

    user.email = emailValue;
  }

  if (avatar !== undefined) {
    user.avatar = String(avatar).trim();
  }

  if (role !== undefined) {
    const nextRole = String(role).trim();

    if (!USER_ROLES.includes(nextRole)) {
      throw new AppError('role 参数无效');
    }

    // 防止当前登录管理员把自己降级，避免后台权限被误取消。
    if (String(req.user._id) === String(user._id) && nextRole !== 'admin') {
      throw new AppError('不能取消当前登录管理员的后台权限');
    }

    user.role = nextRole;
  }

  if (status !== undefined) {
    const nextStatus = String(status).trim();

    if (!USER_STATUSES.includes(nextStatus)) {
      throw new AppError('status 参数无效');
    }

    // 防止当前登录管理员把自己禁用，避免后台被锁死。
    if (String(req.user._id) === String(user._id) && nextStatus !== 'active') {
      throw new AppError('不能禁用当前登录管理员');
    }

    user.status = nextStatus;
  }

  await user.save();

  return sendSuccess(
    res,
    user.toSafeObject({
      includeRole: true,
      includeStatus: true,
      includeLastLoginAt: true
    }),
    '更新成功'
  );
});

// 方法：getAdminRecords，负责当前接口的业务处理。
const getAdminRecords = asyncHandler(async (req, res) => {
  const { page, pageSize, skip } = parsePagination(req.query);
  const { status, toolType, userId, keyword } = req.query;
  const query = {
    isDeleted: false
  };

  if (status) {
    query.status = String(status).trim();
  }

  if (toolType) {
    query.toolType = String(toolType).trim();
  }

  if (userId) {
    ensureObjectId(userId, 'userId');
    query.user = userId;
  }

  if (keyword && String(keyword).trim()) {
    const keywordRegex = buildKeywordRegex(keyword);
    query.$or = [
      { toolType: keywordRegex },
      { sourceFileName: keywordRegex },
      { targetFileName: keywordRegex },
      { errorMessage: keywordRegex }
    ];
  }

  const [list, total] = await Promise.all([
    Record.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('user', 'username mobile')
      .lean(),
    Record.countDocuments(query)
  ]);

  return sendSuccess(res, {
    list,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

// 方法：getAdminOperationLogs，负责当前接口的业务处理。
const getAdminOperationLogs = asyncHandler(async (req, res) => {
  const { page, pageSize, skip } = parsePagination(req.query);
  const { keyword, method, actorType, statusCode, success, module } = req.query;
  const query = {};

  if (method) {
    query.method = String(method).trim().toUpperCase();
  }

  if (actorType) {
    const normalizedActorType = String(actorType).trim();

    if (!OPERATION_LOG_ACTOR_TYPES.includes(normalizedActorType)) {
      throw new AppError('actorType 参数无效');
    }

    query.actorType = normalizedActorType;
  }

  if (statusCode !== undefined && statusCode !== '') {
    const normalizedStatusCode = Number(statusCode);

    if (Number.isNaN(normalizedStatusCode)) {
      throw new AppError('statusCode 参数无效');
    }

    query.statusCode = normalizedStatusCode;
  }

  if (success !== undefined && success !== '') {
    query.success = parseBooleanInput(success, 'success');
  }

  if (module) {
    query.module = String(module).trim();
  }

  if (keyword && String(keyword).trim()) {
    const keywordRegex = buildKeywordRegex(keyword);
    query.$or = [
      { path: keywordRegex },
      { originalUrl: keywordRegex },
      { ip: keywordRegex },
      { responseMessage: keywordRegex },
      { errorMessage: keywordRegex },
      { 'actorSnapshot.username': keywordRegex },
      { 'actorSnapshot.mobile': keywordRegex }
    ];
  }

  const [list, total] = await Promise.all([
    OperationLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    OperationLog.countDocuments(query)
  ]);

  return sendSuccess(res, {
    list: list.map(formatOperationLog),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

// 方法：getAdminFeedbacks，负责当前接口的业务处理。
const getAdminFeedbacks = asyncHandler(async (req, res) => {
  const { page, pageSize, skip } = parsePagination(req.query);
  const { status, userId, keyword } = req.query;
  const query = {
    isDeleted: false
  };

  if (status) {
    if (!FEEDBACK_STATUSES.includes(String(status).trim())) {
      throw new AppError('status 参数无效');
    }
    query.status = String(status).trim();
  }

  if (userId) {
    ensureObjectId(userId, 'userId');
    query.user = userId;
  }

  if (keyword && String(keyword).trim()) {
    const keywordRegex = buildKeywordRegex(keyword);
    query.$or = [{ content: keywordRegex }, { contact: keywordRegex }, { reply: keywordRegex }];
  }

  const [list, total] = await Promise.all([
    Feedback.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('user', 'username mobile')
      .populate('processedBy', 'username mobile')
      .lean(),
    Feedback.countDocuments(query)
  ]);

  return sendSuccess(res, {
    list,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

// 方法：updateAdminFeedback，负责当前接口的业务处理。
const updateAdminFeedback = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const feedback = await Feedback.findOne({
    _id: req.params.id,
    isDeleted: false
  });

  if (!feedback) {
    throw new AppError('反馈不存在', 404);
  }

  const { status, reply } = req.body;

  if (status !== undefined) {
    const nextStatus = String(status).trim();

    if (!FEEDBACK_STATUSES.includes(nextStatus)) {
      throw new AppError('status 参数无效');
    }

    feedback.status = nextStatus;
    feedback.processedAt = nextStatus === 'processed' ? new Date() : null;
    feedback.processedBy = nextStatus === 'processed' ? req.user._id : null;
  }

  if (reply !== undefined) {
    feedback.reply = String(reply).trim();
  }

  if (feedback.reply && feedback.status === 'pending') {
    feedback.status = 'processed';
    feedback.processedAt = new Date();
    feedback.processedBy = req.user._id;
  }

  await feedback.save();

  const updatedFeedback = await Feedback.findById(feedback._id)
    .populate('user', 'username mobile')
    .populate('processedBy', 'username mobile')
    .lean();

  return sendSuccess(res, updatedFeedback, '更新成功');
});

// 方法：getAdminBanners，负责当前接口的业务处理。
const getAdminBanners = asyncHandler(async (req, res) => {
  const list = await Banner.find({ isDeleted: false })
    .sort({ sort: 1, createdAt: -1 })
    .lean();

  return sendSuccess(res, list);
});

// 方法：createAdminBanner，负责当前接口的业务处理。
const createAdminBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.create(buildBannerPayload(req.body, true));

  return sendSuccess(res, banner, '创建成功', 0, 201);
});

// 方法：updateAdminBanner，负责当前接口的业务处理。
const updateAdminBanner = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const banner = await Banner.findOneAndUpdate(
    {
      _id: req.params.id,
      isDeleted: false
    },
    buildBannerPayload(req.body),
    {
      new: true,
      runValidators: true
    }
  );

  if (!banner) {
    throw new AppError('Banner 不存在', 404);
  }

  return sendSuccess(res, banner, '更新成功');
});

// 方法：deleteAdminBanner，负责当前接口的业务处理。
const deleteAdminBanner = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const banner = await Banner.findOneAndUpdate(
    {
      _id: req.params.id,
      isDeleted: false
    },
    {
      isDeleted: true
    },
    {
      new: true
    }
  );

  if (!banner) {
    throw new AppError('Banner 不存在', 404);
  }

  return sendSuccess(res, banner, '删除成功');
});

// 方法：getAdminFaqs，负责当前接口的业务处理。
const getAdminFaqs = asyncHandler(async (req, res) => {
  const list = await Faq.find({ isDeleted: false })
    .sort({ sort: 1, createdAt: -1 })
    .lean();

  return sendSuccess(res, list);
});

// 方法：createAdminFaq，负责当前接口的业务处理。
const createAdminFaq = asyncHandler(async (req, res) => {
  const faq = await Faq.create(buildFaqPayload(req.body, true));

  return sendSuccess(res, faq, '创建成功', 0, 201);
});

// 方法：updateAdminFaq，负责当前接口的业务处理。
const updateAdminFaq = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const faq = await Faq.findOneAndUpdate(
    {
      _id: req.params.id,
      isDeleted: false
    },
    buildFaqPayload(req.body),
    {
      new: true,
      runValidators: true
    }
  );

  if (!faq) {
    throw new AppError('FAQ 不存在', 404);
  }

  return sendSuccess(res, faq, '更新成功');
});

// 方法：deleteAdminFaq，负责当前接口的业务处理。
const deleteAdminFaq = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const faq = await Faq.findOneAndUpdate(
    {
      _id: req.params.id,
      isDeleted: false
    },
    {
      isDeleted: true
    },
    {
      new: true
    }
  );

  if (!faq) {
    throw new AppError('FAQ 不存在', 404);
  }

  return sendSuccess(res, faq, '删除成功');
});

// 方法：getAdminTemplates，负责当前接口的业务处理。
const getAdminTemplates = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const query = {
    isDeleted: false
  };

  if (category && String(category).trim()) {
    query.category = String(category).trim();
  }

  const list = await Template.find(query)
    .sort({ sort: 1, createdAt: -1 })
    .lean();

  return sendSuccess(res, list);
});

// 方法：createAdminTemplate，负责当前接口的业务处理。
const createAdminTemplate = asyncHandler(async (req, res) => {
  const template = await Template.create(buildTemplatePayload(req.body, true));

  return sendSuccess(res, template, '创建成功', 0, 201);
});

// 方法：updateAdminTemplate，负责当前接口的业务处理。
const updateAdminTemplate = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const template = await Template.findOneAndUpdate(
    {
      _id: req.params.id,
      isDeleted: false
    },
    buildTemplatePayload(req.body),
    {
      new: true,
      runValidators: true
    }
  );

  if (!template) {
    throw new AppError('模板不存在', 404);
  }

  return sendSuccess(res, template, '更新成功');
});

// 方法：deleteAdminTemplate，负责当前接口的业务处理。
const deleteAdminTemplate = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const template = await Template.findOneAndUpdate(
    {
      _id: req.params.id,
      isDeleted: false
    },
    {
      isDeleted: true
    },
    {
      new: true
    }
  );

  if (!template) {
    throw new AppError('模板不存在', 404);
  }

  return sendSuccess(res, template, '删除成功');
});

// 方法：getAdminServiceConfig，负责当前接口的业务处理。
const getAdminServiceConfig = asyncHandler(async (req, res) => {
  const config = await ServiceConfig.findOne({ isDeleted: false })
    .sort({ updatedAt: -1 })
    .lean();

  return sendSuccess(res, config || {});
});

// 方法：updateAdminServiceConfig，负责当前接口的业务处理。
const updateAdminServiceConfig = asyncHandler(async (req, res) => {
  const payload = buildServicePayload(req.body);

  let config = await ServiceConfig.findOne({
    isDeleted: false
  }).sort({ updatedAt: -1 });

  if (!config) {
    if (!payload.name) {
      throw new AppError('name 必填');
    }
    config = await ServiceConfig.create(payload);
  } else {
    Object.assign(config, payload);
    await config.save();
  }

  return sendSuccess(res, config, '更新成功');
});

// 导出当前模块对外提供的方法集合。
module.exports = {
  adminLogin,
  getAdminProfile,
  getDashboard,
  getAdminUsers,
  getAdminUserDetail,
  updateAdminUser,
  getAdminRecords,
  getAdminOperationLogs,
  getAdminFeedbacks,
  updateAdminFeedback,
  getAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  getAdminFaqs,
  createAdminFaq,
  updateAdminFaq,
  deleteAdminFaq,
  getAdminTemplates,
  createAdminTemplate,
  updateAdminTemplate,
  deleteAdminTemplate,
  getAdminServiceConfig,
  updateAdminServiceConfig
};
