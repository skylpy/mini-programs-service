const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const {
  getConversionSupport,
  createConversion,
  createConversionByUrl,
  downloadConvertedFile,
  getConversionPreview,
  getConversionResult,
  getConversionPdfUrl,
  getOssSts
} = require('../controllers/conversionController');

const router = express.Router();

// 接口：GET /support，交给对应控制器处理请求。
router.get('/support', getConversionSupport);
// 接口：GET /oss-sts，交给对应控制器处理请求。
router.get('/oss-sts', authMiddleware, getOssSts);
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
