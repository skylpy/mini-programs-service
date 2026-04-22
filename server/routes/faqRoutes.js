const express = require('express');
const { getFaqs } = require('../controllers/faqController');

const router = express.Router();

// 接口：GET /，交给对应控制器处理请求。
router.get('/', getFaqs);

// 导出当前模块的核心能力。
module.exports = router;
