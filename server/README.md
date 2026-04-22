# 文档格式转换工具后端服务

基于 Node.js + Express + MongoDB + Mongoose 的微信小程序后端项目，提供认证、用户资料、Banner、转换记录、浏览记录、反馈、FAQ、模板和客服信息接口。

## 目录结构

```bash
server/
├─ app.js
├─ .env.development
├─ .env.production
├─ .env.example
├─ package.json
├─ config/
│  └─ db.js
├─ controllers/
│  ├─ adminController.js
│  ├─ authController.js
│  ├─ bannerController.js
│  ├─ browseHistoryController.js
│  ├─ conversionController.js
│  ├─ faqController.js
│  ├─ feedbackController.js
│  ├─ recordController.js
│  ├─ serviceController.js
│  ├─ templateController.js
│  └─ userController.js
├─ middlewares/
│  ├─ adminMiddleware.js
│  ├─ authMiddleware.js
│  ├─ errorMiddleware.js
│  └─ uploadMiddleware.js
├─ models/
│  ├─ Banner.js
│  ├─ BrowseHistory.js
│  ├─ Feedback.js
│  ├─ Faq.js
│  ├─ Record.js
│  ├─ ServiceConfig.js
│  ├─ Template.js
│  └─ User.js
├─ routes/
│  ├─ adminRoutes.js
│  ├─ authRoutes.js
│  ├─ bannerRoutes.js
│  ├─ browseHistoryRoutes.js
│  ├─ conversionRoutes.js
│  ├─ faqRoutes.js
│  ├─ feedbackRoutes.js
│  ├─ recordRoutes.js
│  ├─ serviceRoutes.js
│  ├─ templateRoutes.js
│  └─ userRoutes.js
├─ services/
│  └─ conversionService.js
├─ seed/
│  └─ seedData.js
├─ storage/
│  ├─ converted/
│  └─ uploads/
└─ utils/
   ├─ appError.js
   ├─ asyncHandler.js
   ├─ conversionSupport.js
   ├─ jwt.js
   ├─ response.js
   ├─ storage.js
   └─ validators.js
```

## 1. 安装依赖

```bash
cd server
npm install
```

## 2. 配置环境变量

项目会根据 `NODE_ENV` 自动加载环境变量文件：

- 开发环境：`.env.development`
- 生产环境：`.env.production`

项目不再读取 `.env`，只使用上面两套环境文件。
你也可以参考 `.env.example` 补充配置项。

开发环境示例：

```env
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/doc-converter-mini-program-dev
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE_MB=20
SOFFICE_PATH=soffice
TESSERACT_PATH=tesseract
PDFTOPPM_PATH=pdftoppm
OCR_LANG=chi_sim+eng
UPLOAD_DIR=storage/uploads
CONVERTED_DIR=storage/converted
FILE_BASE_URL=
OSS_REGION=oss-cn-shenzhen
OSS_ENDPOINT=https://oss-cn-shenzhen.aliyuncs.com
OSS_BUCKET=doc-converter-pdf
OSS_PDF_DIR=pdf
OSS_RESULT_DIR=result
OSS_SOURCE_DIR=source
OSS_SIGN_EXPIRE=900
OSS_USE_SIGNED_URL=true
OSS_ACCESS_KEY_ID=YOUR_NEW_ACCESS_KEY_ID
OSS_ACCESS_KEY_SECRET=YOUR_NEW_ACCESS_KEY_SECRET
ADMIN_USERNAME=admin
ADMIN_MOBILE=13800000000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin123456
```

生产环境建议使用独立数据库，例如：

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/doc-converter-mini-program-prod
```

补充说明：

- `SOFFICE_PATH` 默认是 `soffice`
- `TESSERACT_PATH` 默认是 `tesseract`å
- `PDFTOPPM_PATH` 默认是 `pdftoppm`
- `OCR_LANG` 默认是 `chi_sim+eng`å
- 如果服务器上相关命令不在 PATH 中，请显式配置绝对路径
- `UPLOAD_DIR`、`CONVERTED_DIR` 仅作为临时工作目录，任务完成后会清理
- `OSS_SOURCE_DIR` 用于保存上传源文件
- `OSS_PDF_DIR` 用于保存 PDF 结果文件
- `OSS_RESULT_DIR` 用于保存非 PDF 结果文件
- `OSS_USE_SIGNED_URL=true` 时，接口返回 OSS 签名链接；`false` 时返回公网链接
- `OSS_SIGN_EXPIRE` 控制签名链接有效期，单位秒
- `OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET` 必须配置为真实 OSS 凭证
- `FILE_BASE_URL` 仅保留兼容旧逻辑，新版本结果下载优先走 OSS
- `ADMIN_*` 用于初始化后台管理员账号，未配置时会使用上面的默认值
- 开发环境默认端口是 `3001`
- 生产环境默认端口是 `3000`
- 开发和生产默认使用不同的 MongoDB 数据库，避免数据互相污染

## 3. 启动开发环境

开发模式：

```bash
npm run dev
```

默认读取 `.env.development`，监听 `3001`。

生产模式：

```bash
npm start
```

默认读取 `.env.production`，监听 `3000`。

健康检查：

```bash
GET /api/health
```

## 3.1 LibreOffice 依赖

真实文档转换使用 `LibreOffice` 的 `soffice` 命令。启动服务前请先安装：

macOS:

```bash
brew install --cask libreoffice
```

Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y libreoffice
```

