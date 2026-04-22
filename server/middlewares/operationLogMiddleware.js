const OperationLog = require('../models/OperationLog');

const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'accesskeyid', 'accesskeysecret', 'signature', 'policy', 'securitytoken'];
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 20;
const MAX_DEPTH = 4;

// 方法：isSensitiveKey，负责识别敏感字段名。
const isSensitiveKey = (key) => {
  const normalizedKey = String(key || '').trim().toLowerCase();
  return SENSITIVE_KEYS.includes(normalizedKey);
};

// 方法：trimLongString，负责裁剪过长字符串，避免日志膨胀。
const trimLongString = (value) => {
  const normalizedValue = String(value);

  if (normalizedValue.length <= MAX_STRING_LENGTH) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, MAX_STRING_LENGTH)}...(truncated)`;
};

// 方法：sanitizeValue，负责清洗对象中的敏感信息和超长内容。
const sanitizeValue = (value, depth = 0) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return '[max-depth]';
  }

  if (typeof value === 'string') {
    return trimLongString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, currentValue]) => {
        if (isSensitiveKey(key)) {
          return [key, '[masked]'];
        }

        return [key, sanitizeValue(currentValue, depth + 1)];
      })
    );
  }

  return trimLongString(String(value));
};

// 方法：getModuleNameFromPath，负责根据路径推断所属模块。
const getModuleNameFromPath = (path) => {
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  const segments = normalizedPath.split('/').filter(Boolean);

  if (!segments.length) {
    return 'unknown';
  }

  if (segments[0] !== 'api') {
    return segments[0];
  }

  return segments[1] || 'api';
};

// 方法：getClientIp，负责提取请求来源 IP。
const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (forwardedFor) {
    return String(forwardedFor).split(',')[0].trim();
  }

  return String(req.ip || req.socket?.remoteAddress || '').trim();
};

// 方法：buildActorSnapshot，负责生成操作者快照。
const buildActorSnapshot = (user) => {
  if (!user) {
    return {
      id: '',
      username: '',
      mobile: '',
      role: ''
    };
  }

  return {
    id: String(user._id || user.id || ''),
    username: String(user.username || ''),
    mobile: String(user.mobile || ''),
    role: String(user.role || '')
  };
};

// 方法：persistOperationLog，负责异步落库单条日志。
const persistOperationLog = async (payload) => {
  try {
    await OperationLog.create(payload);
  } catch (error) {
    console.error('Operation log write failed:', error.message);
  }
};

// 方法：operationLogMiddleware，负责记录接口请求日志。
const operationLogMiddleware = (req, res, next) => {
  if (!req.originalUrl.startsWith('/api/')) {
    return next();
  }

  const startedAt = Date.now();
  const requestQuery = sanitizeValue(req.query || {});
  const requestBody = sanitizeValue(req.body || {});
  let logged = false;

  const writeLog = () => {
    if (logged) {
      return;
    }

    logged = true;

    const user = req.user || null;
    const actorType = user ? (user.role === 'admin' ? 'admin' : 'user') : 'guest';
    const responseMessage = String(res.locals.responseMessage || '').trim();
    const errorMessage = String(res.locals.errorMessage || '').trim();
    const responseData = sanitizeValue(res.locals.responseData);
    const statusCode = Number(res.statusCode) || 200;

    void persistOperationLog({
      actor: user ? user._id : null,
      actorType,
      actorSnapshot: buildActorSnapshot(user),
      method: String(req.method || '').toUpperCase(),
      path: req.path || '',
      originalUrl: req.originalUrl || '',
      module: getModuleNameFromPath(req.path || req.originalUrl || ''),
      ip: getClientIp(req),
      userAgent: trimLongString(req.headers['user-agent'] || ''),
      query: requestQuery,
      body: requestBody,
      statusCode,
      success: statusCode >= 200 && statusCode < 400,
      responseMessage,
      responseData,
      errorMessage,
      durationMs: Date.now() - startedAt
    });
  };

  res.on('finish', writeLog);
  res.on('close', writeLog);

  next();
};

// 导出当前模块对外提供的方法集合。
module.exports = operationLogMiddleware;
