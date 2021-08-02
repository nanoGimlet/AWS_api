const express = require('express');
const app = express();
var bodyParser = require('body-parser');

// Prismaの設定
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Digest認証の設定
const passport = require('passport');
const DigestStrategy = require('passport-http').DigestStrategy;

// validatorの設定
const { check, validationResult, body } = require('express-validator');

// raw-dataをjson形式に整形
let rawBodySaver = function(req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};
app.use(bodyParser.json({verify: rawBodySaver}));
app.use(bodyParser.urlencoded({verify: rawBodySaver, extended: true }));
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
app.post('/v1/stocks',
  [
    check('name').not(),
    check('amount').isInt()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    console.log(req.body);
    const stock = await prisma.$transaction([
      prisma.stock.findMany({
        where: {
          name: {
            equals: req.body.name
          }
        }
      })
    ]);
    console.log(stock);
    if (stock == '') {
      const create_stock = await prisma.$transaction([
        prisma.stock.create({
          data: {
            name: req.body.name,
            amount: req.body.amount
          }
        })
      ]);
      console.log(create_stock);
      res.status(200).json(create_stock);
    } else {
      const update_stock = await prisma.$transaction([
        prisma.stock.updateMany({
          where: {
            name: {
              equals: req.body.name
            }
          },
          data: {
            amount: {
              increment: req.body.amount
            }
          }
        })
      ]);
      console.log(update_stock);
      res.status(200).json(update_stock);
    }
});

// 在庫チェック1
// /v1/stocks/:nameの場合はそのname, amountを返す
app.get('/v1/stocks/:name', (req, res) => {
  prisma.stock.findMany({
    where: {
      name: {
        equals: req.params.name,
      },
    },
  }).then((result) => {
    if (result == '') {
      console.log('error');
      res.status(400).json({ message: 'ERROR' });
    }else {
      console.log(result);
      res.status(200).json(result);
    }
  }).catch((error) => {
    console.log(error);
    res.json({ message: error });
  })
});

// 在庫チェック2
// /v1/stocksの場合は全てのname, amountを返す
app.get('/v1/stocks', async (req, res) => {
  const stocks = await prisma.stock.findMany();
  console.log(stocks);
  res.status(200).json(stocks);
});

// 販売
// /v1/salesにアクセス、salesに計算値を加算, amountを減算
app.post('/v1/sales',
  [
    check('name').not()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    var check_amount;
    if (req.rawBody.indexOf('amount') == -1) check_amount = 1;
    else check_amount = req.body.amount;
    const change_stock = await prisma.$transaction([
      prisma.stock.findMany({
        where: {
          name: {
            equals: req.body.name
          },
          amount: {
            gte: check_amount
          }
        }
      })
    ]);
    if (change_stock == '') {
      console.log('error');
      res.status(422).json({ message: 'ERROR' });
    }else {
      const update_stock = await prisma.$transaction([
        prisma.stock.updateMany({
          where: {
            name: {
              equals: req.body.name
            },
            amount: {
              gte: check_amount
            }
          },
          data: {
            amount: {
              decrement: check_amount
            }
          }
        })
      ]);
      var sum;
      if (req.rawBody.indexOf('price') == -1) sum = 0;
      else sum = check_amount * req.body.price;
      const sales = await prisma.$transaction([
        prisma.sale.findUnique({
          where: {
            id: 1
          }
        })
      ]);
      console.log(sales);
      if (sales == null) {
        const create_sale = await prisma.$transaction([
          prisma.sale.create({
            data: {
              total: 0
            }
          })
        ]);
      }
      const update_sale = await prisma.$transaction([
        prisma.sale.updateMany({
          where: {
            id: 1
          },
          data: {
            total: {
              increment: sum
            }
          }
        })
      ]);
      console.log(sum);
      res.status(200).json(req.body);
    }
});

// 売り上げチェック
// salesの値を返す
app.get('/v1/sales', async (req, res) => {
  const sales = await prisma.$transaction([
    prisma.sale.findUnique({
      where: {
        id: 1
      }
    })
  ]);
  console.log(sales);
  if (sales == null) {
    const create_sale = await prisma.$transaction([
      prisma.sale.create({
        data: {
          total: 0
        }
      })
    ]);
    console.log(create_sale);
    res.status(200).json(create_sale);
  }else {
    console.log(sales);
    res.status(200).json(sales);
  }
});

// 全削除
// 空を返す
app.delete('/v1/stocks', async (req, res) => {
  const delete_stocks = await prisma.$transaction([
    prisma.stock.deleteMany({})
  ]);
  const delete_sales = await prisma.$transaction([
    prisma.sale.updateMany({
      where: {
        id: 1
      },
      data: {
        total: 0
      }
    })
  ]);
  res.status(200).json({});
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
