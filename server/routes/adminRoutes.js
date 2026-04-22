const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const {
  adminLogin,
  getAdminProfile,
  getDashboard,
  getAdminUsers,
  getAdminUserDetail,
  updateAdminUser,
  getAdminRecords,
  getAdminOperationLogs,
  getAdminFeedbacks,
  updateAdminFeedback,
  getAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  getAdminFaqs,
  createAdminFaq,
  updateAdminFaq,
  deleteAdminFaq,
  getAdminTemplates,
  createAdminTemplate,
  updateAdminTemplate,
  deleteAdminTemplate,
  getAdminServiceConfig,
  updateAdminServiceConfig
} = require('../controllers/adminController');

const router = express.Router();

// 接口：POST /auth/login，交给对应控制器处理请求。
router.post('/auth/login', adminLogin);

// 为后续路由统一挂载中间件。
router.use(authMiddleware, adminMiddleware);

// 接口：GET /profile，交给对应控制器处理请求。
router.get('/profile', getAdminProfile);
// 接口：GET /dashboard，交给对应控制器处理请求。
router.get('/dashboard', getDashboard);

// 接口：GET /users，交给对应控制器处理请求。
router.get('/users', getAdminUsers);
// 接口：GET /users/:id，交给对应控制器处理请求。
router.get('/users/:id', getAdminUserDetail);
// 接口：PATCH /users/:id，交给对应控制器处理请求。
router.patch('/users/:id', updateAdminUser);

// 接口：GET /records，交给对应控制器处理请求。
router.get('/records', getAdminRecords);
// 接口：GET /operation-logs，交给对应控制器处理请求。
router.get('/operation-logs', getAdminOperationLogs);

// 接口：GET /feedbacks，交给对应控制器处理请求。
router.get('/feedbacks', getAdminFeedbacks);
// 接口：PATCH /feedbacks/:id，交给对应控制器处理请求。
router.patch('/feedbacks/:id', updateAdminFeedback);

// 接口：GET /banners，交给对应控制器处理请求。
router.get('/banners', getAdminBanners);
// 接口：POST /banners，交给对应控制器处理请求。
router.post('/banners', createAdminBanner);
// 接口：PUT /banners/:id，交给对应控制器处理请求。
router.put('/banners/:id', updateAdminBanner);
// 接口：DELETE /banners/:id，交给对应控制器处理请求。
router.delete('/banners/:id', deleteAdminBanner);

// 接口：GET /faqs，交给对应控制器处理请求。
router.get('/faqs', getAdminFaqs);
// 接口：POST /faqs，交给对应控制器处理请求。
router.post('/faqs', createAdminFaq);
// 接口：PUT /faqs/:id，交给对应控制器处理请求。
router.put('/faqs/:id', updateAdminFaq);
// 接口：DELETE /faqs/:id，交给对应控制器处理请求。
router.delete('/faqs/:id', deleteAdminFaq);

// 接口：GET /templates，交给对应控制器处理请求。
router.get('/templates', getAdminTemplates);
// 接口：POST /templates，交给对应控制器处理请求。
router.post('/templates', createAdminTemplate);
// 接口：PUT /templates/:id，交给对应控制器处理请求。
router.put('/templates/:id', updateAdminTemplate);
// 接口：DELETE /templates/:id，交给对应控制器处理请求。
router.delete('/templates/:id', deleteAdminTemplate);

// 接口：GET /service，交给对应控制器处理请求。
router.get('/service', getAdminServiceConfig);
// 接口：PUT /service，交给对应控制器处理请求。
router.put('/service', updateAdminServiceConfig);

// 导出当前模块的核心能力。
module.exports = router;
