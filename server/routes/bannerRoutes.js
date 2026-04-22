const express = require('express');
const { getBanners } = require('../controllers/bannerController');

const router = express.Router();

// 接口：GET /，交给对应控制器处理请求。
router.get('/', getBanners);

// 导出当前模块的核心能力。
module.exports = router;
