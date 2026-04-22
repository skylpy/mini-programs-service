const path = require('path');
const multer = require('multer');
const AppError = require('../utils/appError');
const { allowedUploadExtensions } = require('../utils/conversionSupport');
const { getUploadDir, sanitizeBaseName } = require('../utils/storage');

// 上传文件大小限制，单位为 MB。
const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB) || 20;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDir());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const baseName = sanitizeBaseName(file.originalname || 'file');
    cb(null, `${Date.now()}-${baseName}${ext}`);
  }
});

// 方法：fileFilter，负责当前模块中的具体处理逻辑。
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').replace('.', '').toLowerCase();

  if (!allowedUploadExtensions.includes(ext)) {
    cb(new AppError(`不支持的文件格式，仅支持：${allowedUploadExtensions.join('、')}`, 400));
    return;
  }

  cb(null, true);
};

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024
  },
  fileFilter
});

// 导出当前模块的核心能力。
module.exports = uploadMiddleware;
