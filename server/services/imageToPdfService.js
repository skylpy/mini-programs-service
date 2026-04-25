const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/appError');
const { ensureDirSync, sanitizeBaseName } = require('../utils/storage');

const pageWidth = 595.28;
const pageHeight = 841.89;
const pagePadding = 24;

function getTempDir() {
  const tempDir = path.join(os.tmpdir(), 'image-to-pdf-temp');
  ensureDirSync(tempDir);
  return tempDir;
}

async function normalizeImage(file = {}) {
  const inputPath = String(file.path || '').trim();

  if (!inputPath) {
    throw new AppError('存在无效图片文件', 400);
  }

  const pipeline = sharp(inputPath, {
    limitInputPixels: false,
    animated: false
  }).rotate();
  const metadata = await pipeline.metadata();
  const buffer = await pipeline
    .jpeg({
      quality: 85,
      mozjpeg: true
    })
    .toBuffer();

  return {
    buffer,
    width: metadata.width || 1,
    height: metadata.height || 1
  };
}

function calcImageLayout(width, height) {
  const contentWidth = pageWidth - pagePadding * 2;
  const contentHeight = pageHeight - pagePadding * 2;
  const scale = Math.min(contentWidth / width, contentHeight / height, 1);
  const drawWidth = width * scale;
  const drawHeight = height * scale;

  return {
    x: (pageWidth - drawWidth) / 2,
    y: (pageHeight - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight
  };
}

async function imageToPdf(files = [], title = '') {
  if (!Array.isArray(files) || !files.length) {
    throw new AppError('请上传至少一张图片', 400);
  }

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const normalizedImage = await normalizeImage(file);
    const image = await pdfDoc.embedJpg(normalizedImage.buffer);
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    page.drawImage(image, calcImageLayout(normalizedImage.width, normalizedImage.height));
  }

  const pdfBytes = await pdfDoc.save();
  const safeTitle = sanitizeBaseName(String(title || '').trim() || 'image-to-pdf');
  const outputFileName = `${safeTitle}-${Date.now()}-${uuidv4().slice(0, 8)}.pdf`;
  const outputPath = path.join(getTempDir(), outputFileName);

  await fs.promises.writeFile(outputPath, pdfBytes);

  return {
    outputPath,
    outputFileName,
    size: pdfBytes.length
  };
}

module.exports = {
  pageWidth,
  pageHeight,
  imageToPdf
};