安装完成后验证：

```bash
soffice --version
```

## 3.2 OCR 依赖

如果你要启用 `PDF -> DOCX/TXT` 和图片 OCR，请额外安装：

macOS:

```bash
brew install tesseract poppler
```

Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-chi-sim poppler-utils
```

验证：

```bash
tesseract --version
pdftoppm -v
```

## 4. 运行种子数据

确保 MongoDB 已启动并且对应环境变量文件已配置完成，然后执行：

```bash
npm run seed
```

如果你要初始化生产环境数据：

```bash
npm run seed:prod
```

脚本会初始化：

- 3 条 Banner
- 4 条 FAQ
- 4 条模板
- 1 条客服配置
- 1 个后台管理员账号

默认后台管理员账号：

- `account`: `13800000000`
- `password`: `Admin123456`

## 5. 统一返回格式

成功：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

失败：

```json
{
  "code": 1,
  "message": "错误信息",
  "data": null
}
```

## 6. 接口列表

### 认证模块

- `POST /api/auth/register` 注册
- `POST /api/auth/login` 登录
- `POST /api/auth/forgot-password` 忘记密码重置，需要提供用户信息校验
- `POST /api/auth/logout` 退出登录，需要 JWT

### 用户模块

- `GET /api/user/profile` 获取当前用户资料，需要 JWT
- `PUT /api/user/profile` 更新当前用户资料，需要 JWT
- `PUT /api/user/password` 修改当前用户密码，需要 JWT

### Banner 模块

- `GET /api/banners` 获取 Banner 列表

### 转换记录模块

- `POST /api/records` 新增转换记录，需要 JWT
- `GET /api/records?page=1&pageSize=10` 获取我的转换记录，需要 JWT

### 文档转换模块

- `GET /api/conversions/support` 获取支持的转换矩阵
- `POST /api/conversions` 上传文件并执行真实转换，需要 JWT
- `GET /api/conversions/:id/download` 下载转换后的文件，需要 JWT

### 浏览记录模块

- `POST /api/browse-history` 新增浏览记录，需要 JWT
- `GET /api/browse-history?page=1&pageSize=10` 获取我的浏览记录，需要 JWT

### 反馈模块

- `POST /api/feedback` 提交反馈，需要 JWT
- `GET /api/feedback?page=1&pageSize=10` 获取我的反馈列表，需要 JWT

### FAQ 模块

- `GET /api/faqs` 获取 FAQ 列表

### 模板模块

- `GET /api/templates`
- `GET /api/templates?category=resume`

### 客服模块

- `GET /api/service`

### 后台管理模块

- `POST /api/admin/auth/login` 后台管理员登录
- `GET /api/admin/profile` 获取当前管理员信息，需要管理员 JWT
- `GET /api/admin/dashboard` 获取后台概览统计，需要管理员 JWT
- `GET /api/admin/users` 获取用户列表，需要管理员 JWT
- `GET /api/admin/users/:id` 获取用户详情，需要管理员 JWT
- `PATCH /api/admin/users/:id` 更新用户角色/状态/资料，需要管理员 JWT
- `GET /api/admin/records` 获取全部转换记录，需要管理员 JWT
- `GET /api/admin/feedbacks` 获取全部反馈，需要管理员 JWT
- `PATCH /api/admin/feedbacks/:id` 处理反馈，需要管理员 JWT
- `GET /api/admin/banners` 获取 Banner 管理列表，需要管理员 JWT
- `POST /api/admin/banners` 新增 Banner，需要管理员 JWT
- `PUT /api/admin/banners/:id` 更新 Banner，需要管理员 JWT
- `DELETE /api/admin/banners/:id` 删除 Banner，需要管理员 JWT
- `GET /api/admin/faqs` 获取 FAQ 管理列表，需要管理员 JWT
- `POST /api/admin/faqs` 新增 FAQ，需要管理员 JWT
- `PUT /api/admin/faqs/:id` 更新 FAQ，需要管理员 JWT
- `DELETE /api/admin/faqs/:id` 删除 FAQ，需要管理员 JWT
- `GET /api/admin/templates` 获取模板管理列表，需要管理员 JWT
- `POST /api/admin/templates` 新增模板，需要管理员 JWT
- `PUT /api/admin/templates/:id` 更新模板，需要管理员 JWT
- `DELETE /api/admin/templates/:id` 删除模板，需要管理员 JWT
- `GET /api/admin/service` 获取客服配置，需要管理员 JWT
- `PUT /api/admin/service` 更新客服配置，需要管理员 JWT

## 7. 鉴权说明

需要登录的接口请在请求头中携带：

```http
Authorization: Bearer <token>
```

## 8. 文档转换说明

当前实现支持三类转换引擎：

- `LibreOffice`：办公文档、表格、演示文档互转
- `pdf-parse`：文本型 PDF 直接抽取文字
- `Tesseract OCR`：扫描版 PDF 和图片识别文字后输出文档

支持以下主类型：

- 文本文档：`doc`、`docx`、`odt`、`rtf`、`txt`、`html`
- 表格文档：`xls`、`xlsx`、`ods`、`csv`
- 演示文档：`ppt`、`pptx`、`odp`
- PDF 文档：`pdf`
- 图片 OCR：`png`、`jpg`、`jpeg`、`bmp`、`tif`、`tiff`、`webp`

常见目标格式：

- 文本文档可转：`pdf`、`docx`、`odt`、`html`、`txt`
- 表格文档可转：`pdf`、`xlsx`、`csv`、`html`
- 演示文档可转：`pdf`、`pptx`
- PDF 可转：`txt`、`docx`
- 图片可转：`txt`、`docx`

注意：

- 上传接口字段名固定为 `file`
- `storage/uploads/`、`storage/converted/` 仅作转换临时目录，不作为持久化存储
- 源文件与结果文件会在转换完成后上传到 OSS，数据库保存 `sourceKey`、`targetKey`、`pdfKey` 以及对应链接
- `PDF -> DOCX` 和图片转 `DOCX/TXT` 的结果是文本提取版，不保证原始排版
- 文本型 PDF 优先直接抽取文字；扫描版 PDF 会自动回退到 OCR

˛## 9. Postman 测试示例

### 注册

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "username": "微信用户",
  "mobile": "13800138000",
  "email": "test@example.com",
  "password": "123456"
}
```

