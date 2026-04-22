# Node.js + Express + MongoDB 后端代码生成说明（可直接复制给 Codex）

你现在是一名资深 Node.js 后端工程师，请直接为我生成一个 **可运行的后端项目代码**，用于支持一个“文档格式转换工具”微信小程序。

## 一、技术栈要求

- Node.js
- Express
- MongoDB
- Mongoose
- JWT 鉴权
- bcryptjs 密码加密
- cors
- dotenv
- morgan
- nodemon

## 二、项目目标

提供小程序前端所需的完整后端接口，包括：

1. 用户注册
2. 用户登录
3. 获取当前用户资料
4. Banner 数据
5. 转换记录
6. 浏览记录
7. 反馈提交
8. FAQ 列表
9. 文档模板列表
10. 客服信息

## 三、接口设计要求

接口统一前缀：`/api`

返回格式统一如下：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

错误时：

```json
{
  "code": 1,
  "message": "错误信息",
  "data": null
}
```

## 四、功能模块要求

### 1）认证模块

#### 注册
- 接口：`POST /api/auth/register`
- 请求参数：
```json
{
  "username": "微信用户",
  "mobile": "13800138000",
  "email": "test@example.com",
  "password": "123456"
}
```

校验要求：
- username 必填
- mobile 必填且格式正确
- password 长度至少 6 位
- mobile 唯一
- email 可选，但如果传了要做格式校验
- 密码入库前必须加密

返回：
- 注册成功信息
- 可选择直接返回用户信息，也可只返回成功消息

#### 登录
- 接口：`POST /api/auth/login`
- 支持用 **手机号或用户名 + 密码** 登录
- 请求参数：
```json
{
  "account": "13800138000",
  "password": "123456"
}
```

返回：
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "xxx",
      "username": "微信用户",
      "mobile": "13800138000",
      "avatar": "",
      "email": "test@example.com"
    }
  }
}
```

### 2）用户模块

#### 获取当前用户资料
- 接口：`GET /api/user/profile`
- 需要 JWT
- 从 token 中解析用户 id
- 返回当前用户信息

#### 更新用户资料（可选但建议实现）
- 接口：`PUT /api/user/profile`
- 可更新字段：`username`、`avatar`、`email`

### 3）Banner 模块

#### 获取 banner 列表
- 接口：`GET /api/banners`
- 返回首页 banner 数据
- 先用数据库存储

Banner 字段建议：
- title
- image
- link
- sort
- status

### 4）转换记录模块

#### 新增转换记录
- 接口：`POST /api/records`
- 需要 JWT
- 字段建议：
  - toolType（如 `doc-to-pdf`）
  - sourceFileName
  - targetFileName
  - status（success / failed / processing）
  - createdAt

#### 获取我的转换记录
- 接口：`GET /api/records`
- 需要 JWT
- 按时间倒序

### 5）浏览记录模块

#### 新增浏览记录
- 接口：`POST /api/browse-history`
- 需要 JWT
- 字段建议：
  - title
  - type
  - path

#### 获取我的浏览记录
- 接口：`GET /api/browse-history`
- 需要 JWT

### 6）反馈模块

#### 提交反馈
- 接口：`POST /api/feedback`
- 需要 JWT
- 字段：
  - content
  - contact（可选）

#### 获取我的反馈列表（可选）
- 接口：`GET /api/feedback`
- 需要 JWT

### 7）FAQ 模块

#### 获取常见问题列表
- 接口：`GET /api/faqs`
- 不需要登录
- 字段：
  - question
  - answer
  - sort
  - status

### 8）模板模块

#### 获取文档模板列表
- 接口：`GET /api/templates`
- 不需要登录
- 字段：
  - title
  - category
  - description
  - cover
  - downloadUrl
  - sort
  - status

### 9）客服模块

#### 获取客服信息
- 接口：`GET /api/service`
- 不需要登录
- 返回内容示例：
```json
{
  "code": 0,
  "data": {
    "name": "官方客服",
    "wechat": "service_wechat",
    "email": "service@example.com",
    "workingHours": "09:00-18:00"
  }
}
```

## 五、数据库模型要求

请生成以下 Mongoose Model：

- `User`
- `Banner`
- `Record`
- `BrowseHistory`
- `Feedback`
- `Faq`
- `Template`
- `ServiceConfig`

### User 字段建议
- username
- mobile
- email
- password
- avatar
- createdAt
- updatedAt

### 其余模型请根据接口自行合理设计

## 六、项目结构要求

请生成一个清晰的后端目录结构，例如：

```bash
server/
  ├─ app.js
  ├─ package.json
  ├─ .env.example
  ├─ config/
  │   └─ db.js
  ├─ controllers/
  ├─ models/
  ├─ routes/
  ├─ middlewares/
  ├─ utils/
  ├─ seed/
  │   └─ seedData.js
  └─ README.md
```

## 七、中间件要求

请实现以下中间件：

1. `authMiddleware`
   - 解析 `Authorization: Bearer <token>`
   - 校验 JWT
   - 挂载 `req.user`

2. `errorMiddleware`
   - 统一错误响应

3. 参数校验可以自行实现，也可以直接在 controller 中做

## 八、种子数据要求

请提供一个初始化脚本，往数据库插入：

- 2~3 条 banner
- 3~5 条 FAQ
- 3~5 条模板
- 1 条客服配置

并说明如何运行种子脚本。

## 九、安全和规范要求

- 密码必须加密存储
- JWT secret 从 `.env` 读取
- MongoDB 连接地址从 `.env` 读取
- 不要把敏感信息写死
- 对接口参数做基本校验
- 查询当前用户信息时，不返回 password

## 十、README 要求

请同时生成 `README.md`，至少包含：

1. 安装依赖
2. 配置 `.env`
3. 启动开发环境
4. 运行种子数据
5. 接口列表说明
6. Postman 测试示例

## 十一、加分项（建议实现）

如果你愿意，可以顺手补上：

- 分页能力（如 records / feedback）
- 数据软删除字段
- 通用响应工具函数
- 请求日志
- 更规范的 controller/service 分层

## 十二、输出要求（非常重要）

请你直接输出：

1. 完整项目目录结构
2. 每个文件的完整代码
3. package.json 依赖要完整
4. 所有关键接口都必须可运行
5. 不要只解释思路，直接给代码
6. 默认我会把你输出的内容直接保存为项目文件运行

请开始生成完整的 Node.js + Express + MongoDB 后端项目代码。
