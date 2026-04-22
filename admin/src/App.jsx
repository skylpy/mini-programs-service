import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import './App.css';

// 当前浏览器本地存储中用于保存管理员令牌的键名。
const TOKEN_KEY = 'mini_program_admin_token';

// 后台管理系统左侧导航面板的配置项。
const PANELS = [
  { key: 'dashboard', label: '总览', subtitle: '查看平台运行状态和关键指标' },
  { key: 'users', label: '用户', subtitle: '管理用户资料、角色和状态' },
  { key: 'records', label: '记录', subtitle: '查看全部转换任务和结果' },
  { key: 'logs', label: '日志', subtitle: '排查请求链路、错误信息和后台操作痕迹' },
  { key: 'feedbacks', label: '反馈', subtitle: '处理用户反馈并记录回复' },
  { key: 'banners', label: 'Banner', subtitle: '维护首页轮播内容' },
  { key: 'faqs', label: 'FAQ', subtitle: '维护常见问题内容' },
  { key: 'templates', label: '模板', subtitle: '维护文档模板资源' },
  { key: 'service', label: '客服', subtitle: '维护客服和联系配置' }
];

// 登录表单的默认值。
const initialLoginForm = {
  account: '13800000000',
  password: 'Admin123456'
};

// Banner 编辑表单的默认值。
const initialBannerForm = {
  id: '',
  title: '',
  image: '',
  link: '',
  sort: 0,
  status: true
};

// FAQ 编辑表单的默认值。
const initialFaqForm = {
  id: '',
  question: '',
  answer: '',
  sort: 0,
  status: true
};

// 模板编辑表单的默认值。
const initialTemplateForm = {
  id: '',
  title: '',
  category: '',
  description: '',
  cover: '',
  downloadUrl: '',
  sort: 0,
  status: true
};

// 客服配置表单的默认值。
const initialServiceForm = {
  name: '',
  wechat: '',
  email: '',
  workingHours: '',
  status: true
};

// 用户列表筛选条件的默认值。
const initialUserFilters = {
  keyword: '',
  role: '',
  status: '',
  page: 1,
  pageSize: 10
};

// 记录列表筛选条件的默认值。
const initialRecordFilters = {
  keyword: '',
  status: '',
  toolType: '',
  page: 1,
  pageSize: 10
};

// 操作日志列表筛选条件的默认值。
const initialLogFilters = {
  keyword: '',
  method: '',
  actorType: '',
  success: '',
  statusCode: '',
  page: 1,
  pageSize: 10
};

// 反馈列表筛选条件的默认值。
const initialFeedbackFilters = {
  keyword: '',
  status: '',
  page: 1,
  pageSize: 10
};

// 方法：formatDateTime，负责当前模块中的对应逻辑。
function formatDateTime(value) {
  if (!value) {
    return '--';
  }

  return new Date(value).toLocaleString('zh-CN', {
    hour12: false
  });
}

// 方法：buildQuery，负责当前模块中的对应逻辑。
function buildQuery(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// 方法：formatJsonSnippet，负责把对象压缩成适合表格展示的短文本。
function formatJsonSnippet(value) {
  if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) {
    return '--';
  }

  try {
    const text = JSON.stringify(value);
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
  } catch (error) {
    return String(value);
  }
}

// 方法：formatJsonPretty，负责把对象格式化成详情展示文本。
function formatJsonPretty(value) {
  if (value === undefined || value === null) {
    return '--';
  }

  if (typeof value === 'string') {
    return value || '--';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

// 方法：apiRequest，负责统一封装后台接口请求和错误处理。
async function apiRequest(path, options = {}) {
  const { token, method = 'GET', body } = options;
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const rawText = await response.text();
  let payload = {};

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch (error) {
      payload = {
        message: rawText
      };
    }
  }

  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || '请求失败');
  }

  return payload.data;
}

// 方法：toBoolean，负责当前模块中的对应逻辑。
function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  return String(value) === 'true';
}

// 方法：Pagination，负责当前模块中的对应逻辑。
function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <button
        type="button"
        className="ghost-button"
        disabled={pagination.page <= 1}
        onClick={() => onChange(pagination.page - 1)}
      >
        上一页
      </button>
      <span>
        第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
      </span>
      <button
        type="button"
        className="ghost-button"
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => onChange(pagination.page + 1)}
      >
        下一页
      </button>
    </div>
  );
}

// 方法：StatCard，负责当前模块中的对应逻辑。
function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong className={accent ? 'accent-text' : ''}>{value}</strong>
    </div>
  );
}

// 方法：StatusPill，负责当前模块中的对应逻辑。
function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`status-pill status-pill-${tone}`}>{children}</span>;
}

