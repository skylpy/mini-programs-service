const ServiceConfig = require('../models/ServiceConfig');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

// 方法：getServiceInfo，负责当前接口的业务处理。
const getServiceInfo = asyncHandler(async (req, res) => {
  // 初始化客服配置示例数据。
  const serviceConfig = await ServiceConfig.findOne({
    status: true,
    isDeleted: false
  })
    .sort({ updatedAt: -1 })
    .lean();

  return sendSuccess(res, serviceConfig || {});
});

// 导出当前模块对外提供的方法集合。
module.exports = {
  getServiceInfo
};
