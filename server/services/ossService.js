const crypto = require('crypto');
const fs = require('fs');
const OSS = require('ali-oss');
const AppError = require('../utils/appError');

const DEFAULT_OSS_CONFIG = {
  region: 'oss-cn-shenzhen',
  endpoint: 'https://oss-cn-shenzhen.aliyuncs.com',
  bucket: 'doc-converter-pdf',
  pdfDir: 'pdf',
  resultDir: 'result',
  sourceDir: 'source',
  signExpire: 900,
  useSignedUrl: true,
  accessKeyId: 'YOUR_NEW_ACCESS_KEY_ID',
  accessKeySecret: 'YOUR_NEW_ACCESS_KEY_SECRET'
};

// 方法：normalizeBoolean，负责统一解析布尔环境变量。
const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

// 方法：normalizeOssKey，负责统一处理 OSS 对象 key。
const normalizeOssKey = (ossKey) => {
  return String(ossKey || '')
    .trim()
    .replace(/^\/+/, '');
};

// 方法：ensureTrailingSlash，负责统一补齐目录尾部斜杠。
const ensureTrailingSlash = (dir) => {
  const normalizedDir = normalizeOssKey(dir);

  if (!normalizedDir) {
    return '';
  }

  return normalizedDir.endsWith('/') ? normalizedDir : `${normalizedDir}/`;
};

// 方法：getMaxFileSizeBytes，负责读取上传文件大小限制。
const getMaxFileSizeBytes = () => {
  const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB) || 20;
  return maxFileSizeMb * 1024 * 1024;
};

// 方法：resolvePostUploadDir，负责确保表单上传目录固定在 source/ 下。
const resolvePostUploadDir = (dirPrefix, sourceDir) => {
  const normalizedSourceDir = normalizeOssKey(sourceDir);
  const normalizedDirPrefix = normalizeOssKey(dirPrefix);

  if (!normalizedSourceDir) {
    throw new AppError('OSS_SOURCE_DIR 未配置，无法生成上传目录', 500);
  }

  if (!normalizedDirPrefix) {
    return ensureTrailingSlash(normalizedSourceDir);
  }

  if (
    normalizedDirPrefix === normalizedSourceDir ||
    normalizedDirPrefix.startsWith(`${normalizedSourceDir}/`)
  ) {
    return ensureTrailingSlash(normalizedDirPrefix);
  }

  return ensureTrailingSlash(`${normalizedSourceDir}/${normalizedDirPrefix}`);
};

// 方法：getOssConfig，负责读取 OSS 配置。
const getOssConfig = () => {
  return {
    region: String(process.env.OSS_REGION || DEFAULT_OSS_CONFIG.region).trim(),
    endpoint: String(process.env.OSS_ENDPOINT || DEFAULT_OSS_CONFIG.endpoint).trim(),
    bucket: String(process.env.OSS_BUCKET || DEFAULT_OSS_CONFIG.bucket).trim(),
    pdfDir: normalizeOssKey(process.env.OSS_PDF_DIR || DEFAULT_OSS_CONFIG.pdfDir),
    resultDir: normalizeOssKey(process.env.OSS_RESULT_DIR || DEFAULT_OSS_CONFIG.resultDir),
    sourceDir: normalizeOssKey(process.env.OSS_SOURCE_DIR || DEFAULT_OSS_CONFIG.sourceDir),
    signExpire: Number(process.env.OSS_SIGN_EXPIRE || DEFAULT_OSS_CONFIG.signExpire) || DEFAULT_OSS_CONFIG.signExpire,
    useSignedUrl: normalizeBoolean(process.env.OSS_USE_SIGNED_URL, DEFAULT_OSS_CONFIG.useSignedUrl),
    accessKeyId: String(process.env.OSS_ACCESS_KEY_ID || DEFAULT_OSS_CONFIG.accessKeyId).trim(),
    accessKeySecret: String(process.env.OSS_ACCESS_KEY_SECRET || DEFAULT_OSS_CONFIG.accessKeySecret).trim()
  };
};

