// 声明系统支持的格式转换关系。
const conversionGroups = [
  {
    group: 'document',
    label: '办公文档',
    engine: 'libreoffice',
    sources: ['doc', 'docx', 'odt', 'rtf', 'txt', 'html', 'htm'],
    targets: ['pdf', 'docx', 'odt', 'html', 'txt']
  },
  {
    group: 'spreadsheet',
    label: '表格文档',
    engine: 'libreoffice',
    sources: ['xls', 'xlsx', 'ods', 'csv'],
    targets: ['pdf', 'xlsx', 'csv', 'html']
  },
  {
    group: 'presentation',
    label: '演示文档',
    engine: 'libreoffice',
    sources: ['ppt', 'pptx', 'odp'],
    targets: ['pdf', 'pptx']
  },
  {
    group: 'pdf',
    label: 'PDF 文档',
    engine: 'pdf-parse/tesseract',
    sources: ['pdf'],
    targets: ['txt', 'docx']
  },
  {
    group: 'image-ocr',
    label: '图片 OCR',
    engine: 'tesseract',
    sources: ['png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff', 'webp'],
    targets: ['txt', 'docx']
  }
];

// 汇总所有允许上传的文件扩展名。
const allowedUploadExtensions = [...new Set(conversionGroups.flatMap((item) => item.sources))];

// 方法：findConversionGroup，负责当前模块中的具体处理逻辑。
const findConversionGroup = (extension) => {
  return conversionGroups.find((item) => item.sources.includes(extension));
};

// 方法：getAllowedTargets，负责当前模块中的具体处理逻辑。
const getAllowedTargets = (extension) => {
  const group = findConversionGroup(extension);
  return group ? group.targets.filter((target) => target !== extension) : [];
};

// 声明按 OCR 流程处理的图片扩展名集合。
const imageExtensions = ['png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff', 'webp'];
// 声明通过 LibreOffice 处理的办公文档扩展名集合。
const officeExtensions = ['doc', 'docx', 'odt', 'rtf', 'txt', 'html', 'htm', 'xls', 'xlsx', 'ods', 'csv', 'ppt', 'pptx', 'odp'];

// 导出当前模块对外提供的方法集合。
module.exports = {
  conversionGroups,
  allowedUploadExtensions,
  findConversionGroup,
  getAllowedTargets,
  imageExtensions,
  officeExtensions
};
