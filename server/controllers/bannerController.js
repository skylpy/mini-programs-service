const Banner = require('../models/Banner');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

// 方法：getBanners，负责当前接口的业务处理。
const getBanners = asyncHandler(async (req, res) => {
  // 初始化 Banner 示例数据。
  const banners = await Banner.find({
    status: true,
    isDeleted: false
  })
    .sort({ sort: 1, createdAt: -1 })
    .lean();

  return sendSuccess(res, banners);
});

// 导出当前模块对外提供的方法集合。
module.exports = {
  getBanners
};
