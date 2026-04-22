const express = require('express');
const { getProfile, updateProfile, updatePassword } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// 接口：GET /profile，交给对应控制器处理请求。
router.get('/profile', authMiddleware, getProfile);
// 接口：PUT /profile，交给对应控制器处理请求。
router.put('/profile', authMiddleware, updateProfile);
// 接口：PUT /password，交给对应控制器处理请求。
router.put('/password', authMiddleware, updatePassword);

// 导出当前模块的核心能力。
module.exports = router;
