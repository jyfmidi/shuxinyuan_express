const express = require('express');
const axios = require('axios');
const router = express.Router();

const corpId = process.env.WECHAT_CORP_ID || 'ww528f23f94b09b727';
const agentId = process.env.WECHAT_AGENT_ID || '1000102';
const agentSecret = process.env.WECHAT_AGENT_SECRET || 'g-2EBlHMp97R0d320oErw3EB9iP1c566TxXf5-zdKcY';
const redirectUri = process.env.WECHAT_REDIRECT_URI || 'http://82.156.100.208:3000/api/wechat/callback';

// 1. 前端获取二维码参数
router.get('/login_url', (req, res) => {
  const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${corpId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_base&state=STATE#wechat_redirect`;
  res.json({ url });
});

// 2. 企业微信扫码回调
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code');

  try {
    // 获取access_token
    const tokenResp = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${agentSecret}`);
    const accessToken = tokenResp.data.access_token;

    // 用code换取用户信息
    const userResp = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${accessToken}&code=${code}`);
    const userId = userResp.data.UserId;

    // 这里可以查数据库，生成session等
    req.session.user = { userId };

    // 跳转回前端页面，带上登录状态
    res.redirect(`http://82.156.100.208:5173/?userId=${userId}`);
  } catch (e) {
    res.status(500).send('WeChat login error');
  }
});

// 3. 获取当前登录用户
router.get('/me', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

module.exports = router; 