### 登录

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "account": "13800138000",
  "password": "123456"
}
```

### 获取当前用户资料

```http
GET /api/user/profile
Authorization: Bearer <token>
```

### 更新当前用户资料

```http
PUT /api/user/profile
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "username": "新的昵称",
  "avatar": "https://example.com/avatar.jpg",
  "email": "new@example.com"
}
```

### 上传并转换文档

```http
POST /api/conversions
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

表单字段：

- `file`: 选择本地文件
- `targetFormat`: `pdf` / `docx` / `xlsx` / `pptx` / `html` / `txt` / `csv`

返回示例：

```json
{
  "code": 0,
  "message": "转换成功",
  "data": {
    "record": {
      "_id": "661b6b8d7f6d6b5c8d001234",
      "toolType": "pdf-to-docx",
      "sourceFileName": "扫描合同.pdf",
      "targetFileName": "扫描合同.docx",
      "targetFormat": "docx",
      "status": "success",
      "sourceKey": "source/661b6b8d7f6d6b5c8d001234/1713510000_abcd1234_scan.pdf",
      "targetKey": "result/661b6b8d7f6d6b5c8d001234/1713510010_dcba4321_scan.docx",
      "sourceUrl": "https://doc-converter-pdf.oss-cn-shenzhen.aliyuncs.com/source/...",
      "downloadUrl": "https://doc-converter-pdf.oss-cn-shenzhen.aliyuncs.com/result/..."
    }
  }
}
```

### 下载转换结果

```http
GET /api/conversions/:id/download
Authorization: Bearer <token>
```

### 提交反馈

```http
POST /api/feedback
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "content": "希望增加更多格式支持",
  "contact": "13800138000"
}
```

## 10. 说明

