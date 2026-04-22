const express = require('express');
const {
  createBrowseHistory,
  getBrowseHistory
} = require('../controllers/browseHistoryController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// 接口：POST /，交给对应控制器处理请求。
router.post('/', authMiddleware, createBrowseHistory);
// 接口：GET /，交给对应控制器处理请求。
router.get('/', authMiddleware, getBrowseHistory);

// 导出当前模块的核心能力。
module.exports = router;
