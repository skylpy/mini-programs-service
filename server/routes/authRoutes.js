const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { register, login, wechatMiniProgramLogin, forgotPassword, logout } = require('../controllers/authController');

const router = express.Router();

// 接口：POST /register，交给对应控制器处理请求。
router.post('/register', register);
// 接口：POST /login，交给对应控制器处理请求。
router.post('/login', login);
// 接口：POST /wechat-mini-program/login，交给对应控制器处理请求。
router.post('/wechat-mini-program/login', wechatMiniProgramLogin);
// 接口：POST /forgot-password，交给对应控制器处理请求。
router.post('/forgot-password', forgotPassword);
// 接口：POST /logout，交给对应控制器处理请求。
router.post('/logout', authMiddleware, logout);

// 导出当前模块的核心能力。
module.exports = router;
