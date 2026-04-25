const fs = require('fs');
const os = require('os');
const path = require('path');
const Record = require('../models/Record');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const {
  downloadByKey,
  downloadByUrl,
  getOssPostSignatureData
} = require('../services/ossService');
const {
  convertDocument,
  createOssConversionTask,
  getRecordPdfUrl,
  getRecordResultUrl,
  markRecordFail,
  markRecordSuccess,
  uploadResultToOss,
  uploadSourceToOss
} = require('../services/conversionService');
const { getAllowedTargets, conversionGroups } = require('../utils/conversionSupport');
const { sanitizeBaseName } = require('../utils/storage');

const INLINE_PREVIEW_FORMATS = new Set(['html', 'htm', 'txt', 'csv']);

function splitCsvLine(line = '') {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function parseCsvContent(content = '') {
  return String(content || '')
    .replace(/\uFEFF/g, '')
    .split(/\r?\n/)
    .filter((line) => line !== '')
    .map((line) => splitCsvLine(line));
}

// 方法：getConversionSupport，负责当前接口的业务处理。
const getConversionSupport = asyncHandler(async (req, res) => {
  return sendSuccess(res, conversionGroups);
});

// 方法：createConversion，负责当前接口的业务处理。
const createConversion = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('请上传文件，字段名应为 file');
  }

  const targetFormat = String(req.body.targetFormat || '').trim().toLowerCase();
  const sourceExt = path.extname(req.file.originalname || '').replace('.', '').toLowerCase();
  const sourceBaseName = path.basename(req.file.originalname || req.file.filename, path.extname(req.file.originalname || ''));
  const allowedTargets = getAllowedTargets(sourceExt);

  if (!targetFormat) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    throw new AppError('targetFormat 必填');
  }

  if (!allowedTargets.includes(targetFormat)) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    throw new AppError(`当前文件支持转换为：${allowedTargets.join('、') || '无可用目标格式'}`);
  }

  const record = await Record.create({
    user: req.user._id,
    toolType: `${sourceExt}-to-${targetFormat}`,
    sourceFileName: req.file.originalname,
    sourceFilePath: '',
    sourceFileSize: req.file.size,
    sourceStorageType: '',
    sourceUrl: '',
    sourceKey: '',
    targetFormat,
    targetFileName: '',
    targetKey: '',
    targetFilePath: '',
    downloadUrl: '',
    pdfUrl: '',
    pdfKey: '',
    taskType: 'local-upload-conversion',
    status: 'processing'
  });

  const cleanupTargets = [req.file.path, path.join(path.resolve(__dirname, '..'), process.env.CONVERTED_DIR || 'storage/converted', String(record._id))];

  try {
    const outputPath = await convertDocument({
      inputPath: req.file.path,
      sourceBaseName,
      targetFormat,
      recordId: record._id,
      outputBaseName: sanitizeBaseName(sourceBaseName),
      sourceExt
    });

    const [sourceUploadResult, targetUploadResult] = await Promise.all([
      uploadSourceToOss({
        localPath: req.file.path,
        userId: req.user._id,
        fileName: req.file.originalname
      }),
      uploadResultToOss({
        localPath: outputPath,
        userId: req.user._id,
        fileName: `${sanitizeBaseName(sourceBaseName)}.${targetFormat}`,
        targetFormat
      })
    ]);

    await markRecordSuccess({
      record,
      updates: {
        sourceStorageType: 'oss',
        sourceFilePath: '',
        sourceUrl: sourceUploadResult.sourceUrl,
        sourceKey: sourceUploadResult.sourceKey,
        targetFileName: path.basename(outputPath),
        targetKey: targetUploadResult.targetKey,
        targetFilePath: '',
        downloadUrl: targetUploadResult.downloadUrl,
        pdfUrl: targetUploadResult.pdfUrl,
        pdfKey: targetUploadResult.pdfKey
      }
    });

    return sendSuccess(
      res,
      {
        record
      },
      '转换成功',
      0,
      201
    );
  } catch (error) {
    await markRecordFail({ record, error });
    throw error;
  } finally {
    await Promise.all(
      cleanupTargets.map((currentPath) => fs.promises.rm(currentPath, { recursive: true, force: true }).catch(() => {}))
    );
  }
});

// 方法：createConversionByUrl，负责处理 OSS URL 或 key 转换任务。
const createConversionByUrl = asyncHandler(async (req, res) => {
  const record = await createOssConversionTask({
    userId: req.user._id,
    fileName: req.body.fileName,
    sourceType: req.body.sourceType,
    sourceUrl: req.body.sourceUrl,
    sourceKey: req.body.sourceKey,
    targetFormat: req.body.targetFormat
  });

  return sendSuccess(
    res,
    {
      record
    },
    '转换成功',
    0,
    201
  );
});

