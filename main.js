var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var superagent = require('superagent');
var cheerio = require('cheerio');
var qs = require('qs');
var iconv = require('iconv-lite');
var eventproxy = require('eventproxy');
var urlencode = require('urlencode');
var BufferHelper = require('bufferhelper');
var logfmt = require("logfmt");

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser());
app.use(logfmt.requestLogger());
app.get('/', function (req, res) {
  res.render('index');
});

app.get('/query', function (req, res) {
  var agent = superagent.agent();
  var parseText = function(res, done) {
    res.text = new BufferHelper();
    res.on('data', function (chunk) {
      res.text.concat(chunk);
    });
    res.on('end', function() {
      res.text = iconv.decode(res.text.toBuffer(), 'gbk');
      done();
    });
  };
  var formData = {
    xh: req.query.xh,
    xb: req.query.xb,
  };
  formData = qs.stringify(formData);
  formData = formData + '&xm=' + urlencode(req.query.xm, 'gbk');

  var ep = new eventproxy();
  ep.on('login', function () {
    agent
      .get('http://pead.scu.edu.cn/jncx/tcsh2.asp')
      .parse(parseText)
      .end(function (err, result) {
        var $ = cheerio.load(result.text);
        res.set('content-type', 'text/html;charset=utf-8');
        res.send($('body').html() || '参数有错或无数据');
      });
  });
  agent
    .post('http://pead.scu.edu.cn/jncx/logins.asp')
    .send(formData)
    .end(function (err, result) {
      ep.emitLater('login');
    });
});

var port = Number(process.env.PORT || 3000);
app.listen(port, function () {
  console.log('app is listening at port ' + port + '...');
});