require('../config/loadEnv');

const connectDB = require('../config/db');
const Banner = require('../models/Banner');
const Faq = require('../models/Faq');
const Template = require('../models/Template');
const ServiceConfig = require('../models/ServiceConfig');
const User = require('../models/User');

// 初始化 Banner 示例数据。
const banners = [
  {
    title: 'PDF 转 Word',
    image: 'https://example.com/images/banner-pdf-word.jpg',
    link: '/pages/tools/detail?type=pdf-to-word',
    sort: 1,
    status: true
  },
  {
    title: 'Word 转 PDF',
    image: 'https://example.com/images/banner-word-pdf.jpg',
    link: '/pages/tools/detail?type=word-to-pdf',
    sort: 2,
    status: true
  },
  {
    title: 'PPT 转 PDF',
    image: 'https://example.com/images/banner-ppt-pdf.jpg',
    link: '/pages/tools/detail?type=ppt-to-pdf',
    sort: 3,
    status: true
  }
];

// 初始化 FAQ 示例数据。
const faqs = [
  {
    question: '支持哪些文档格式转换？',
    answer: '当前支持 Word、PDF、PPT、Excel 等常用办公文档之间的格式转换。',
    sort: 1,
    status: true
  },
  {
    question: '转换后的文件会保留多久？',
    answer: '默认保留 7 天，建议及时下载并自行备份。',
    sort: 2,
    status: true
  },
  {
    question: '文件上传失败怎么办？',
    answer: '请检查网络状态、文件大小和文件格式，必要时重新上传。',
    sort: 3,
    status: true
  },
  {
    question: '为什么转换速度较慢？',
    answer: '大文件或高峰期任务较多时，处理时间会相应增加。',
    sort: 4,
    status: true
  }
];

// 初始化模板示例数据。
const templates = [
  {
    title: '简约求职简历',
    category: 'resume',
    description: '适合通用岗位投递的简洁版简历模板。',
    cover: 'https://example.com/images/template-resume-1.jpg',
    downloadUrl: 'https://example.com/templates/resume-simple.docx',
    sort: 1,
    status: true
  },
  {
    title: '商务合同模板',
    category: 'contract',
    description: '适用于通用商务合作场景的合同模板。',
    cover: 'https://example.com/images/template-contract-1.jpg',
    downloadUrl: 'https://example.com/templates/business-contract.docx',
    sort: 2,
    status: true
  },
  {
    title: '会议纪要模板',
    category: 'meeting',
    description: '包含会议主题、议题、结论和待办事项。',
    cover: 'https://example.com/images/template-meeting-1.jpg',
    downloadUrl: 'https://example.com/templates/meeting-notes.docx',
    sort: 3,
    status: true
  },
  {
    title: '项目周报模板',
    category: 'report',
    description: '适用于团队协作和项目进度同步。',
    cover: 'https://example.com/images/template-report-1.jpg',
    downloadUrl: 'https://example.com/templates/project-weekly-report.docx',
    sort: 4,
    status: true
  }
];

// 初始化客服配置示例数据。
const serviceConfig = {
  name: '官方客服',
  wechat: 'service_wechat',
  email: 'service@example.com',
  workingHours: '09:00-18:00',
  status: true
};

// 初始化后台管理员账号信息。
const adminSeed = {
  username: process.env.ADMIN_USERNAME || 'admin',
  mobile: process.env.ADMIN_MOBILE || '13800000000',
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'Admin123456'
};

// 方法：runSeed，负责异步处理当前业务步骤。
const runSeed = async () => {
  try {
    await connectDB();

    await Promise.all([
      Banner.deleteMany({}),
      Faq.deleteMany({}),
      Template.deleteMany({}),
      ServiceConfig.deleteMany({})
    ]);

    await Promise.all([
      Banner.insertMany(banners),
      Faq.insertMany(faqs),
      Template.insertMany(templates),
      ServiceConfig.create(serviceConfig)
    ]);

    await Promise.all([
      User.updateMany(
        {
          role: {
            $exists: false
          }
        },
        {
          $set: {
            role: 'user'
          }
        }
      ),
      User.updateMany(
        {
          status: {
            $exists: false
          }
        },
        {
          $set: {
            status: 'active'
          }
        }
      )
    ]);

    let adminUser = await User.findOne({ mobile: adminSeed.mobile });

    if (!adminUser) {
      adminUser = new User({
        username: adminSeed.username,
        mobile: adminSeed.mobile,
        email: adminSeed.email,
        password: adminSeed.password,
        role: 'admin',
        status: 'active',
        avatar: '',
        isDeleted: false
      });
    } else {
      adminUser.username = adminSeed.username;
      adminUser.email = adminSeed.email;
      adminUser.password = adminSeed.password;
      adminUser.role = 'admin';
      adminUser.status = 'active';
      adminUser.isDeleted = false;
    }

    await adminUser.save();

    console.log(`Seed data inserted successfully. Admin account: ${adminSeed.mobile}`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
};

runSeed();
