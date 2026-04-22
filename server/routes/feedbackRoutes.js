const express = require('express');
const { createFeedback, getFeedbackList } = require('../controllers/feedbackController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// 接口：POST /，交给对应控制器处理请求。
router.post('/', authMiddleware, createFeedback);
// 接口：GET /，交给对应控制器处理请求。
router.get('/', authMiddleware, getFeedbackList);

// 导出当前模块的核心能力。
module.exports = router;
