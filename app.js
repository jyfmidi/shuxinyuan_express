require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const wechatRouter = require('./routes/wechat');

var app = express();

const FRONTEND_ORIGINS = [
  'http://localhost:5173',
  process.env.FRONTEND_ORIGIN || 'http://82.156.100.208:5173'
];

app.use(cors({
  origin: FRONTEND_ORIGINS,
  credentials: true
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/wechat', wechatRouter);

module.exports = app;
