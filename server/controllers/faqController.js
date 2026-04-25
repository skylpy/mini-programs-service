const fs = require('fs');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { sendSuccess } = require('../utils/response');

const FAQ_FILE_PATH = path.resolve(__dirname, '..', 'data', 'faq-data.json');

async function loadFaqFile() {
  let fileContent = '{}';

  try {
    fileContent = await fs.promises.readFile(FAQ_FILE_PATH, 'utf8');
  } catch (error) {
    throw new AppError('FAQ 数据文件不存在', 500);
  }

  try {
    return JSON.parse(fileContent);
  } catch (error) {
    throw new AppError('FAQ 数据文件格式不正确', 500);
  }
}

function normalizePageMeta(page = {}) {
  return {
    title: String(page.title || '常见问题').trim(),
    subtitle: String(page.subtitle || '').trim(),
    version: String(page.version || '').trim()
  };
}

function normalizeFaqItem(item = {}, index = 0) {
  return {
    id: String(item.id || `faq-${index + 1}`),
    question: String(item.question || '').trim(),
    answer: String(item.answer || '').trim(),
    category: String(item.category || '').trim(),
    sort: Number(item.sort) || index + 1,
    status: String(item.status || '').trim().toLowerCase(),
    defaultExpanded: Boolean(item.defaultExpanded),
    keywords: Array.isArray(item.keywords) ? item.keywords.map((keyword) => String(keyword || '').trim()).filter(Boolean) : []
  };
}

// 方法：getFaqs，负责当前接口的业务处理。
const getFaqs = asyncHandler(async (req, res) => {
  const keyword = String(req.query.keyword || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim();
  const faqData = await loadFaqFile();
  const page = normalizePageMeta(faqData.page || {});
  const list = (Array.isArray(faqData.faqs) ? faqData.faqs : [])
    .map((item, index) => normalizeFaqItem(item, index))
    .filter((item) => item.status === 'enabled')
    .filter((item) => !category || item.category === category)
    .filter((item) => {
      if (!keyword) {
        return true;
      }

      const targetText = [
        item.question,
        item.answer,
        item.category,
        item.keywords.join(' ')
      ]
        .join(' ')
        .toLowerCase();

      return targetText.includes(keyword);
    })
    .sort((a, b) => {
      if (a.sort !== b.sort) {
        return a.sort - b.sort;
      }

      return a.question.localeCompare(b.question, 'zh-Hans-CN');
    });

  return sendSuccess(res, {
    page,
    list
  });
});

// 导出当前模块对外提供的方法集合。
module.exports = {
  getFaqs
};
