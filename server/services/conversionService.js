const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const pdfParse = require('pdf-parse');
const { Document, Packer, Paragraph } = require('docx');
const Record = require('../models/Record');
const AppError = require('../utils/appError');
const { getConvertedDir, ensureDirSync, sanitizeBaseName } = require('../utils/storage');
const { getAllowedTargets, imageExtensions, officeExtensions } = require('../utils/conversionSupport');
const {
  downloadByKey,
  downloadByUrl,
  getFileUrl,
  getObjectKeyFromUrl,
  getOssConfig,
  normalizeOssKey,
  uploadFile
} = require('./ossService');

// 方法：executeCommand，负责当前模块中的具体处理逻辑。
const executeCommand = (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    });

    let stdout = '';
    let stderr = '';
    let finished = false;
    const timeoutMs = options.timeoutMs || 120000;

    const timeout = setTimeout(() => {
      if (!finished) {
        child.kill('SIGKILL');
        reject(new AppError('文档转换超时，请稍后重试', 500));
      }
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      finished = true;

      if (code !== 0) {
        reject(new AppError(stderr.trim() || stdout.trim() || '命令执行失败', 500));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
};

// 方法：executeSoffice，负责异步处理当前业务步骤。
const executeSoffice = async (args) => {
  const fallbackScriptPath = path.resolve(__dirname, '..', 'scripts/soffice-macos-fallback.sh');

  try {
    return await executeCommand(process.env.SOFFICE_PATH || 'soffice', args);
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (process.platform === 'darwin' && fs.existsSync(fallbackScriptPath)) {
        try {
          return await executeCommand(fallbackScriptPath, args);
        } catch (fallbackError) {
          throw fallbackError;
        }
      }

      throw new AppError('未找到 soffice，请先安装 LibreOffice 并配置 SOFFICE_PATH', 500);
    }
    throw error;
  }
};

// 方法：executeTesseract，负责异步处理当前业务步骤。
const executeTesseract = async (inputPath, lang) => {
  try {
    const result = await executeCommand(process.env.TESSERACT_PATH || 'tesseract', [inputPath, 'stdout', '-l', lang], {
      timeoutMs: 180000
    });
    return result.stdout;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new AppError('未找到 tesseract，请先安装 Tesseract OCR 并配置 TESSERACT_PATH', 500);
    }
    throw error;
  }
};