// 方法：assertOssCredentials，负责校验 OSS 凭证是否已正确配置。
const assertOssCredentials = (config) => {
  if (!config.accessKeyId || !config.accessKeySecret) {
    throw new AppError('OSS 凭证未配置，请检查 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET', 500);
  }

  if (
    config.accessKeyId === DEFAULT_OSS_CONFIG.accessKeyId ||
    config.accessKeySecret === DEFAULT_OSS_CONFIG.accessKeySecret
  ) {
    throw new AppError('OSS 凭证仍为占位值，请先在环境变量中配置真实密钥', 500);
  }
};

// 方法：createClient，负责创建 ali-oss 客户端实例。
const createClient = () => {
  const config = getOssConfig();
  assertOssCredentials(config);

  return new OSS({
    region: config.region,
    endpoint: config.endpoint,
    bucket: config.bucket,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret
  });
};

// 方法：encodeOssKeyForUrl，负责生成可直接访问的 URL 路径片段。
const encodeOssKeyForUrl = (ossKey) => {
  return normalizeOssKey(ossKey)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
};

// 方法：getObjectKeyFromUrl，负责从 OSS URL 中提取对象 key。
const getObjectKeyFromUrl = (url) => {
  if (!url || !String(url).trim()) {
    throw new AppError('sourceUrl 不能为空');
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(String(url).trim());
  } catch (error) {
    throw new AppError('sourceUrl 格式不正确');
  }

  const config = getOssConfig();
  const pathname = decodeURIComponent(parsedUrl.pathname || '');
  const leadingPath = pathname.replace(/^\/+/, '');

  if (!leadingPath) {
    throw new AppError('sourceUrl 中未包含 OSS 对象路径');
  }

  if (parsedUrl.hostname === `${config.bucket}.${new URL(config.endpoint).hostname}`) {
    return normalizeOssKey(leadingPath);
  }

  if (leadingPath.startsWith(`${config.bucket}/`)) {
    return normalizeOssKey(leadingPath.slice(config.bucket.length + 1));
  }

  return normalizeOssKey(leadingPath);
};

// 方法：uploadFile，负责将本地文件上传到 OSS。
const uploadFile = async (localPath, ossKey) => {
  const normalizedKey = normalizeOssKey(ossKey);

  if (!normalizedKey) {
    throw new AppError('ossKey 不能为空');
  }

  const client = createClient();
  await client.put(normalizedKey, localPath);

  return {
    ossKey: normalizedKey
  };
};

// 方法：uploadFileToOSS，负责上传文件并返回 OSS 访问地址。
const uploadFileToOSS = async (localPath, ossPath) => {
  const { ossKey } = await uploadFile(localPath, ossPath);

  return {
    url: getFileUrl(ossKey),
    name: normalizeOssKey(ossKey).split('/').pop() || '',
    ossKey
  };
};

// 方法：downloadByKey，负责通过 OSS key 下载文件到本地。
const downloadByKey = async (ossKey, localPath) => {
  const normalizedKey = normalizeOssKey(ossKey);

  if (!normalizedKey) {
    throw new AppError('sourceKey 不能为空');
  }

  const client = createClient();
  await client.get(normalizedKey, localPath);

  return {
    ossKey: normalizedKey,
    localPath
  };
};

// 方法：downloadByUrl，负责通过 OSS URL 下载文件到本地。
const downloadByUrl = async (url, localPath) => {
  const ossKey = getObjectKeyFromUrl(url);
  await downloadByKey(ossKey, localPath);

  return {
    ossKey,
    localPath
  };
};

// 方法：getSignedUrl，负责生成 OSS 签名下载链接。
const getSignedUrl = (ossKey, expiresSeconds) => {
  const normalizedKey = normalizeOssKey(ossKey);

  if (!normalizedKey) {
    throw new AppError('ossKey 不能为空');
  }

  const client = createClient();
  return client.signatureUrl(normalizedKey, {
    expires: Number(expiresSeconds) || getOssConfig().signExpire
  });
};