- 密码使用 `bcryptjs` 加密存储
- JWT 密钥和 MongoDB 连接地址会根据 `NODE_ENV` 从对应环境文件读取
- 查询用户信息默认不返回密码
- `records`、`browse-history`、`feedback` 已支持基础分页
- 所有公开内容列表默认只返回 `status=true` 且 `isDeleted=false` 的数据
- 文档转换依赖系统安装的 `LibreOffice`
- OCR 能力依赖系统安装的 `Tesseract OCR`
- 扫描版 PDF OCR 依赖系统安装的 `pdftoppm`（通常来自 `poppler`）
- 转换成功后，记录中会包含 `sourceKey`、`targetKey`、`pdfKey`、`downloadUrl`、`targetFormat`
- 本地磁盘目录只承担任务执行期间的临时文件角色，持久化文件统一落到 OSS

## 11. 后续优化建议

当前版本已经可运行，但如果后续要上线或提升稳定性，建议按下面方向继续优化。

### 1. 转换任务异步化

当前 `/api/conversions` 是同步执行，文件较大或 OCR 较慢时，请求会阻塞较久。

建议后续改成：

- 上传后先创建任务，立即返回任务 `id`
- 转换逻辑放入异步队列执行，例如 `Bull` / `BullMQ`
- 前端通过轮询或 WebSocket 查询任务状态
- 记录更细的任务阶段，例如 `queued`、`processing`、`success`、`failed`

### 2. 文件自动清理

当前版本已经在任务完成后清理本地临时文件，但仍建议补充更完整的临时文件治理和 OSS 生命周期策略。

建议后续增加：

- 定时兜底清理脚本，处理异常中断后残留的临时目录
- 为 OSS bucket 配置生命周期策略，例如自动转低频或定期删除
- 清理数据库里已经失效的下载记录
- 对下载次数、最后访问时间做记录，便于策略清理
- 根据业务要求增加冷热分层或归档策略

### 3. OCR 与 PDF 转 Word 能力增强

当前 `PDF -> DOCX` 和图片转文档属于“文本提取版”，不保留原始版式。

建议后续增强：

- 引入版面分析能力，识别段落、表格、标题层级
- 针对扫描件加入图片预处理，例如去噪、二值化、旋转矫正
- 根据业务场景拆分“纯文本提取”和“版式还原”两种模式
- 如有更高还原要求，可接入第三方文档解析/OCR 服务

### 4. 安全性增强

当前版本已具备基础鉴权，但还缺少生产环境常见防护。

建议后续增加：

- 登录接口限流，防止暴力破解
- 上传接口限流，防止滥用
- 上传文件 MIME 类型与扩展名双重校验
- 文件内容安全检查，避免恶意脚本或异常文件
- 增加 `helmet`、更严格的 `cors` 白名单配置
- JWT 刷新机制与多端登录策略

### 5. 观测性与排障能力

当前日志以开发调试为主，线上排障信息还不够完整。

建议后续增加：

- 结构化日志，记录用户、任务、耗时、失败原因
- 转换链路埋点，例如上传耗时、OCR 耗时、导出耗时
- 错误告警，例如飞书、企业微信、邮件告警
- 健康检查扩展为数据库、磁盘空间、依赖命令可用性检查

### 6. 数据模型与接口增强

当前记录模型已够用，但还可以进一步产品化。

建议后续增加：

- 任务状态详情字段，例如开始时间、结束时间、处理耗时
- 支持失败重试
- 支持删除记录时联动删除文件
- 支持按类型、状态、时间范围筛选转换记录
- 支持分页排序参数白名单校验

### 7. 存储与部署优化

当前默认使用本地磁盘存储，更适合开发或单机部署。

建议后续增加：

- Dockerfile 与 docker-compose
- Nginx 反向代理与静态/下载加速
- MongoDB、Redis、应用服务分离部署
- 文件迁移到云存储，应用层只保存元数据
- 多实例部署时引入共享存储或对象存储

### 8. 前端协作能力

为了让微信小程序端更容易接入，建议后续补充：

- 上传前获取支持格式接口缓存机制
- 任务状态查询接口或消息通知机制
- 更明确的错误码枚举，而不仅仅是错误文案
- 小程序端上传、轮询、下载的完整联调示例

### 9. 测试与质量保障

当前还没有补自动化测试。

建议后续增加：

- `Jest` / `Supertest` 接口测试
- 认证模块单元测试
- 转换服务集成测试
- OCR 失败、依赖缺失、超时等异常场景测试
- CI 流程，例如 GitHub Actions 或 Jenkins
