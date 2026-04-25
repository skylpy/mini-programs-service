const https = require('https');
const AppError = require('../utils/appError');

const WECHAT_API_BASE_URL = 'https://api.weixin.qq.com';
const ACCESS_TOKEN_SAFE_BUFFER_MS = 60 * 1000;

let accessTokenCache = {
  value: '',
  expiresAt: 0
};

function getWechatConfig() {
  const appId = String(process.env.WECHAT_MINI_PROGRAM_APP_ID || '').trim();
  const appSecret = String(process.env.WECHAT_MINI_PROGRAM_APP_SECRET || '').trim();

  if (!appId || !appSecret) {
    throw new AppError('服务端未配置微信小程序登录参数', 500);
  }

  return {
    appId,
    appSecret
  };
}

function requestWechatApi(url, options = {}) {
  const { method = 'GET', body = null } = options;
  const requestBody = body ? JSON.stringify(body) : '';

  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method,
        headers: requestBody
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(requestBody)
            }
          : {}
      },
      (response) => {
        let rawData = '';

        response.on('data', (chunk) => {
          rawData += chunk;
        });

        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new AppError(`微信接口请求失败，HTTP 状态码 ${response.statusCode}`, 502));
            return;
          }

          try {
            resolve(rawData ? JSON.parse(rawData) : {});
          } catch (error) {
            reject(new AppError('微信接口返回解析失败', 502));
          }
        });
      }
    );

    request.on('error', (error) => {
      reject(new AppError(`微信接口请求失败：${error.message}`, 502));
    });

    if (requestBody) {
      request.write(requestBody);
    }

    request.end();
  });
}

function ensureWechatSuccess(data, fallbackMessage) {
  const errCode = Number(data?.errcode || 0);

  if (!errCode) {
    return data;
  }

  console.error('[wechatService] api error:', data);
  throw new AppError(data?.errmsg || fallbackMessage || '微信服务暂时不可用', 502);
}

async function getMiniProgramSession(loginCode) {
  const code = String(loginCode || '').trim();

  if (!code) {
    throw new AppError('loginCode 必填');
  }

  const { appId, appSecret } = getWechatConfig();
  const query = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    js_code: code,
    grant_type: 'authorization_code'
  });

  const data = await requestWechatApi(`${WECHAT_API_BASE_URL}/sns/jscode2session?${query.toString()}`);
  ensureWechatSuccess(data, '获取微信用户标识失败');

  if (!data.openid) {
    throw new AppError('获取微信用户标识失败', 502);
  }

  return {
    openid: data.openid,
    unionid: data.unionid || '',
    sessionKey: data.session_key || ''
  };
}

async function fetchAccessToken() {
  const { appId, appSecret } = getWechatConfig();
  const query = new URLSearchParams({
    grant_type: 'client_credential',
    appid: appId,
    secret: appSecret
  });

  const data = await requestWechatApi(`${WECHAT_API_BASE_URL}/cgi-bin/token?${query.toString()}`);
  ensureWechatSuccess(data, '获取微信 access_token 失败');

  accessTokenCache = {
    value: data.access_token || '',
    expiresAt: Date.now() + Number(data.expires_in || 7200) * 1000
  };

  if (!accessTokenCache.value) {
    throw new AppError('获取微信 access_token 失败', 502);
  }

  return accessTokenCache.value;
}

async function getAccessToken(forceRefresh = false) {
  if (!forceRefresh && accessTokenCache.value && Date.now() < accessTokenCache.expiresAt - ACCESS_TOKEN_SAFE_BUFFER_MS) {
    return accessTokenCache.value;
  }

  return fetchAccessToken();
}

async function getPhoneNumberByCode(phoneCode) {
  const code = String(phoneCode || '').trim();

  if (!code) {
    throw new AppError('phoneCode 必填');
  }

  let accessToken = await getAccessToken();
  let data = await requestWechatApi(
    `${WECHAT_API_BASE_URL}/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: 'POST',
      body: {
        code
      }
    }
  );

  const shouldRefreshToken = [40001, 40014, 42001].includes(Number(data?.errcode || 0));

  if (shouldRefreshToken) {
    accessToken = await getAccessToken(true);
    data = await requestWechatApi(
      `${WECHAT_API_BASE_URL}/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        body: {
          code
        }
      }
    );
  }

  ensureWechatSuccess(data, '获取微信手机号失败');

  if (!data?.phone_info?.phoneNumber) {
    throw new AppError('获取微信手机号失败', 502);
  }

  return data.phone_info;
}

module.exports = {
  getMiniProgramSession,
  getPhoneNumberByCode
};
