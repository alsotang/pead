var express = require('express');
var path = require('path');
var superagent = require('superagent');
var superagentparse = require('superagentparse');
var cheerio = require('cheerio');
var qs = require('qs');
var eventproxy = require('eventproxy');
var urlencode = require('urlencode');
var logfmt = require("logfmt");

var queryCache = {};

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logfmt.requestLogger());
app.get('/', function (req, res) {
  res.render('index');
});

app.get('/query', function (req, res) {
  var agent = superagent.agent();
  var formData = {
    xh: req.query.xh,
    xb: req.query.xb,
    xm: req.query.xm,
  };
  formData = urlencode.stringify(formData, {charset: 'gbk'});

  if (queryCache[formData]) {
    return res.send(queryCache[formData]);
  }

  var ep = new eventproxy();
  agent
    .post('http://pead.scu.edu.cn/jncx/logins.asp')
    .send(formData)
    .parse(superagentparse('gbk'))
    .end(function (err, result) {
      ep.emitLater('login');
    });
  ep.on('login', function () {
    agent
      .get('http://pead.scu.edu.cn/jncx/tcsh2.asp')
      .parse(superagentparse('gbk'))
      .end(function (err, result) {
        var $ = cheerio.load(result.text);
        res.type('html');
        var body = $('body').html() || '参数有错或无数据';
        queryCache[formData] = body;
        res.send(body);
      });
  });
});

var port = Number(process.env.PORT || 3000);
app.listen(port, function () {
  console.log('app is listening at port ' + port + '...');
});