// 方法：renderPdfToImages，负责异步处理当前业务步骤。
const renderPdfToImages = async (inputPath, outputDir) => {
  const prefix = path.join(outputDir, 'page');

  try {
    await executeCommand(process.env.PDFTOPPM_PATH || 'pdftoppm', ['-png', inputPath, prefix], {
      timeoutMs: 180000
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new AppError('未找到 pdftoppm，请先安装 poppler 并配置 PDFTOPPM_PATH', 500);
    }
    throw error;
  }

  const files = await fs.promises.readdir(outputDir);
  return files
    .filter((file) => file.startsWith('page-') && file.endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => path.join(outputDir, file));
};

// 方法：normalizeText，负责当前模块中的具体处理逻辑。
const normalizeText = (text) => {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// 方法：writeTxtFile，负责异步处理当前业务步骤。
const writeTxtFile = async (outputPath, text) => {
  await fs.promises.writeFile(outputPath, `${text}\n`, 'utf8');
  return outputPath;
};

// 方法：writeDocxFile，负责异步处理当前业务步骤。
const writeDocxFile = async (outputPath, text) => {
  const blocks = normalizeText(text)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: (blocks.length ? blocks : ['']).map((block) => new Paragraph(block))
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  await fs.promises.writeFile(outputPath, buffer);
  return outputPath;
};

// 方法：writeTextOutput，负责异步处理当前业务步骤。
const writeTextOutput = async ({ outputDir, outputBaseName, targetFormat, text }) => {
  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    throw new AppError('未能从文件中提取到有效文本', 400);
  }

  const outputPath = path.join(outputDir, `${outputBaseName}.${targetFormat}`);

  if (targetFormat === 'txt') {
    return writeTxtFile(outputPath, normalizedText);
  }

  if (targetFormat === 'docx') {
    return writeDocxFile(outputPath, normalizedText);
  }

  throw new AppError(`暂不支持生成 ${targetFormat} 文件`, 400);
};

// 方法：convertByLibreOffice，负责异步处理当前业务步骤。
const convertByLibreOffice = async ({ inputPath, outputDir, sourceBaseName, targetFormat, outputBaseName }) => {
  await executeSoffice([
    '--headless',
    '--convert-to',
    targetFormat,
    '--outdir',
    outputDir,
    inputPath
  ]);

  const expectedOutput = path.join(outputDir, `${sourceBaseName}.${targetFormat}`);

  if (fs.existsSync(expectedOutput)) {
    if (outputBaseName && outputBaseName !== sourceBaseName) {
      const renamedPath = path.join(outputDir, `${outputBaseName}.${targetFormat}`);
      await fs.promises.rename(expectedOutput, renamedPath);
      return renamedPath;
    }
    return expectedOutput;
  }

  const files = await fs.promises.readdir(outputDir);
  const matchedFile = files.find((file) => path.extname(file).replace('.', '').toLowerCase() === targetFormat);

  if (!matchedFile) {
    throw new AppError('转换完成，但未找到输出文件', 500);
  }

  const generatedPath = path.join(outputDir, matchedFile);

  if (!outputBaseName || outputBaseName === path.basename(generatedPath, path.extname(generatedPath))) {
    return generatedPath;
  }

  const renamedPath = path.join(outputDir, `${outputBaseName}.${targetFormat}`);
  await fs.promises.rename(generatedPath, renamedPath);
  return renamedPath;
};

// 方法：extractPdfText，负责异步处理当前业务步骤。
const extractPdfText = async (inputPath) => {
  const buffer = await fs.promises.readFile(inputPath);
  const result = await pdfParse(buffer);
  return normalizeText(result.text);
};

// 方法：extractPdfTextWithOcr，负责异步处理当前业务步骤。
const extractPdfTextWithOcr = async (inputPath, outputDir) => {
  const ocrDir = path.join(outputDir, '_ocr');
  ensureDirSync(ocrDir);

  try {
    const imagePaths = await renderPdfToImages(inputPath, ocrDir);

    if (!imagePaths.length) {
      throw new AppError('PDF OCR 失败，未能生成页面图片', 500);
    }

    const lang = process.env.OCR_LANG || 'chi_sim+eng';
    const texts = [];

    for (const imagePath of imagePaths) {
      texts.push(await executeTesseract(imagePath, lang));
    }

    return normalizeText(texts.join('\n\n'));
  } finally {
    await fs.promises.rm(ocrDir, { recursive: true, force: true }).catch(() => {});
  }
};

// 方法：convertPdf，负责异步处理当前业务步骤。
const convertPdf = async ({ inputPath, outputDir, targetFormat, outputBaseName }) => {
  let text = await extractPdfText(inputPath);

  // 如果 PDF 本身提取不到文字，再回退到 OCR，兼容扫描件等图片型 PDF。
  if (!text) {
    text = await extractPdfTextWithOcr(inputPath, outputDir);
  }

  return writeTextOutput({
    outputDir,
    outputBaseName,
    targetFormat,
    text
  });
};

// 方法：convertImageWithOcr，负责异步处理当前业务步骤。
const convertImageWithOcr = async ({ inputPath, outputDir, targetFormat, outputBaseName }) => {
  const text = await executeTesseract(inputPath, process.env.OCR_LANG || 'chi_sim+eng');

  return writeTextOutput({
    outputDir,
    outputBaseName,
    targetFormat,
    text
  });
};

// 方法：convertDocument，负责异步处理当前业务步骤。
const convertDocument = async ({ inputPath, sourceBaseName, targetFormat, recordId, outputBaseName, sourceExt }) => {
  const convertedRoot = getConvertedDir();
  const outputDir = path.join(convertedRoot, String(recordId));
  ensureDirSync(outputDir);

  const safeBaseName = sanitizeBaseName(outputBaseName || sourceBaseName);

  // 按源文件类型分发到不同转换链路，分别复用 LibreOffice、PDF 文本提取和 OCR 能力。
  if (officeExtensions.includes(sourceExt)) {
    return convertByLibreOffice({
      inputPath,
      outputDir,
      sourceBaseName,
      targetFormat,
      outputBaseName: safeBaseName
    });
  }

  if (sourceExt === 'pdf') {
    return convertPdf({
      inputPath,
      outputDir,
      targetFormat,
      outputBaseName: safeBaseName
    });
  }

  if (imageExtensions.includes(sourceExt)) {
    return convertImageWithOcr({
      inputPath,
      outputDir,
      targetFormat,
      outputBaseName: safeBaseName
    });
  }

  throw new AppError(`暂不支持 ${sourceExt} 转 ${targetFormat}`, 400);
};

// 方法：resolveSourceExtension，负责推断源文件扩展名。
const resolveSourceExtension = ({ fileName, sourceType, sourceKey, sourceUrl }) => {
  const normalizedSourceType = String(sourceType || '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase();

  if (normalizedSourceType) {
    return normalizedSourceType;
  }

  const fileNameExt = path.extname(String(fileName || '')).replace('.', '').toLowerCase();
  if (fileNameExt) {
    return fileNameExt;
  }

  const sourceKeyExt = path.extname(String(sourceKey || '')).replace('.', '').toLowerCase();
  if (sourceKeyExt) {
    return sourceKeyExt;
  }

  if (sourceUrl) {
    const urlExt = path.extname(getObjectKeyFromUrl(sourceUrl)).replace('.', '').toLowerCase();
    if (urlExt) {
      return urlExt;
    }
  }

  return '';
};

// 方法：buildOssObjectKey，负责生成通用 OSS 对象 key。
const buildOssObjectKey = ({ dir, userId, fileName, extension }) => {
  const safeBaseName = sanitizeBaseName(path.basename(String(fileName || 'file'), path.extname(String(fileName || ''))));
  const normalizedExtension = String(extension || '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const timestamp = Date.now();
  const fileSuffix = normalizedExtension ? `.${normalizedExtension}` : '';

  return normalizeOssKey(`${dir}/${String(userId)}/${timestamp}_${randomSuffix}_${safeBaseName}${fileSuffix}`);
};

// 方法：createTempWorkspace，负责创建单次任务的临时目录。
const createTempWorkspace = async () => {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), 'doc-converter-'));
};