// 方法：App，负责当前模块中的对应逻辑。
function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY) || '');
  const [authStatus, setAuthStatus] = useState(token ? 'checking' : 'guest');
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [loginError, setLoginError] = useState('');
  const [profile, setProfile] = useState(null);
  const [activePanel, setActivePanel] = useState('dashboard');
  const [notice, setNotice] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [sectionLoading, setSectionLoading] = useState({});
  const [dashboard, setDashboard] = useState(null);
  const [usersData, setUsersData] = useState({ list: [], pagination: null });
  const [recordsData, setRecordsData] = useState({ list: [], pagination: null });
  const [logsData, setLogsData] = useState({ list: [], pagination: null });
  const [selectedLog, setSelectedLog] = useState(null);
  const [feedbacksData, setFeedbacksData] = useState({ list: [], pagination: null });
  const [banners, setBanners] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [serviceForm, setServiceForm] = useState(initialServiceForm);
  const [bannerForm, setBannerForm] = useState(initialBannerForm);
  const [faqForm, setFaqForm] = useState(initialFaqForm);
  const [templateForm, setTemplateForm] = useState(initialTemplateForm);
  const [userFilters, setUserFilters] = useState(initialUserFilters);
  const [recordFilters, setRecordFilters] = useState(initialRecordFilters);
  const [logFilters, setLogFilters] = useState(initialLogFilters);
  const [feedbackFilters, setFeedbackFilters] = useState(initialFeedbackFilters);
  const [userDrafts, setUserDrafts] = useState({});
  const [feedbackDrafts, setFeedbackDrafts] = useState({});

  const deferredUserKeyword = useDeferredValue(userFilters.keyword);
  const deferredRecordKeyword = useDeferredValue(recordFilters.keyword);
  const deferredLogKeyword = useDeferredValue(logFilters.keyword);
  const deferredFeedbackKeyword = useDeferredValue(feedbackFilters.keyword);

  const activePanelMeta = useMemo(
    () => PANELS.find((panel) => panel.key === activePanel) || PANELS[0],
    [activePanel]
  );

  // 方法：setPanelLoading，负责封装可复用的交互逻辑。
  const setPanelLoading = useCallback((key, value) => {
    setSectionLoading((current) => ({
      ...current,
      [key]: value
    }));
  }, []);

  // 方法：runPanelRequest，负责封装可复用的交互逻辑。
  const runPanelRequest = useCallback(async (key, request) => {
    setPanelLoading(key, true);

    try {
      return await request();
    } finally {
      setPanelLoading(key, false);
    }
  }, [setPanelLoading]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!token) {
      setAuthStatus('guest');
      return undefined;
    }

    let ignore = false;

    // 方法：verifyProfile，负责异步处理当前业务步骤。
    const verifyProfile = async () => {
      setAuthStatus('checking');

      try {
        const data = await apiRequest('/api/admin/profile', { token });

        if (ignore) {
          return;
        }

        setProfile(data);
        setAuthStatus('ready');
      } catch (error) {
        if (ignore) {
          return;
        }

        window.localStorage.removeItem(TOKEN_KEY);
        setToken('');
        setProfile(null);
        setAuthStatus('guest');
        setLoginError(error.message || '登录状态已失效，请重新登录');
        setNotice({ type: 'error', message: error.message || '登录状态已失效，请重新登录' });
      }
    };

    verifyProfile();

    return () => {
      ignore = true;
    };
  }, [runPanelRequest, token]);

  // 方法：handleLogout，负责当前模块中的具体处理逻辑。
  const handleLogout = (message) => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setProfile(null);
    setAuthStatus('guest');
    setActivePanel('dashboard');
    setLoginError('');

    if (message) {
      setNotice({ type: 'success', message });
    }
  };

  // 方法：loadDashboard，负责封装可复用的交互逻辑。
  const loadDashboard = useCallback(async () => {
    await runPanelRequest('dashboard', async () => {
      const data = await apiRequest('/api/admin/dashboard', { token });
      setDashboard(data);
    });
  }, [runPanelRequest, token]);

  // 方法：loadUsers，负责封装可复用的交互逻辑。
  const loadUsers = useCallback(async () => {
    const query = buildQuery({
      page: userFilters.page,
      pageSize: userFilters.pageSize,
      keyword: deferredUserKeyword.trim(),
      role: userFilters.role,
      status: userFilters.status
    });

    await runPanelRequest('users', async () => {
      const data = await apiRequest(`/api/admin/users${query}`, { token });
      setUsersData(data);

      setUserDrafts(
        Object.fromEntries(
          data.list.map((item) => [
            item.id,
            {
              username: item.username || '',
              email: item.email || '',
              avatar: item.avatar || '',
              role: item.role || 'user',
              status: item.status || 'active'
            }
          ])
        )
      );
    });
  }, [
    deferredUserKeyword,
    runPanelRequest,
    token,
    userFilters.page,
    userFilters.pageSize,
    userFilters.role,
    userFilters.status
  ]);

  // 方法：loadRecords，负责封装可复用的交互逻辑。
  const loadRecords = useCallback(async () => {
    const query = buildQuery({
      page: recordFilters.page,
      pageSize: recordFilters.pageSize,
      keyword: deferredRecordKeyword.trim(),
      status: recordFilters.status,
      toolType: recordFilters.toolType
    });

    await runPanelRequest('records', async () => {
      const data = await apiRequest(`/api/admin/records${query}`, { token });
      setRecordsData(data);
    });
  }, [
    deferredRecordKeyword,
    recordFilters.page,
    recordFilters.pageSize,
    recordFilters.status,
    recordFilters.toolType,
    runPanelRequest,
    token
  ]);

  // 方法：loadOperationLogs，负责封装可复用的交互逻辑。
  const loadOperationLogs = useCallback(async () => {
    const query = buildQuery({
      page: logFilters.page,
      pageSize: logFilters.pageSize,
      keyword: deferredLogKeyword.trim(),
      method: logFilters.method,
      actorType: logFilters.actorType,
      success: logFilters.success,
      statusCode: logFilters.statusCode
    });

    await runPanelRequest('logs', async () => {
      const data = await apiRequest(`/api/admin/operation-logs${query}`, { token });
      setLogsData(data);
      setSelectedLog((current) => {
        if (!current) {
          return data.list[0] || null;
        }

        return data.list.find((item) => item._id === current._id) || data.list[0] || null;
      });
    });
  }, [
    deferredLogKeyword,
    logFilters.actorType,
    logFilters.method,
    logFilters.page,
    logFilters.pageSize,
    logFilters.statusCode,
    logFilters.success,
    runPanelRequest,
    token
  ]);

  // 方法：loadFeedbacks，负责封装可复用的交互逻辑。
  const loadFeedbacks = useCallback(async () => {
    const query = buildQuery({
      page: feedbackFilters.page,
      pageSize: feedbackFilters.pageSize,
      keyword: deferredFeedbackKeyword.trim(),
      status: feedbackFilters.status
    });

    await runPanelRequest('feedbacks', async () => {
      const data = await apiRequest(`/api/admin/feedbacks${query}`, { token });
      setFeedbacksData(data);

      setFeedbackDrafts(
        Object.fromEntries(
          data.list.map((item) => [
            item._id,
            {
              status: item.status || 'pending',
              reply: item.reply || ''
            }
          ])
        )
      );
    });
  }, [
    deferredFeedbackKeyword,
    feedbackFilters.page,
    feedbackFilters.pageSize,
    feedbackFilters.status,
    runPanelRequest,
    token
  ]);

  // 方法：loadBanners，负责封装可复用的交互逻辑。
  const loadBanners = useCallback(async () => {
    await runPanelRequest('banners', async () => {
      const data = await apiRequest('/api/admin/banners', { token });
      setBanners(data);
    });
  }, [runPanelRequest, token]);

  // 方法：loadFaqs，负责封装可复用的交互逻辑。
  const loadFaqs = useCallback(async () => {
    await runPanelRequest('faqs', async () => {
      const data = await apiRequest('/api/admin/faqs', { token });
      setFaqs(data);
    });
  }, [runPanelRequest, token]);

  // 方法：loadTemplates，负责封装可复用的交互逻辑。
  const loadTemplates = useCallback(async () => {
    await runPanelRequest('templates', async () => {
      const data = await apiRequest('/api/admin/templates', { token });
      setTemplates(data);
    });
  }, [runPanelRequest, token]);

  // 方法：loadServiceConfig，负责封装可复用的交互逻辑。
  const loadServiceConfig = useCallback(async () => {
    await runPanelRequest('service', async () => {
      const data = await apiRequest('/api/admin/service', { token });
      setServiceForm({
        name: data.name || '',
        wechat: data.wechat || '',
        email: data.email || '',
        workingHours: data.workingHours || '',
        status: data.status ?? true
      });
    });
  }, [runPanelRequest, token]);

  useEffect(() => {
    if (authStatus !== 'ready') {
      return;
    }

    if (activePanel === 'dashboard') {
      loadDashboard();
    }
  }, [activePanel, authStatus, loadDashboard]);

  useEffect(() => {
    if (authStatus !== 'ready' || activePanel !== 'users') {
      return;
    }

    loadUsers();
  }, [activePanel, authStatus, loadUsers]);

  useEffect(() => {
    if (authStatus !== 'ready' || activePanel !== 'records') {
      return;
    }

    loadRecords();
  }, [activePanel, authStatus, loadRecords]);

  useEffect(() => {
    if (authStatus !== 'ready' || activePanel !== 'logs') {
      return;
    }

    loadOperationLogs();
  }, [activePanel, authStatus, loadOperationLogs]);

  useEffect(() => {
    if (activePanel !== 'logs') {
      setSelectedLog(null);
    }
  }, [activePanel]);

  useEffect(() => {
    if (authStatus !== 'ready' || activePanel !== 'feedbacks') {
      return;
    }

    loadFeedbacks();
  }, [activePanel, authStatus, loadFeedbacks]);

  useEffect(() => {
    if (authStatus !== 'ready') {
      return;
    }

    if (activePanel === 'banners') {
      loadBanners();
    }

    if (activePanel === 'faqs') {
      loadFaqs();
    }

    if (activePanel === 'templates') {
      loadTemplates();
    }

    if (activePanel === 'service') {
      loadServiceConfig();
    }
  }, [activePanel, authStatus, loadBanners, loadFaqs, loadServiceConfig, loadTemplates]);

  // 方法：submitLogin，负责异步处理当前业务步骤。
  const submitLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    setBusyKey('login');

    try {
      const data = await apiRequest('/api/admin/auth/login', {
        method: 'POST',
        body: loginForm
      });

      window.localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setProfile(data.user);
      setAuthStatus('ready');
      setActivePanel('dashboard');
      setLoginError('');
      setNotice({ type: 'success', message: `欢迎回来，${data.user.username}` });
    } catch (error) {
      setLoginError(error.message || '登录失败，请检查账号和密码');
      setNotice({ type: 'error', message: error.message || '登录失败' });
    } finally {
      setBusyKey('');
    }
  };

  // 方法：saveUser，负责异步处理当前业务步骤。
  const saveUser = async (userId) => {
    const draft = userDrafts[userId];

    if (!draft) {
      return;
    }

    setBusyKey(`user-${userId}`);

    try {
      await apiRequest(`/api/admin/users/${userId}`, {
        token,
        method: 'PATCH',
        body: draft
      });

      setNotice({ type: 'success', message: '用户已更新' });
      await loadUsers();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || '更新用户失败' });
    } finally {
      setBusyKey('');
    }
  };

  // 方法：saveFeedback，负责异步处理当前业务步骤。
  const saveFeedback = async (feedbackId) => {
    const draft = feedbackDrafts[feedbackId];

    if (!draft) {
      return;
    }

    setBusyKey(`feedback-${feedbackId}`);

    try {
      await apiRequest(`/api/admin/feedbacks/${feedbackId}`, {
        token,
        method: 'PATCH',
        body: draft
      });

      setNotice({ type: 'success', message: '反馈已处理' });
      await loadFeedbacks();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || '处理反馈失败' });
    } finally {
      setBusyKey('');
    }
  };

  // 方法：saveBanner，负责异步处理当前业务步骤。
  const saveBanner = async (event) => {
    event.preventDefault();
    setBusyKey('banner-save');

    try {
      const payload = {
        title: bannerForm.title,
        image: bannerForm.image,
        link: bannerForm.link,
        sort: Number(bannerForm.sort),
        status: bannerForm.status
      };

      if (bannerForm.id) {
        await apiRequest(`/api/admin/banners/${bannerForm.id}`, {
          token,
          method: 'PUT',
          body: payload
        });
      } else {
        await apiRequest('/api/admin/banners', {
          token,
          method: 'POST',
          body: payload
        });
      }

      setNotice({ type: 'success', message: bannerForm.id ? 'Banner 已更新' : 'Banner 已创建' });
      setBannerForm(initialBannerForm);
      await loadBanners();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || '保存 Banner 失败' });
    } finally {
      setBusyKey('');
    }
  };

  // 方法：saveFaq，负责异步处理当前业务步骤。
  const saveFaq = async (event) => {
    event.preventDefault();
    setBusyKey('faq-save');

    try {
      const payload = {
        question: faqForm.question,
        answer: faqForm.answer,
        sort: Number(faqForm.sort),
        status: faqForm.status
      };

      if (faqForm.id) {
        await apiRequest(`/api/admin/faqs/${faqForm.id}`, {
          token,
          method: 'PUT',
          body: payload
        });
      } else {
        await apiRequest('/api/admin/faqs', {
          token,
          method: 'POST',
          body: payload
        });
      }

      setNotice({ type: 'success', message: faqForm.id ? 'FAQ 已更新' : 'FAQ 已创建' });
      setFaqForm(initialFaqForm);
      await loadFaqs();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || '保存 FAQ 失败' });
    } finally {
      setBusyKey('');
    }
  };

  // 方法：saveTemplate，负责异步处理当前业务步骤。
  const saveTemplate = async (event) => {
    event.preventDefault();
    setBusyKey('template-save');

    try {
      const payload = {
        title: templateForm.title,
        category: templateForm.category,
        description: templateForm.description,
        cover: templateForm.cover,
        downloadUrl: templateForm.downloadUrl,
        sort: Number(templateForm.sort),
        status: templateForm.status
      };

      if (templateForm.id) {
        await apiRequest(`/api/admin/templates/${templateForm.id}`, {
          token,
          method: 'PUT',
          body: payload
        });
      } else {
        await apiRequest('/api/admin/templates', {
          token,
          method: 'POST',
          body: payload
        });
      }

      setNotice({
        type: 'success',
        message: templateForm.id ? '模板已更新' : '模板已创建'
      });
      setTemplateForm(initialTemplateForm);
      await loadTemplates();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || '保存模板失败' });
    } finally {
      setBusyKey('');
    }
  };

  // 方法：saveService，负责异步处理当前业务步骤。
  const saveService = async (event) => {
    event.preventDefault();
    setBusyKey('service-save');

    try {
      await apiRequest('/api/admin/service', {
        token,
        method: 'PUT',
        body: serviceForm
      });

      setNotice({ type: 'success', message: '客服配置已更新' });
      await loadServiceConfig();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || '保存客服配置失败' });
    } finally {
      setBusyKey('');
    }
  };

  // 方法：removeItem，负责异步处理当前业务步骤。
  const removeItem = async (path, loader, message) => {
    setBusyKey(path);

    try {
      await apiRequest(path, {
        token,
        method: 'DELETE'
      });

      setNotice({ type: 'success', message });
      await loader();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || '删除失败' });
    } finally {
      setBusyKey('');
    }
  };

  // 方法：renderDashboard，负责当前模块中的具体处理逻辑。
  const renderDashboard = () => {
    const overview = dashboard?.overview;
    const recent = dashboard?.recent;

    return (
      <div className="stack">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>概览仪表盘</h2>
              <p>今天先看清楚平台状态，再决定下一步处理节奏。</p>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={loadDashboard}
              disabled={sectionLoading.dashboard}
            >
              {sectionLoading.dashboard ? '刷新中...' : '刷新数据'}
            </button>
          </div>
          <div className="stats-grid">
            <StatCard label="普通用户" value={overview?.users?.totalUsers ?? 0} accent />
            <StatCard label="活跃用户" value={overview?.users?.activeUsers ?? 0} />
            <StatCard label="管理员" value={overview?.users?.adminUsers ?? 0} />
            <StatCard label="全部记录" value={overview?.records?.totalRecords ?? 0} />
            <StatCard label="今日转换" value={overview?.records?.todayRecords ?? 0} />
            <StatCard label="待处理反馈" value={overview?.feedbacks?.pendingFeedbacks ?? 0} />
            <StatCard label="启用 Banner" value={overview?.contents?.activeBanners ?? 0} />
            <StatCard label="启用 FAQ" value={overview?.contents?.activeFaqs ?? 0} />
            <StatCard label="启用模板" value={overview?.contents?.activeTemplates ?? 0} />
          </div>
        </section>

        <section className="triple-grid">
          <div className="panel">
            <div className="section-heading compact">
              <div>
                <h3>最近用户</h3>
                <p>新注册或最近可见的用户。</p>
              </div>
            </div>
            <div className="mini-list">
              {(recent?.users || []).map((item) => (
                <article key={item.id} className="mini-list-item">
                  <div>
                    <strong>{item.username}</strong>
                    <span>{item.mobile}</span>
                  </div>
                  <small>{formatDateTime(item.createdAt)}</small>
                </article>
              ))}
              {!recent?.users?.length && <div className="empty-state">暂时还没有用户数据。</div>}
            </div>
          </div>

          <div className="panel">
            <div className="section-heading compact">
              <div>
                <h3>最近记录</h3>
                <p>优先关注失败和处理中任务。</p>
              </div>
            </div>
            <div className="mini-list">
              {(recent?.records || []).map((item) => (
                <article key={item._id} className="mini-list-item">
                  <div>
                    <strong>{item.sourceFileName}</strong>
                    <span>{item.user?.username || '未知用户'}</span>
                  </div>
                  <small>{item.status}</small>
                </article>
              ))}
              {!recent?.records?.length && <div className="empty-state">暂无转换记录。</div>}
            </div>
          </div>

          <div className="panel">
            <div className="section-heading compact">
              <div>
                <h3>最近反馈</h3>
                <p>待处理项会优先显示在反馈页。</p>
              </div>
            </div>
            <div className="mini-list">
              {(recent?.feedbacks || []).map((item) => (
                <article key={item._id} className="mini-list-item">
                  <div>
                    <strong>{item.user?.username || '匿名用户'}</strong>
                    <span>{item.content}</span>
                  </div>
                  <small>{item.status}</small>
                </article>
              ))}
              {!recent?.feedbacks?.length && <div className="empty-state">暂无反馈记录。</div>}
            </div>
          </div>
        </section>
      </div>
    );
  };

  // 方法：renderUsers，负责当前模块中的具体处理逻辑。
  const renderUsers = () => (
    <div className="stack">
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>用户管理</h2>
            <p>支持按关键字、角色、状态筛选，并直接在列表中保存修改。</p>
          </div>
        </div>
        <div className="toolbar">
          <input
            className="field"
            placeholder="搜索用户名 / 手机号 / 邮箱"
            value={userFilters.keyword}
            onChange={(event) =>
              setUserFilters((current) => ({ ...current, keyword: event.target.value, page: 1 }))
            }
          />
          <select
            className="field"
            value={userFilters.role}
            onChange={(event) =>
              setUserFilters((current) => ({ ...current, role: event.target.value, page: 1 }))
            }
          >
            <option value="">全部角色</option>
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
          </select>
          <select
            className="field"
            value={userFilters.status}
            onChange={(event) =>
              setUserFilters((current) => ({ ...current, status: event.target.value, page: 1 }))
            }
          >
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="disabled">禁用</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>邮箱 / 头像</th>
                <th>角色</th>
                <th>状态</th>
                <th>最近登录</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {usersData.list.map((item) => {
                const draft = userDrafts[item.id] || {};
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-stack">
                        <input
                          className="table-input"
                          value={draft.username || ''}
                          onChange={(event) =>
                            setUserDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                username: event.target.value
                              }
                            }))
                          }
                        />
                        <span>{item.mobile}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <input
                          className="table-input"
                          value={draft.email || ''}
                          onChange={(event) =>
                            setUserDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                email: event.target.value
                              }
                            }))
                          }
                        />
                        <input
                          className="table-input"
                          placeholder="头像 URL"
                          value={draft.avatar || ''}
                          onChange={(event) =>
                            setUserDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                avatar: event.target.value
                              }
                            }))
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <select
                        className="table-select"
                        value={draft.role || 'user'}
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              ...current[item.id],
                              role: event.target.value
                            }
                          }))
                        }
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="table-select"
                        value={draft.status || 'active'}
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              ...current[item.id],
                              status: event.target.value
                            }
                          }))
                        }
                      >
                        <option value="active">正常</option>
                        <option value="disabled">禁用</option>
                      </select>
                    </td>
                    <td>{formatDateTime(item.lastLoginAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="primary-button slim"
                        onClick={() => saveUser(item.id)}
                        disabled={busyKey === `user-${item.id}`}
                      >
                        {busyKey === `user-${item.id}` ? '保存中...' : '保存'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!usersData.list.length && <div className="empty-state">没有符合条件的用户。</div>}
        </div>
        <Pagination
          pagination={usersData.pagination}
          onChange={(page) => setUserFilters((current) => ({ ...current, page }))}
        />
      </section>
    </div>
  );

  // 方法：renderRecords，负责当前模块中的具体处理逻辑。
  const renderRecords = () => (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>转换记录</h2>
          <p>方便快速定位失败任务、处理中任务和高频工具类型。</p>
        </div>
      </div>
      <div className="toolbar">
        <input
          className="field"
          placeholder="搜索文件名、工具类型或错误信息"
          value={recordFilters.keyword}
          onChange={(event) =>
            setRecordFilters((current) => ({ ...current, keyword: event.target.value, page: 1 }))
          }
        />
        <select
          className="field"
          value={recordFilters.status}
          onChange={(event) =>
            setRecordFilters((current) => ({ ...current, status: event.target.value, page: 1 }))
          }
        >
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
          <option value="processing">处理中</option>
        </select>
        <input
          className="field"
          placeholder="工具类型，如 pdf-to-word"
          value={recordFilters.toolType}
          onChange={(event) =>
            setRecordFilters((current) => ({ ...current, toolType: event.target.value, page: 1 }))
          }
        />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>源文件</th>
              <th>目标格式</th>
              <th>工具类型</th>
              <th>状态</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            {recordsData.list.map((item) => (
              <tr key={item._id}>
                <td>
                  <div className="cell-stack">
                    <strong>{item.user?.username || '未知用户'}</strong>
                    <span>{item.user?.mobile || '--'}</span>
                  </div>
                </td>
                <td>
                  <div className="cell-stack">
                    <strong>{item.sourceFileName}</strong>
                    <span>{item.targetFileName || '--'}</span>
                  </div>
                </td>
                <td>{item.targetFormat || '--'}</td>
                <td>{item.toolType}</td>
                <td>
                  <StatusPill
                    tone={
                      item.status === 'success'
                        ? 'success'
                        : item.status === 'failed'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {item.status}
                  </StatusPill>
                </td>
                <td>{formatDateTime(item.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!recordsData.list.length && <div className="empty-state">暂时还没有转换记录。</div>}
      </div>
      <Pagination
        pagination={recordsData.pagination}
        onChange={(page) => setRecordFilters((current) => ({ ...current, page }))}
      />
    </section>
  );

  // 方法：renderLogs，负责当前模块中的具体处理逻辑。
  const renderLogs = () => (
    <div className="stack">
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>操作日志</h2>
            <p>查看后台所有接口请求、错误消息、操作者和参数快照，方便排查线上问题。</p>
          </div>
        </div>
        <div className="toolbar toolbar-dense">
          <input
            className="field"
            placeholder="搜索路径、账号、手机号、错误信息、IP"
            value={logFilters.keyword}
            onChange={(event) =>
              setLogFilters((current) => ({ ...current, keyword: event.target.value, page: 1 }))
            }
          />
          <select
            className="field"
            value={logFilters.method}
            onChange={(event) =>
              setLogFilters((current) => ({ ...current, method: event.target.value, page: 1 }))
            }
          >
            <option value="">全部方法</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <select
            className="field"
            value={logFilters.actorType}
            onChange={(event) =>
              setLogFilters((current) => ({ ...current, actorType: event.target.value, page: 1 }))
            }
          >
            <option value="">全部操作者</option>
            <option value="admin">管理员</option>
            <option value="user">普通用户</option>
            <option value="guest">游客</option>
          </select>
          <select
            className="field"
            value={logFilters.success}
            onChange={(event) =>
              setLogFilters((current) => ({ ...current, success: event.target.value, page: 1 }))
            }
          >
            <option value="">全部结果</option>
            <option value="true">成功</option>
            <option value="false">失败</option>
          </select>
          <input
            className="field"
            placeholder="状态码，如 401"
            value={logFilters.statusCode}
            onChange={(event) =>
              setLogFilters((current) => ({ ...current, statusCode: event.target.value, page: 1 }))
            }
          />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>时间 / 请求</th>
                <th>操作者</th>
                <th>结果</th>
                <th>参数快照</th>
                <th>错误 / 返回</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              {logsData.list.map((item) => (
                <tr key={item._id} className={selectedLog?._id === item._id ? 'table-row-active' : ''}>
                  <td>
                    <div className="cell-stack">
                      <strong>
                        <span className={`method-tag method-tag-${String(item.method || 'GET').toLowerCase()}`}>
                          {item.method}
                        </span>{' '}
                        {item.path}
                      </strong>
                      <span>{formatDateTime(item.createdAt)}</span>
                      <span>
                        模块：{item.module || '--'} | IP：{item.ip || '--'} | 耗时：{item.durationMs || 0}ms
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-stack">
                      <strong>{item.actorSnapshot?.username || '未识别用户'}</strong>
                      <span>{item.actorSnapshot?.mobile || '--'}</span>
                      <span>类型：{item.actorType || 'guest'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-stack">
                      <StatusPill tone={item.success ? 'success' : 'danger'}>
                        {item.success ? '成功' : '失败'}
                      </StatusPill>
                      <span>状态码：{item.statusCode}</span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-stack">
                      <span className="json-snippet">query: {formatJsonSnippet(item.query)}</span>
                      <span className="json-snippet">body: {formatJsonSnippet(item.body)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-stack">
                      <strong>{item.responseMessage || '--'}</strong>
                      <span className="json-snippet">data: {formatJsonSnippet(item.responseData)}</span>
                      <span className="log-error-text">{item.errorMessage || '--'}</span>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost-button slim"
                      onClick={() => setSelectedLog(item)}
                    >
                      {selectedLog?._id === item._id ? '已展开' : '查看详情'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logsData.list.length && <div className="empty-state">当前还没有可展示的操作日志。</div>}
        </div>
        <Pagination
          pagination={logsData.pagination}
          onChange={(page) => setLogFilters((current) => ({ ...current, page }))}
        />
      </section>

      {selectedLog && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>日志详情</h2>
              <p>完整查看请求上下文、参数内容、返回消息和错误信息。</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => setSelectedLog(null)}>
              收起详情
            </button>
          </div>

          <div className="log-detail-grid">
            <div className="list-card">
              <div className="list-card-head">
                <strong>基础信息</strong>
              </div>
              <div className="cell-stack">
                <span>时间：{formatDateTime(selectedLog.createdAt)}</span>
                <span>方法：{selectedLog.method || '--'}</span>
                <span>路径：{selectedLog.path || '--'}</span>
                <span>完整 URL：{selectedLog.originalUrl || '--'}</span>
                <span>模块：{selectedLog.module || '--'}</span>
                <span>状态码：{selectedLog.statusCode}</span>
                <span>结果：{selectedLog.success ? '成功' : '失败'}</span>
                <span>耗时：{selectedLog.durationMs || 0}ms</span>
                <span>IP：{selectedLog.ip || '--'}</span>
              </div>
            </div>

            <div className="list-card">
              <div className="list-card-head">
                <strong>操作者信息</strong>
              </div>
              <div className="cell-stack">
                <span>类型：{selectedLog.actorType || 'guest'}</span>
                <span>用户 ID：{selectedLog.actorSnapshot?.id || '--'}</span>
                <span>用户名：{selectedLog.actorSnapshot?.username || '--'}</span>
                <span>手机号：{selectedLog.actorSnapshot?.mobile || '--'}</span>
                <span>角色：{selectedLog.actorSnapshot?.role || '--'}</span>
              </div>
            </div>

            <div className="list-card log-detail-full">
              <div className="list-card-head">
                <strong>响应信息</strong>
              </div>
              <div className="cell-stack">
                <span>返回消息：{selectedLog.responseMessage || '--'}</span>
                <span>错误消息：{selectedLog.errorMessage || '--'}</span>
                <span className="log-error-text">User-Agent：{selectedLog.userAgent || '--'}</span>
              </div>
            </div>

            <div className="list-card log-detail-full">
              <div className="list-card-head">
                <strong>响应数据</strong>
              </div>
              <pre className="code-block">{formatJsonPretty(selectedLog.responseData)}</pre>
            </div>

            <div className="list-card log-detail-full">
              <div className="list-card-head">
                <strong>Query 参数</strong>
              </div>
              <pre className="code-block">{formatJsonPretty(selectedLog.query)}</pre>
            </div>

            <div className="list-card log-detail-full">
              <div className="list-card-head">
                <strong>Body 参数</strong>
              </div>
              <pre className="code-block">{formatJsonPretty(selectedLog.body)}</pre>
            </div>
          </div>
        </section>
      )}
    </div>
  );

  // 方法：renderFeedbacks，负责当前模块中的具体处理逻辑。
  const renderFeedbacks = () => (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>反馈处理</h2>
          <p>在这里更新状态、回复建议，并记录处理人。</p>
        </div>
      </div>
      <div className="toolbar">
        <input
          className="field"
          placeholder="搜索反馈内容、联系方式或回复"
          value={feedbackFilters.keyword}
          onChange={(event) =>
            setFeedbackFilters((current) => ({
              ...current,
              keyword: event.target.value,
              page: 1
            }))
          }
        />
        <select
          className="field"
          value={feedbackFilters.status}
          onChange={(event) =>
            setFeedbackFilters((current) => ({ ...current, status: event.target.value, page: 1 }))
          }
        >
          <option value="">全部状态</option>
          <option value="pending">待处理</option>
          <option value="processed">已处理</option>
        </select>
      </div>
      <div className="feedback-grid">
        {feedbacksData.list.map((item) => {
          const draft = feedbackDrafts[item._id] || { status: item.status, reply: item.reply || '' };

          return (
            <article key={item._id} className="feedback-card">
              <div className="feedback-meta">
                <div>
                  <strong>{item.user?.username || '未知用户'}</strong>
                  <span>{item.user?.mobile || item.contact || '未留联系方式'}</span>
                </div>
                <StatusPill tone={draft.status === 'processed' ? 'success' : 'warning'}>
                  {draft.status === 'processed' ? '已处理' : '待处理'}
                </StatusPill>
              </div>
              <p className="feedback-content">{item.content}</p>
              <div className="form-grid compact">
                <select
                  className="field"
                  value={draft.status}
                  onChange={(event) =>
                    setFeedbackDrafts((current) => ({
                      ...current,
                      [item._id]: {
                        ...current[item._id],
                        status: event.target.value
                      }
                    }))
                  }
                >
                  <option value="pending">待处理</option>
                  <option value="processed">已处理</option>
                </select>
                <textarea
                  className="field textarea"
                  rows="4"
                  placeholder="写下给用户的回复或内部处理备注"
                  value={draft.reply}
                  onChange={(event) =>
                    setFeedbackDrafts((current) => ({
                      ...current,
                      [item._id]: {
                        ...current[item._id],
                        reply: event.target.value
                      }
                    }))
                  }
                />
              </div>
              <div className="card-footer">
                <small>
                  创建于 {formatDateTime(item.createdAt)}，处理人{' '}
                  {item.processedBy?.username || '暂未处理'}
                </small>
                <button
                  type="button"
                  className="primary-button slim"
                  onClick={() => saveFeedback(item._id)}
                  disabled={busyKey === `feedback-${item._id}`}
                >
                  {busyKey === `feedback-${item._id}` ? '保存中...' : '保存处理结果'}
                </button>
              </div>
            </article>
          );
        })}
        {!feedbacksData.list.length && <div className="empty-state">当前没有反馈数据。</div>}
      </div>
      <Pagination
        pagination={feedbacksData.pagination}
        onChange={(page) => setFeedbackFilters((current) => ({ ...current, page }))}
      />
    </section>
  );

  // 方法：renderBanners，负责当前模块中的具体处理逻辑。
  const renderBanners = () => (
    <div className="split-grid">
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Banner 列表</h2>
            <p>点击编辑可把内容回填到右侧表单。</p>
          </div>
          <button type="button" className="ghost-button" onClick={loadBanners}>
            刷新
          </button>
        </div>
        <div className="list-grid">
          {banners.map((item) => (
            <article key={item._id} className="list-card">
              <div className="list-card-head">
                <strong>{item.title}</strong>
                <StatusPill tone={item.status ? 'success' : 'neutral'}>
                  {item.status ? '启用' : '停用'}
                </StatusPill>
              </div>
              <p>{item.link || '未配置跳转链接'}</p>
              <small>{item.image}</small>
              <div className="inline-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    setBannerForm({
                      id: item._id,
                      title: item.title,
                      image: item.image,
                      link: item.link || '',
                      sort: item.sort ?? 0,
                      status: Boolean(item.status)
                    })
                  }
                >
                  编辑
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    if (window.confirm(`确认删除 Banner「${item.title}」吗？`)) {
                      removeItem(`/api/admin/banners/${item._id}`, loadBanners, 'Banner 已删除');
                    }
                  }}
                  disabled={busyKey === `/api/admin/banners/${item._id}`}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
          {!banners.length && <div className="empty-state">还没有 Banner 内容。</div>}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>{bannerForm.id ? '编辑 Banner' : '新建 Banner'}</h2>
            <p>保持图片地址可访问，排序越小越靠前。</p>
          </div>
          {bannerForm.id && (
            <button type="button" className="ghost-button" onClick={() => setBannerForm(initialBannerForm)}>
              取消编辑
            </button>
          )}
        </div>
        <form className="form-grid" onSubmit={saveBanner}>
          <input
            className="field"
            placeholder="标题"
            value={bannerForm.title}
            onChange={(event) =>
              setBannerForm((current) => ({ ...current, title: event.target.value }))
            }
          />
          <input
            className="field"
            placeholder="图片 URL"
            value={bannerForm.image}
            onChange={(event) =>
              setBannerForm((current) => ({ ...current, image: event.target.value }))
            }
          />
          <input
            className="field"
            placeholder="跳转链接"
            value={bannerForm.link}
            onChange={(event) =>
              setBannerForm((current) => ({ ...current, link: event.target.value }))
            }
          />
          <div className="form-row">
            <input
              className="field"
              type="number"
              placeholder="排序"
              value={bannerForm.sort}
              onChange={(event) =>
                setBannerForm((current) => ({ ...current, sort: event.target.value }))
              }
            />
            <select
              className="field"
              value={String(bannerForm.status)}
              onChange={(event) =>
                setBannerForm((current) => ({ ...current, status: toBoolean(event.target.value) }))
              }
            >
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </div>
          <button type="submit" className="primary-button" disabled={busyKey === 'banner-save'}>
            {busyKey === 'banner-save' ? '保存中...' : bannerForm.id ? '更新 Banner' : '创建 Banner'}
          </button>
        </form>
      </section>
    </div>
  );

  // 方法：renderFaqs，负责当前模块中的具体处理逻辑。
  const renderFaqs = () => (
    <div className="split-grid">
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>FAQ 列表</h2>
            <p>常见问题会直接影响用户自助解决率。</p>
          </div>
        </div>
        <div className="list-grid">
          {faqs.map((item) => (
            <article key={item._id} className="list-card">
              <div className="list-card-head">
                <strong>{item.question}</strong>
                <StatusPill tone={item.status ? 'success' : 'neutral'}>
                  {item.status ? '启用' : '停用'}
                </StatusPill>
              </div>
              <p>{item.answer}</p>
              <small>排序 {item.sort}</small>
              <div className="inline-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    setFaqForm({
                      id: item._id,
                      question: item.question,
                      answer: item.answer,
                      sort: item.sort ?? 0,
                      status: Boolean(item.status)
                    })
                  }
                >
                  编辑
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    if (window.confirm(`确认删除 FAQ「${item.question}」吗？`)) {
                      removeItem(`/api/admin/faqs/${item._id}`, loadFaqs, 'FAQ 已删除');
                    }
                  }}
                  disabled={busyKey === `/api/admin/faqs/${item._id}`}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
          {!faqs.length && <div className="empty-state">还没有 FAQ 内容。</div>}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>{faqForm.id ? '编辑 FAQ' : '新建 FAQ'}</h2>
            <p>问题要短，答案要可执行。</p>
          </div>
          {faqForm.id && (
            <button type="button" className="ghost-button" onClick={() => setFaqForm(initialFaqForm)}>
              取消编辑
            </button>
          )}
        </div>
        <form className="form-grid" onSubmit={saveFaq}>
          <input
            className="field"
            placeholder="问题"
            value={faqForm.question}
            onChange={(event) =>
              setFaqForm((current) => ({ ...current, question: event.target.value }))
            }
          />
          <textarea
            className="field textarea"
            rows="6"
            placeholder="答案"
            value={faqForm.answer}
            onChange={(event) =>
              setFaqForm((current) => ({ ...current, answer: event.target.value }))
            }
          />
          <div className="form-row">
            <input
              className="field"
              type="number"
              placeholder="排序"
              value={faqForm.sort}
              onChange={(event) => setFaqForm((current) => ({ ...current, sort: event.target.value }))}
            />
            <select
              className="field"
              value={String(faqForm.status)}
              onChange={(event) =>
                setFaqForm((current) => ({ ...current, status: toBoolean(event.target.value) }))
              }
            >
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </div>
          <button type="submit" className="primary-button" disabled={busyKey === 'faq-save'}>
            {busyKey === 'faq-save' ? '保存中...' : faqForm.id ? '更新 FAQ' : '创建 FAQ'}
          </button>
        </form>
      </section>
    </div>
  );

  // 方法：renderTemplates，负责当前模块中的具体处理逻辑。
  const renderTemplates = () => (
    <div className="split-grid">
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>模板列表</h2>
            <p>封面、下载链接和分类在这里统一维护。</p>
          </div>
        </div>
        <div className="list-grid">
          {templates.map((item) => (
            <article key={item._id} className="list-card">
              <div className="list-card-head">
                <strong>{item.title}</strong>
                <StatusPill tone={item.status ? 'success' : 'neutral'}>
                  {item.status ? '启用' : '停用'}
                </StatusPill>
              </div>
              <p>{item.description || '暂无描述'}</p>
              <small>{item.category}</small>
              <div className="inline-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    setTemplateForm({
                      id: item._id,
                      title: item.title,
                      category: item.category,
                      description: item.description || '',
                      cover: item.cover || '',
                      downloadUrl: item.downloadUrl || '',
                      sort: item.sort ?? 0,
                      status: Boolean(item.status)
                    })
                  }
                >
                  编辑
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    if (window.confirm(`确认删除模板「${item.title}」吗？`)) {
                      removeItem(`/api/admin/templates/${item._id}`, loadTemplates, '模板已删除');
                    }
                  }}
                  disabled={busyKey === `/api/admin/templates/${item._id}`}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
          {!templates.length && <div className="empty-state">当前还没有模板内容。</div>}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>{templateForm.id ? '编辑模板' : '新建模板'}</h2>
            <p>分类建议简短稳定，便于后续前端筛选。</p>
          </div>
          {templateForm.id && (
            <button
              type="button"
              className="ghost-button"
              onClick={() => setTemplateForm(initialTemplateForm)}
            >
              取消编辑
            </button>
          )}
        </div>
        <form className="form-grid" onSubmit={saveTemplate}>
          <div className="form-row">
            <input
              className="field"
              placeholder="标题"
              value={templateForm.title}
              onChange={(event) =>
                setTemplateForm((current) => ({ ...current, title: event.target.value }))
              }
            />
            <input
              className="field"
              placeholder="分类"
              value={templateForm.category}
              onChange={(event) =>
                setTemplateForm((current) => ({ ...current, category: event.target.value }))
              }
            />
          </div>
          <textarea
            className="field textarea"
            rows="5"
            placeholder="模板描述"
            value={templateForm.description}
            onChange={(event) =>
              setTemplateForm((current) => ({ ...current, description: event.target.value }))
            }
          />
          <input
            className="field"
            placeholder="封面 URL"
            value={templateForm.cover}
            onChange={(event) =>
              setTemplateForm((current) => ({ ...current, cover: event.target.value }))
            }
          />
          <input
            className="field"
            placeholder="下载链接"
            value={templateForm.downloadUrl}
            onChange={(event) =>
              setTemplateForm((current) => ({ ...current, downloadUrl: event.target.value }))
            }
          />
          <div className="form-row">
            <input
              className="field"
              type="number"
              placeholder="排序"
              value={templateForm.sort}
              onChange={(event) =>
                setTemplateForm((current) => ({ ...current, sort: event.target.value }))
              }
            />
            <select
              className="field"
              value={String(templateForm.status)}
              onChange={(event) =>
                setTemplateForm((current) => ({ ...current, status: toBoolean(event.target.value) }))
              }
            >
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </div>
          <button
            type="submit"
            className="primary-button"
            disabled={busyKey === 'template-save'}
          >
            {busyKey === 'template-save'
              ? '保存中...'
              : templateForm.id
                ? '更新模板'
                : '创建模板'}
          </button>
        </form>
      </section>
    </div>
  );

  // 方法：renderService，负责当前模块中的具体处理逻辑。
  const renderService = () => (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>客服配置</h2>
          <p>这个区域适合放统一对外联系方式和服务时段。</p>
        </div>
      </div>
      <form className="form-grid service-grid" onSubmit={saveService}>
        <div className="form-row">
          <input
            className="field"
            placeholder="客服名称"
            value={serviceForm.name}
            onChange={(event) =>
              setServiceForm((current) => ({ ...current, name: event.target.value }))
            }
          />
          <input
            className="field"
            placeholder="微信号"
            value={serviceForm.wechat}
            onChange={(event) =>
              setServiceForm((current) => ({ ...current, wechat: event.target.value }))
            }
          />
        </div>
        <div className="form-row">
          <input
            className="field"
            placeholder="邮箱"
            value={serviceForm.email}
            onChange={(event) =>
              setServiceForm((current) => ({ ...current, email: event.target.value }))
            }
          />
          <input
            className="field"
            placeholder="服务时间，例如 09:00-18:00"
            value={serviceForm.workingHours}
            onChange={(event) =>
              setServiceForm((current) => ({ ...current, workingHours: event.target.value }))
            }
          />
        </div>
        <select
          className="field"
          value={String(serviceForm.status)}
          onChange={(event) =>
            setServiceForm((current) => ({ ...current, status: toBoolean(event.target.value) }))
          }
        >
          <option value="true">启用客服配置</option>
          <option value="false">停用客服配置</option>
        </select>
        <button type="submit" className="primary-button" disabled={busyKey === 'service-save'}>
          {busyKey === 'service-save' ? '保存中...' : '保存客服配置'}
        </button>
      </form>
    </section>
  );

  // 方法：renderContent，负责当前模块中的具体处理逻辑。
  const renderContent = () => {
    if (authStatus === 'checking') {
      return (
        <div className="loading-screen">
          <div className="pulse-dot" />
          <p>正在校验管理员登录状态...</p>
        </div>
      );
    }

    if (authStatus !== 'ready') {
      return (
        <div className="auth-shell">
          <section className="auth-hero">
            <span className="eyebrow">Admin Studio</span>
            <h1>文档转换后台管理台</h1>
            <p>
              我把管理端做成了一块专注、利落的工作台。登录后你可以直接管理用户、反馈、Banner、
              FAQ、模板和客服配置。
            </p>
            <div className="auth-metrics">
              <div>
                <strong>8</strong>
                <span>核心管理模块</span>
              </div>
              <div>
                <strong>/api/admin</strong>
                <span>统一接入后台接口</span>
              </div>
              <div>
                <strong>127.0.0.1:3000</strong>
                <span>当前后端服务地址</span>
              </div>
            </div>
          </section>

          <section className="auth-card">
            <div className="section-heading compact">
              <div>
                <h2>管理员登录</h2>
                <p>已为你预填默认账号，点一下就能进入。</p>
              </div>
            </div>
            <form className="form-grid" onSubmit={submitLogin}>
              <input
                className="field"
                placeholder="账号"
                value={loginForm.account}
                onChange={(event) =>
                  {
                    setLoginError('');
                    setLoginForm((current) => ({ ...current, account: event.target.value }));
                  }
                }
              />
              <input
                className="field"
                type="password"
                placeholder="密码"
                value={loginForm.password}
                onChange={(event) =>
                  {
                    setLoginError('');
                    setLoginForm((current) => ({ ...current, password: event.target.value }));
                  }
                }
              />
              {loginError && (
                <div className="notice notice-error login-error" role="alert">
                  <span>{loginError}</span>
                </div>
              )}
              <button type="submit" className="primary-button" disabled={busyKey === 'login'}>
                {busyKey === 'login' ? '登录中...' : '进入后台'}
              </button>
            </form>
            <div className="login-hint">
              <span>默认账号：13800000000</span>
              <span>默认密码：Admin123456</span>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-card">
            <span className="eyebrow">Admin Studio</span>
            <h2>文档转换平台</h2>
            <p>把日常运营动作收进一个稳定的后台工作面板里。</p>
          </div>
          <nav className="nav-list">
            {PANELS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${activePanel === item.key ? 'active' : ''}`}
                onClick={() => setActivePanel(item.key)}
              >
                <span>{item.label}</span>
                <small>{item.subtitle}</small>
              </button>
            ))}
          </nav>
        </aside>

        <main className="workspace">
          <header className="workspace-header">
            <div>
              <span className="eyebrow">当前模块</span>
              <h1>{activePanelMeta.label}</h1>
              <p>{activePanelMeta.subtitle}</p>
            </div>
            <div className="header-actions">
              <div className="profile-chip">
                <strong>{profile?.username}</strong>
                <span>{profile?.mobile}</span>
              </div>
              <button type="button" className="ghost-button" onClick={() => handleLogout('已安全退出')}>
                退出登录
              </button>
            </div>
          </header>

          {notice && (
            <div className={`notice notice-${notice.type}`}>
              <span>{notice.message}</span>
            </div>
          )}

          {activePanel === 'dashboard' && renderDashboard()}
          {activePanel === 'users' && renderUsers()}
          {activePanel === 'records' && renderRecords()}
          {activePanel === 'logs' && renderLogs()}
          {activePanel === 'feedbacks' && renderFeedbacks()}
          {activePanel === 'banners' && renderBanners()}
          {activePanel === 'faqs' && renderFaqs()}
          {activePanel === 'templates' && renderTemplates()}
          {activePanel === 'service' && renderService()}
        </main>
      </div>
    );
  };

  return <div className="admin-root">{renderContent()}</div>;
}

export default App;
