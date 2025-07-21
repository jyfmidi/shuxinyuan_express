const express = require('express');
const axios = require('axios');
const router = express.Router();

const corpId = process.env.WECHAT_CORP_ID;
const agentId = process.env.WECHAT_AGENT_ID;
const agentSecret = process.env.WECHAT_AGENT_SECRET;
const frontendOrigin = process.env.FRONTEND_ORIGIN;
const redirectUri = `${process.env.BACKEND_URL}/api/wechat/callback`;

// 验证必要的环境变量
if (!corpId || !agentId || !agentSecret) {
  console.error('缺少必要的企业微信配置，请在.env文件中设置：WECHAT_CORP_ID, WECHAT_AGENT_ID, WECHAT_AGENT_SECRET');
}

// Access Token 缓存
let accessTokenCache = {
  token: null,
  expiresAt: 0
};

// 获取 Access Token（带缓存）
async function getAccessToken() {
  const now = Date.now();
  
  // 如果缓存中的token还有效，直接返回
  if (accessTokenCache.token && accessTokenCache.expiresAt > now) {
    return accessTokenCache.token;
  }
  
  try {
    console.log('获取新的 Access Token...');
    const response = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/gettoken`, {
      params: {
        corpid: corpId,
        corpsecret: agentSecret
      }
    });
    
    if (response.data.errcode === 0) {
      // 缓存token，提前5分钟过期
      accessTokenCache.token = response.data.access_token;
      accessTokenCache.expiresAt = now + (response.data.expires_in - 300) * 1000;
      console.log('Access Token 获取成功');
      return response.data.access_token;
    } else {
      throw new Error(`获取 Access Token 失败: ${response.data.errmsg}`);
    }
  } catch (error) {
    console.error('获取 Access Token 错误:', error.message);
    throw error;
  }
}

// 1. 获取企业微信登录URL
router.get('/login_url', (req, res) => {
  try {
    const state = Math.random().toString(36).substring(2, 15); // 生成随机state
    const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${corpId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_base&state=${state}#wechat_redirect`;
    res.json({ url, state });
  } catch (error) {
    console.error('生成登录URL失败:', error);
    res.status(500).json({ error: '生成登录URL失败' });
  }
});

// 2. 企业微信授权回调
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    console.error('回调缺少code参数');
    return res.status(400).send('缺少授权码');
  }
  
  try {
    console.log('收到企业微信回调，code:', code);
    
    // 获取 Access Token
    const accessToken = await getAccessToken();
    
    // 使用 code 获取用户信息
    const userResponse = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo`, {
      params: {
        access_token: accessToken,
        code: code
      }
    });
    
    if (userResponse.data.errcode === 0) {
      const userId = userResponse.data.UserId;
      console.log('获取到用户ID:', userId);
      
      // 获取用户详细信息
      const userDetailResponse = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/get`, {
        params: {
          access_token: accessToken,
          userid: userId
        }
      });
      
      let userInfo = { userId };
      
      if (userDetailResponse.data.errcode === 0) {
        userInfo = {
          userId: userDetailResponse.data.userid,
          name: userDetailResponse.data.name,
          mobile: userDetailResponse.data.mobile,
          email: userDetailResponse.data.email,
          avatar: userDetailResponse.data.avatar,
          department: userDetailResponse.data.department
        };
      }
      
      // 存储用户信息到 session
      req.session.user = userInfo;
      req.session.accessToken = accessToken;
      
      console.log('用户登录成功:', userInfo.name || userInfo.userId);
      
      // 跳转回前端，带上用户信息
      const redirectUrl = `${frontendOrigin}/?userId=${userInfo.userId}&name=${encodeURIComponent(userInfo.name || '')}`;
      res.redirect(redirectUrl);
      
    } else {
      console.error('获取用户信息失败:', userResponse.data);
      res.status(500).send('获取用户信息失败');
    }
    
  } catch (error) {
    console.error('企业微信登录回调处理失败:', error);
    res.status(500).send('登录处理失败');
  }
});

// 3. 测试登录
router.post('/test_login', (req, res) => {
  const { userId } = req.body;
  
  if (!userId || !userId.trim()) {
    return res.status(400).json({ error: '用户ID不能为空' });
  }
  
  try {
    // 存储测试用户信息到 session
    req.session.user = {
      userId: userId.trim(),
      name: userId.trim(),
      isTestUser: true
    };
    
    console.log('测试用户登录成功:', userId);
    
    res.json({
      success: true,
      user: req.session.user,
      message: '测试登录成功'
    });
    
  } catch (error) {
    console.error('测试登录失败:', error);
    res.status(500).json({ error: '测试登录失败' });
  }
});

// 4. 获取当前登录用户信息
router.get('/me', (req, res) => {
  if (req.session.user) {
    res.json({
      user: req.session.user,
      isLoggedIn: true
    });
  } else {
    res.status(401).json({ 
      error: 'Not logged in',
      isLoggedIn: false
    });
  }
});

// 5. 退出登录
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('退出登录失败:', err);
      res.status(500).json({ error: '退出登录失败' });
    } else {
      res.json({ message: '退出登录成功' });
    }
  });
});

module.exports = router; 