// 方法：buildPdfOssKey，负责生成 PDF 上传到 OSS 的 key。
const buildPdfOssKey = (userId) => {
  const config = getOssConfig();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const timestamp = Date.now();
  return normalizeOssKey(`${config.pdfDir}/${String(userId)}/${timestamp}_${randomSuffix}.pdf`);
};

// 方法：buildSourceOssKey，负责生成源文件上传到 OSS 的 key。
const buildSourceOssKey = ({ userId, fileName }) => {
  const config = getOssConfig();
  return buildOssObjectKey({
    dir: config.sourceDir,
    userId,
    fileName,
    extension: path.extname(String(fileName || '')).replace('.', '').toLowerCase()
  });
};

// 方法：buildResultOssKey，负责生成结果文件上传到 OSS 的 key。
const buildResultOssKey = ({ userId, fileName, targetFormat }) => {
  const config = getOssConfig();
  const resultDir = config.resultDir || config.pdfDir;

  if (String(targetFormat || '').trim().toLowerCase() === 'pdf' && config.pdfDir) {
    return buildOssObjectKey({
      dir: config.pdfDir,
      userId,
      fileName,
      extension: 'pdf'
    });
  }

  return buildOssObjectKey({
    dir: resultDir,
    userId,
    fileName,
    extension: targetFormat
  });
};

// 方法：cleanupTempFiles，负责清理临时目录和中间文件。
const cleanupTempFiles = async (paths) => {
  for (const currentPath of paths) {
    if (!currentPath) {
      continue;
    }

    await fs.promises.rm(currentPath, { recursive: true, force: true }).catch(() => {});
  }
};

// 方法：markRecordSuccess，负责统一写入成功状态。
const markRecordSuccess = async ({ record, updates = {} }) => {
  Object.assign(record, updates, {
    status: 'success',
    finishedAt: new Date(),
    errorMessage: '',
    errorMsg: ''
  });

  await record.save();
  return record;
};

// 方法：markRecordFail，负责统一写入失败状态。
const markRecordFail = async ({ record, error }) => {
  if (!record) {
    return null;
  }

  const errorMessage = error instanceof Error ? error.message : String(error || '转换失败');

  record.status = 'failed';
  record.finishedAt = new Date();
  record.errorMessage = errorMessage;
  record.errorMsg = errorMessage;
  await record.save();
  return record;
};