// 方法：getConversionPdfUrl，负责返回指定记录的 PDF 访问地址。
const getConversionPdfUrl = asyncHandler(async (req, res) => {
  const record = await Record.findOne({
    _id: req.params.id,
    user: req.user._id,
    isDeleted: false
  });

  if (!record) {
    throw new AppError('记录不存在', 404);
  }

  if (record.status !== 'success') {
    throw new AppError('文件尚未转换成功，暂时无法获取 PDF 地址', 400);
  }

  if (record.targetFormat !== 'pdf' && !record.pdfKey && !record.pdfUrl) {
    throw new AppError('当前记录不是 PDF 结果', 400);
  }

  const pdfUrl = getRecordPdfUrl(record);

  if (!pdfUrl) {
    throw new AppError('PDF 地址不存在', 404);
  }

  return sendSuccess(res, {
    id: record._id,
    pdfUrl,
    pdfKey: record.pdfKey || '',
    targetFileName: record.targetFileName || '',
    targetKey: record.targetKey || '',
    targetFormat: record.targetFormat || 'pdf',
    finishedAt: record.finishedAt,
    status: record.status
  });
});

// 方法：getConversionResult，负责返回指定记录的通用结果地址。
const getConversionResult = asyncHandler(async (req, res) => {
  const record = await Record.findOne({
    _id: req.params.id,
    user: req.user._id,
    isDeleted: false
  });

  if (!record) {
    throw new AppError('记录不存在', 404);
  }

  if (record.status !== 'success') {
    throw new AppError('文件尚未转换成功，暂时无法获取结果地址', 400);
  }

  const resultUrl = getRecordResultUrl(record);

  if (!resultUrl) {
    throw new AppError('结果地址不存在', 404);
  }

  return sendSuccess(res, {
    id: record._id,
    resultUrl,
    pdfUrl: record.pdfUrl || '',
    pdfKey: record.pdfKey || '',
    downloadUrl: record.downloadUrl || '',
    targetFileName: record.targetFileName || '',
    targetKey: record.targetKey || '',
    targetFormat: record.targetFormat || '',
    finishedAt: record.finishedAt,
    status: record.status
  });
});

// 方法：getConversionPreview，负责返回文本类结果文件的预览内容。
const getConversionPreview = asyncHandler(async (req, res) => {
  const record = await Record.findOne({
    _id: req.params.id,
    user: req.user._id,
    isDeleted: false
  });

  if (!record) {
    throw new AppError('记录不存在', 404);
  }

  if (record.status !== 'success') {
    throw new AppError('文件尚未转换成功，暂时无法预览', 400);
  }

  const targetFormat = String(record.targetFormat || '').trim().toLowerCase();

  if (!INLINE_PREVIEW_FORMATS.has(targetFormat)) {
    throw new AppError('当前文件类型不支持页面预览', 400);
  }

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'doc-preview-'));
  const fileName = record.targetFileName || `preview.${targetFormat || 'txt'}`;
  const previewFilePath = path.join(tempDir, fileName);

  try {
    if (record.targetKey) {
      await downloadByKey(record.targetKey, previewFilePath);
    } else {
      const resultUrl = getRecordResultUrl(record);

      if (!resultUrl) {
        throw new AppError('结果文件不存在', 404);
      }

      await downloadByUrl(resultUrl, previewFilePath);
    }

    const content = await fs.promises.readFile(previewFilePath, 'utf8');

    return sendSuccess(res, {
      id: record._id,
      targetFormat,
      fileName,
      previewType: targetFormat === 'html' || targetFormat === 'htm' ? 'html' : 'text',
      content,
      rows: targetFormat === 'csv' ? parseCsvContent(content) : []
    });
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

// 方法：getOssSts，负责返回 OSS 表单直传签名数据。
const getOssSts = asyncHandler(async (req, res) => {
  const postSignatureData = getOssPostSignatureData(String(req.user._id));

  return sendSuccess(res, {
    accessKeyId: postSignatureData.accessKeyId,
    policy: postSignatureData.policy,
    signature: postSignatureData.signature,
    host: postSignatureData.host,
    dir: postSignatureData.dir,
    expire: postSignatureData.expire,
    bucket: postSignatureData.bucket,
    region: postSignatureData.region
  }, 'success');
});

// 方法：downloadConvertedFile，负责当前接口的业务处理。
const downloadConvertedFile = asyncHandler(async (req, res) => {
  const record = await Record.findOne({
    _id: req.params.id,
    user: req.user._id,
    isDeleted: false
  });

  if (!record) {
    throw new AppError('记录不存在', 404);
  }

  if (record.status !== 'success') {
    throw new AppError('文件尚未转换成功，无法下载', 400);
  }

  const resultUrl = getRecordResultUrl(record);

  if (resultUrl) {
    return res.redirect(resultUrl);
  }

  if (!record.targetFilePath) {
    throw new AppError('结果文件不存在', 404);
  }

  const absolutePath = path.resolve(__dirname, '..', record.targetFilePath);

  if (!fs.existsSync(absolutePath)) {
    throw new AppError('文件不存在或已被清理', 404);
  }

  return res.download(absolutePath, record.targetFileName);
});

// 导出当前模块对外提供的方法集合。
module.exports = {
  createConversion,
  createConversionByUrl,
  downloadConvertedFile,
  getConversionPreview,
  getConversionResult,
  getConversionPdfUrl,
  getConversionSupport,
  getOssSts
};
