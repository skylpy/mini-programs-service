const { NODE_ENV } = require('./config/loadEnv');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const recordRoutes = require('./routes/recordRoutes');
const browseHistoryRoutes = require('./routes/browseHistoryRoutes');
const downloadHistoryRoutes = require('./routes/downloadHistoryRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const faqRoutes = require('./routes/faqRoutes');
const templateRoutes = require('./routes/templateRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const conversionRoutes = require('./routes/conversionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const operationLogMiddleware = require('./middlewares/operationLogMiddleware');
const { sendSuccess } = require('./utils/response');
const { notFoundMiddleware, errorMiddleware } = require('./middlewares/errorMiddleware');

// 创建 Express 应用实例。
const app = express();
// 显式区分运行目标，避免仅靠 NODE_ENV 无法判断本地还是云服务器。
const SERVER_TARGET = process.env.SERVER_TARGET === 'aliyun' ? 'aliyun' : 'local';
// 根据运行目标选择默认端口，同时允许通过 PORT 显式覆盖。
const DEFAULT_PORT = SERVER_TARGET === 'aliyun' ? 3001 : 3000;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;

// 允许前端跨域访问当前服务。
app.use(cors());
// 解析 JSON 请求体。
app.use(express.json());
// 解析表单提交的请求体。
app.use(express.urlencoded({ extended: true }));
// 输出开发环境请求日志，方便排查接口问题。
app.use(morgan('dev'));
// 记录后台排查所需的接口操作日志。
app.use(operationLogMiddleware);

// 接口：GET /api/health，用于应用级请求处理。
app.get('/api/health', (req, res) => {
  return sendSuccess(
    res,
    {
      service: 'mini-program-doc-converter-server',
      env: NODE_ENV,
      timestamp: new Date().toISOString()
    },
    'success'
  );
});

// 挂载模块路由：/api/auth。
app.use('/api/auth', authRoutes);
// 挂载模块路由：/api/user。
app.use('/api/user', userRoutes);
// 挂载模块路由：/api/banners。
app.use('/api/banners', bannerRoutes);
// 挂载模块路由：/api/records。
app.use('/api/records', recordRoutes);
// 挂载模块路由：/api/browse-history。
app.use('/api/browse-history', browseHistoryRoutes);
// 挂载模块路由：/api/download-history。
app.use('/api/download-history', downloadHistoryRoutes);
// 挂载模块路由：/api/feedback。
app.use('/api/feedback', feedbackRoutes);
// 挂载模块路由：/api/faqs。
app.use('/api/faqs', faqRoutes);
// 挂载模块路由：/api/templates。
app.use('/api/templates', templateRoutes);
// 挂载模块路由：/api/service。
app.use('/api/service', serviceRoutes);
// 挂载模块路由：/api/conversions。
app.use('/api/conversions', conversionRoutes);
// 挂载模块路由：/api/admin。
app.use('/api/admin', adminRoutes);

// 兜底处理未命中的路由。
app.use(notFoundMiddleware);
// 统一处理全局异常响应。
app.use(errorMiddleware);

// 方法：startServer，负责异步处理当前业务步骤。
const startServer = async () => {
  try {
    let databaseConnected = false;

    try {
      await connectDB();
      databaseConnected = true;
    } catch (error) {
      if (NODE_ENV === 'production') {
        throw error;
      }

      console.warn('Database unavailable in development, continuing without DB:', error.message);
    }

    const server = app.listen(PORT, () => {
      console.log(
        `Server running in ${NODE_ENV} (${SERVER_TARGET}) on port ${PORT}${databaseConnected ? '' : ' [DB unavailable]'}`
      );
    });

    server.on('error', (error) => {
      console.error(`Failed to listen on port ${PORT}:`, error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
