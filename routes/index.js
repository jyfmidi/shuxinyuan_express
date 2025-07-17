var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


// 测试用路由
router.get('/test', (req, res) => {
  res.send({
      message: "TEST INDEX."
  });
});

module.exports = router;