// 方法：downloadSourceFromOss，负责从 OSS 下载源文件到本地。
const downloadSourceFromOss = async ({ fileName, sourceExt, sourceUrl, sourceKey }) => {
  const tempDir = await createTempWorkspace();
  const originalBaseName = path.basename(
    String(fileName || sourceKey || 'source-file'),
    path.extname(String(fileName || sourceKey || ''))
  );
  const safeBaseName = sanitizeBaseName(originalBaseName || 'source-file');
  const localPath = path.join(tempDir, `${safeBaseName}.${sourceExt}`);

  let resolvedSourceKey = normalizeOssKey(sourceKey);

  if (resolvedSourceKey) {
    await downloadByKey(resolvedSourceKey, localPath);
  } else if (sourceUrl) {
    const downloadResult = await downloadByUrl(sourceUrl, localPath);
    resolvedSourceKey = downloadResult.ossKey;
  } else {
    throw new AppError('sourceUrl 和 sourceKey 至少需要传一个');
  }

  const stat = await fs.promises.stat(localPath).catch(() => null);
  if (!stat || !stat.isFile() || stat.size <= 0) {
    throw new AppError('源文件下载失败或文件为空', 500);
  }

  return {
    tempDir,
    localPath,
    sourceKey: resolvedSourceKey
  };
};

// 方法：convertOfficeToPdf，负责将办公文档转换为 PDF。
const convertOfficeToPdf = async ({ inputPath, recordId, fileName }) => {
  const outputDir = path.join(getConvertedDir(), String(recordId));
  ensureDirSync(outputDir);

  const sourceBaseName = path.basename(inputPath, path.extname(inputPath));
  const outputBaseName = sanitizeBaseName(path.basename(String(fileName || sourceBaseName), path.extname(String(fileName || ''))));
  const pdfPath = await convertByLibreOffice({
    inputPath,
    outputDir,
    sourceBaseName,
    targetFormat: 'pdf',
    outputBaseName
  });

  const stat = await fs.promises.stat(pdfPath).catch(() => null);
  if (!stat || !stat.isFile() || stat.size <= 0) {
    throw new AppError('PDF 转换失败，未生成有效 PDF 文件', 500);
  }

  return pdfPath;
};

// 方法：uploadPdfToOss，负责将生成的 PDF 上传回 OSS。
const uploadPdfToOss = async ({ pdfPath, userId }) => {
  const pdfKey = buildPdfOssKey(userId);
  await uploadFile(pdfPath, pdfKey);

  return {
    pdfKey,
    pdfUrl: getFileUrl(pdfKey)
  };
};

// 方法：uploadSourceToOss，负责将源文件上传到 OSS。
const uploadSourceToOss = async ({ localPath, userId, fileName }) => {
  const sourceKey = buildSourceOssKey({
    userId,
    fileName
  });
  await uploadFile(localPath, sourceKey);

  return {
    sourceKey,
    sourceUrl: getFileUrl(sourceKey)
  };
};

// 方法：uploadResultToOss，负责将转换结果上传到 OSS。
const uploadResultToOss = async ({ localPath, userId, fileName, targetFormat }) => {
  const normalizedTargetFormat = String(targetFormat || '').trim().toLowerCase();

  if (normalizedTargetFormat === 'pdf') {
    const pdfUploadResult = await uploadPdfToOss({
      pdfPath: localPath,
      userId
    });

    return {
      targetKey: pdfUploadResult.pdfKey,
      downloadUrl: pdfUploadResult.pdfUrl,
      pdfKey: pdfUploadResult.pdfKey,
      pdfUrl: pdfUploadResult.pdfUrl
    };
  }

  const targetKey = buildResultOssKey({
    userId,
    fileName,
    targetFormat: normalizedTargetFormat
  });
  await uploadFile(localPath, targetKey);

  return {
    targetKey,
    downloadUrl: getFileUrl(targetKey),
    pdfKey: '',
    pdfUrl: ''
  };
};

