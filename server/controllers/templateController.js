const fs = require('fs');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { sendSuccess } = require('../utils/response');

const TEMPLATE_FILE_PATH = path.resolve(__dirname, '..', 'data', 'work-templates.json');

async function loadTemplateFile() {
  let fileContent = '[]';

  try {
    fileContent = await fs.promises.readFile(TEMPLATE_FILE_PATH, 'utf8');
  } catch (error) {
    throw new AppError('模板数据文件不存在', 500);
  }

  try {
    const parsed = JSON.parse(fileContent);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    throw new AppError('模板数据文件格式不正确', 500);
  }
}

function normalizeTemplate(item = {}, index = 0) {
  return {
    id: String(item.id || `${item.category || 'template'}-${item.subCategory || 'default'}-${item.sort || index + 1}-${index + 1}`),
    title: String(item.title || '').trim(),
    category: String(item.category || '').trim(),
    subCategory: String(item.subCategory || '').trim(),
    description: String(item.description || '').trim(),
    tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : [],
    content: String(item.content || ''),
    coverUrl: String(item.coverUrl || '').trim(),
    fileType: String(item.fileType || '').trim(),
    isFree: Boolean(item.isFree),
    sort: Number(item.sort) || 0,
    status: String(item.status || '').trim().toLowerCase(),
    usageCount: Number(item.usageCount) || 0
  };
}

// 方法：getTemplates，负责当前接口的业务处理。
const getTemplates = asyncHandler(async (req, res) => {
  const category = String(req.query.category || '').trim();
  const subCategory = String(req.query.subCategory || '').trim();
  const keyword = String(req.query.keyword || '').trim().toLowerCase();

  const list = (await loadTemplateFile())
    .map((item, index) => normalizeTemplate(item, index))
    .filter((item) => item.status === 'active')
    .filter((item) => !category || item.category === category)
    .filter((item) => !subCategory || item.subCategory === subCategory)
    .filter((item) => {
      if (!keyword) {
        return true;
      }

      const targetText = [
        item.title,
        item.description,
        item.category,
        item.subCategory,
        item.content,
        item.tags.join(' ')
      ]
        .join(' ')
        .toLowerCase();

      return targetText.includes(keyword);
    })
    .sort((a, b) => {
      if (a.sort !== b.sort) {
        return a.sort - b.sort;
      }

      return a.title.localeCompare(b.title, 'zh-Hans-CN');
    });

  return sendSuccess(res, list);
});

// 导出当前模块对外提供的方法集合。
module.exports = {
  getTemplates
};
