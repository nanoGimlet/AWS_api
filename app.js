const express = require('express');
const app = express();
const bodyParser = require('body-parser');

// Prismaの設定
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Digest認証の設定
const passport = require('passport');
const DigestStrategy = require('passport-http').DigestStrategy;

// raw-dateをjson形式に整形
let rawBodySaver = function(req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};
app.use(bodyParser.json({verify: rawBodySaver}));
app.use(bodyParser.urlencoded({verify: rawBodySaver, extended: true}));
app.use(bodyParser.raw({verify: rawBodySaver, type: '*/*'}));

var secret = require('./secret');
var port = 3000;

// Digest認証
passport.use(new DigestStrategy({ qop: 'auth' },
  function(username, cb) {
    secret.users.findByUsername(username, function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      return cb(null, user, user.password);
    })
  }
));

// rootにアクセスすると"AWS"が表示
app.get('/', (req, res) => {
  res.send("AWS\n");
})

// /secretにDigest認証でアクセスする
app.get('/secret',
  passport.authenticate('digest', { session: false }),
  function(req, res) {
    res.send("SUCCESS\n");
  }
);

// 8/2:ハンドリング処理について調べる

// 在庫の更新、作成
// 在庫にない場合は新しく作成、在庫にある場合は数を追加
// localhost/v1/stocks/:nameに返す
app.post('/v1/stocks', (req, res) => {
  
});

// 在庫チェック1
// /v1/stocks/:nameの場合はそのname, amountを返す
app.get('/v1/stocks/:name', (req, res) => {
  
});

// 在庫チェック2
// /v1/stocksの場合は全てのname, amountを返す
app.get('/v1/stocks', (req, res) => {

});

// 販売
// /v1/salesにアクセス、salesに計算値を加算, amountを減算
app.post('/v1/stocks/:name', (req, res) => {

});

// 売り上げチェック
// salesの値を返す
app.get('/v1/sales', (req, res) => {

});

// 全削除
// 空を返す
app.delete('/v1/stocks', (req, res) => {

});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