// 方法：getPublicUrl，负责生成 OSS 公网访问链接。
const getPublicUrl = (ossKey) => {
  const normalizedKey = normalizeOssKey(ossKey);

  if (!normalizedKey) {
    throw new AppError('ossKey 不能为空');
  }

  const config = getOssConfig();
  const endpointUrl = new URL(config.endpoint);
  const host = endpointUrl.hostname.startsWith(`${config.bucket}.`)
    ? endpointUrl.hostname
    : `${config.bucket}.${endpointUrl.hostname}`;

  return `${endpointUrl.protocol}//${host}/${encodeOssKeyForUrl(normalizedKey)}`;
};

// 方法：getFileUrl，负责按配置返回签名链接或公网链接。
const getFileUrl = (ossKey, expiresSeconds) => {
  const config = getOssConfig();

  if (config.useSignedUrl) {
    return getSignedUrl(ossKey, expiresSeconds || config.signExpire);
  }

  return getPublicUrl(ossKey);
};

// 方法：getUploadHost，负责返回前端表单上传使用的 host。
const getUploadHost = () => {
  const config = getOssConfig();
  const endpointUrl = new URL(config.endpoint);
  const host = endpointUrl.hostname.startsWith(`${config.bucket}.`)
    ? endpointUrl.hostname
    : `${config.bucket}.${endpointUrl.hostname}`;

  return `${endpointUrl.protocol}//${host}`;
};

// 方法：buildPostPolicy，负责生成 OSS 表单直传 policy。
const buildPostPolicy = ({ dir, expireAt }) => {
  const policyObject = {
    expiration: new Date(expireAt).toISOString(),
    conditions: [
      ['starts-with', '$key', ensureTrailingSlash(dir)],
      ['content-length-range', 0, getMaxFileSizeBytes()]
    ]
  };

  return Buffer.from(JSON.stringify(policyObject)).toString('base64');
};

// 方法：signPostPolicy，负责生成 OSS 表单直传签名。
const signPostPolicy = (policy, accessKeySecret) => {
  return crypto.createHmac('sha1', accessKeySecret).update(policy).digest('base64');
};

// 方法：getOssPostSignatureData，负责生成前端直传 OSS 所需参数。
const getOssPostSignatureData = (dirPrefix) => {
  const config = getOssConfig();
  assertOssCredentials(config);

  const normalizedDir = resolvePostUploadDir(dirPrefix, config.sourceDir);
  const expireSeconds = Number(config.signExpire) || DEFAULT_OSS_CONFIG.signExpire;
  const expireAt = Date.now() + expireSeconds * 1000;
  const policy = buildPostPolicy({
    dir: normalizedDir,
    expireAt
  });
  const signature = signPostPolicy(policy, config.accessKeySecret);

  return {
    accessKeyId: config.accessKeyId,
    policy,
    signature,
    expire: Math.floor(expireAt / 1000),
    dir: normalizedDir,
    host: getUploadHost(),
    bucket: config.bucket,
    region: config.region
  };
};

// 方法：getPostSignatureData，负责兼容旧调用方式。
const getPostSignatureData = (dirPrefix) => {
  return getOssPostSignatureData(dirPrefix);
};

// 方法：deleteLocalFile，负责删除本地临时文件。
const deleteLocalFile = async (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    await fs.promises.rm(filePath, { recursive: true, force: true });
  } catch (error) {
    console.warn('[ossService] delete local file failed:', filePath, error.message);
  }
};

// 导出当前模块对外提供的方法集合。
module.exports = {
  DEFAULT_OSS_CONFIG,
  createClient,
  deleteLocalFile,
  downloadByKey,
  downloadByUrl,
  getFileUrl,
  getObjectKeyFromUrl,
  getOssConfig,
  getOssPostSignatureData,
  getPostSignatureData,
  getPublicUrl,
  getSignedUrl,
  normalizeOssKey,
  uploadFileToOSS,
  uploadFile
};
