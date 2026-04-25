const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const multer = require('multer');
const path = require('path');
const {
  getConversionSupport,
  createConversion,
  createConversionByUrl,
  downloadConvertedFile,
  imageToPdfConversion,
  getConversionPreview,
  getConversionResult,
  getConversionPdfUrl,
  getOssSts
} = require('../controllers/conversionController');
const AppError = require('../utils/appError');
const { ensureDirSync, resolveStoragePath, sanitizeBaseName } = require('../utils/storage');

const router = express.Router();
const imageToPdfTempDir = resolveStoragePath('uploads/temp');

ensureDirSync(imageToPdfTempDir);

const imageToPdfUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, imageToPdfTempDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const baseName = sanitizeBaseName(file.originalname || 'image');
      cb(null, `${Date.now()}-${baseName}${ext}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 9
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    if (!allowedMimeTypes.includes(String(file.mimetype || '').toLowerCase())) {
      cb(new AppError('仅支持 JPG、JPEG、PNG、WEBP 图片', 400));
      return;
    }

    cb(null, true);
  }
});

// 接口：GET /support，交给对应控制器处理请求。
router.get('/support', getConversionSupport);
// 接口：GET /oss-sts，交给对应控制器处理请求。
router.get('/oss-sts', authMiddleware, getOssSts);
// 接口：POST /image-to-pdf，交给对应控制器处理请求。
router.post('/image-to-pdf', optionalAuthMiddleware, imageToPdfUpload.array('images', 9), imageToPdfConversion);
// 接口：POST /create-by-url，交给对应控制器处理请求。
router.post('/create-by-url', authMiddleware, createConversionByUrl);
// 接口：POST /，交给对应控制器处理请求。
router.post('/', authMiddleware, uploadMiddleware.single('file'), createConversion);
// 接口：GET /:id/pdf-url，交给对应控制器处理请求。
router.get('/:id/pdf-url', authMiddleware, getConversionPdfUrl);
// 接口：GET /:id/result，交给对应控制器处理请求。
router.get('/:id/result', authMiddleware, getConversionResult);
// 接口：GET /:id/preview，交给对应控制器处理请求。
router.get('/:id/preview', authMiddleware, getConversionPreview);
// 接口：GET /:id/download，交给对应控制器处理请求。
router.get('/:id/download', authMiddleware, downloadConvertedFile);

// 导出当前模块的核心能力。
module.exports = router;
