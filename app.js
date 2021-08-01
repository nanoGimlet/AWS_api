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

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