// 方法：createOssConversionTask，负责创建并执行 OSS 文件转换任务。
const createOssConversionTask = async ({ userId, fileName, sourceType, sourceUrl, sourceKey, targetFormat }) => {
  const normalizedTargetFormat = String(targetFormat || '')
    .trim()
    .toLowerCase();
  const sourceExt = resolveSourceExtension({
    fileName,
    sourceType,
    sourceKey,
    sourceUrl
  });

  if (!fileName || !String(fileName).trim()) {
    throw new AppError('fileName 必填');
  }

  if (!normalizedTargetFormat) {
    throw new AppError('targetFormat 必填');
  }

  if (!sourceUrl && !sourceKey) {
    throw new AppError('sourceUrl 和 sourceKey 至少需要传一个');
  }

  const allowedTargets = getAllowedTargets(sourceExt);

  if (!sourceExt || !allowedTargets.length) {
    throw new AppError(`当前源文件格式 ${sourceExt || 'unknown'} 暂不支持转换`);
  }

  if (!allowedTargets.includes(normalizedTargetFormat)) {
    throw new AppError(`当前文件支持转换为：${allowedTargets.join('、') || '无可用目标格式'}`);
  }

  const normalizedFileName = String(fileName).trim();
  const initialSourceKey = sourceKey ? normalizeOssKey(sourceKey) : sourceUrl ? getObjectKeyFromUrl(sourceUrl) : '';
  const record = await Record.create({
    user: userId,
    toolType: `${sourceExt}-to-${normalizedTargetFormat}`,
    sourceFileName: normalizedFileName,
    sourceFilePath: '',
    sourceFileSize: 0,
    sourceStorageType: 'oss',
    sourceUrl: sourceUrl ? String(sourceUrl).trim() : '',
    sourceKey: initialSourceKey,
    targetFileName: '',
    targetKey: '',
    targetFilePath: '',
    targetFormat: normalizedTargetFormat,
    downloadUrl: '',
    pdfUrl: '',
    pdfKey: '',
    errorMessage: '',
    errorMsg: '',
    taskType: 'oss-file-conversion',
    status: 'processing'
  });

  const cleanupTargets = [];

  try {
    const downloadResult = await downloadSourceFromOss({
      fileName: normalizedFileName,
      sourceExt,
      sourceUrl,
      sourceKey: initialSourceKey
    });
    cleanupTargets.push(downloadResult.tempDir);

    const sourceStat = await fs.promises.stat(downloadResult.localPath);
    const outputBaseName = sanitizeBaseName(
      path.basename(normalizedFileName, path.extname(normalizedFileName || '')) || path.basename(downloadResult.localPath, path.extname(downloadResult.localPath))
    );
    const outputPath = await convertDocument({
      inputPath: downloadResult.localPath,
      sourceBaseName: path.basename(downloadResult.localPath, path.extname(downloadResult.localPath)),
      recordId: record._id,
      targetFormat: normalizedTargetFormat,
      outputBaseName,
      sourceExt
    });
    cleanupTargets.push(path.dirname(outputPath));
    const uploadResult = await uploadResultToOss({
      localPath: outputPath,
      userId,
      fileName: `${outputBaseName}.${normalizedTargetFormat}`,
      targetFormat: normalizedTargetFormat
    });

    await markRecordSuccess({
      record,
      updates: {
        sourceFileSize: sourceStat.size,
        sourceKey: downloadResult.sourceKey,
        sourceUrl: getFileUrl(downloadResult.sourceKey),
        sourceStorageType: 'oss',
        targetKey: uploadResult.targetKey,
        pdfKey: uploadResult.pdfKey,
        pdfUrl: uploadResult.pdfUrl,
        targetFileName: path.basename(outputPath),
        targetFilePath: '',
        downloadUrl: uploadResult.downloadUrl
      }
    });

    return record;
  } catch (error) {
    await markRecordFail({ record, error });
    throw error;
  } finally {
    await cleanupTempFiles(cleanupTargets);
  }
};

// 方法：getRecordPdfUrl，负责按记录返回最新 PDF 访问地址。
const getRecordPdfUrl = (record) => {
  if (!record) {
    throw new AppError('记录不存在', 404);
  }

  if (record.pdfKey) {
    return getFileUrl(record.pdfKey);
  }

  if (record.pdfUrl) {
    return record.pdfUrl;
  }

  if (record.downloadUrl) {
    return record.downloadUrl;
  }

  return '';
};

// 方法：getRecordResultUrl，负责按记录返回最新结果地址。
const getRecordResultUrl = (record) => {
  if (!record) {
    throw new AppError('记录不存在', 404);
  }

  if (record.targetFormat === 'pdf') {
    return getRecordPdfUrl(record);
  }

  if (record.targetKey) {
    return getFileUrl(record.targetKey);
  }

  if (record.downloadUrl) {
    return record.downloadUrl;
  }

  return '';
};

// 导出当前模块对外提供的方法集合。
module.exports = {
  cleanupTempFiles,
  convertDocument,
  convertOfficeToPdf,
  createOssConversionTask,
  downloadSourceFromOss,
  getRecordPdfUrl,
  getRecordResultUrl,
  markRecordFail,
  markRecordSuccess,
  uploadResultToOss,
  uploadSourceToOss,
  uploadPdfToOss
};
