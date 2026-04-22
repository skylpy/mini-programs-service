const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// 方法：resolveStoragePath，负责当前模块中的具体处理逻辑。
const resolveStoragePath = (dir) => {
  return path.resolve(projectRoot, dir);
};

// 方法：ensureDirSync，负责当前模块中的具体处理逻辑。
const ensureDirSync = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

// 方法：toUnixPath，负责当前模块中的具体处理逻辑。
const toUnixPath = (value) => value.split(path.sep).join('/');

// 方法：getUploadDir，负责当前模块中的具体处理逻辑。
const getUploadDir = () => {
  const uploadDir = resolveStoragePath(process.env.UPLOAD_DIR || 'storage/uploads');
  ensureDirSync(uploadDir);
  return uploadDir;
};

// 方法：getConvertedDir，负责当前模块中的具体处理逻辑。
const getConvertedDir = () => {
  const convertedDir = resolveStoragePath(process.env.CONVERTED_DIR || 'storage/converted');
  ensureDirSync(convertedDir);
  return convertedDir;
};

// 方法：getPublicFileUrl，负责当前模块中的具体处理逻辑。
const getPublicFileUrl = (req, relativePath) => {
  const cleanedPath = `/${toUnixPath(relativePath).replace(/^\/+/, '')}`;
  const baseUrl = String(process.env.FILE_BASE_URL || '').trim();

  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, '')}${cleanedPath}`;
  }

  return `${req.protocol}://${req.get('host')}${cleanedPath}`;
};

// 方法：sanitizeBaseName，负责当前模块中的具体处理逻辑。
const sanitizeBaseName = (filename) => {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'file';
};

// 导出当前模块对外提供的方法集合。
module.exports = {
  ensureDirSync,
  getUploadDir,
  getConvertedDir,
  getPublicFileUrl,
  resolveStoragePath,
  sanitizeBaseName,
  toUnixPath
};
