const express = require('express');
const router = express.Router();
const moment = require('moment');
const Product = require('../models/Product');
const User = require('../models/User');
const ensureAuthenticated = require('../helpers/auth');
const flashMessage = require('../helpers/messenger');
require('dotenv').config();
const fetch = require('node-fetch');
// Required for file upload 
const fs = require('fs');
// const upload = require('../helpers/imageUpload');
const AddToCart = require('../models/Cart');
const Wallet = require('../models/Wallet');
const productUpload = require('../helpers/productUpload');
// number checker
function onlyNumbers(str) {
  return /^[0-9]+$/.test(str);
}

// pos to neg, neg to pos
function pos_to_neg(num) {
  return -Math.abs(num);
}

function neg_to_pos(num) {
  return Math.abs(num);
}
router.get('/listProduct', ensureAuthenticated, (req, res) => {
    if (req.user.userrole == "customer") {
      flashMessage(res, "error", "You have no authorized access!");
        res.redirect("/");
        return;
      
    }

    Product.findAll({
        order: [['brand', 'DESC']],
        raw: true
    })
        .then((product) => {
            for(let join of product) {
                join.price = join.price.toFixed(2);
            }
            res.render('product/listProduct', { product });
        })
        .catch(err => console.log(err));
});

router.get('/addProduct', ensureAuthenticated, (req, res) => {
    if (req.user.userrole == "customer") {
      flashMessage(res, "error", "You have no authorized access!");
        res.redirect("/");
        return;
      
    }
    res.render('product/addProduct');
});

router.post('/addProduct', ensureAuthenticated, (req, res) => {
    let brand = req.body.brand;
    let product = req.body.product;
    let description = req.body.description;
    let productURL = req.body.productURL;
    let size = req.body.size;
    let color = req.body.color;
    let price = req.body.price;
    let userId = req.user.id;
    console.log(userId)

    Product.create(
        { brand, product, description, productURL, size, color, price, userId }
    )
        .then((product) => {
            console.log(product.toJSON());
            res.redirect('/product/listProduct');
        })
        .catch(err => console.log(err))
});

router.get('/shop', ensureAuthenticated, (req, res) => {
  if (req.user.userrole != "customer") {
    flashMessage(res, "error", "You have to login to a customer account!");
    res.redirect("/");
    return;
  }
  let userid = req.user.id;
//   let user = await User.findOne({where: {id:userid}});
  AddToCart.update(
    {status: 'history'},
    {where: { status: 'purchased', uid: userid}}
    )
  Wallet.findAll({
    where: { userId: req.user.id },
    order: [["createdAt", "DESC"]],
    raw: true,
  })
    .then((listoftransactions) => {
      var totalamount = 0;
      for (var rowId in listoftransactions) {
        var transactionamt = listoftransactions[rowId].money;
        totalamount += transactionamt;
      }
      listoftransactions.totalamount = totalamount;
      var walletMoney = listoftransactions.totalamount;   
      console.log(walletMoney);   
      User.update(
        {
          walletMoney,
        },
        { where: { id: userid } }
      )
        .then((users) => {
        console.log(users.dataValues);
        
        Product.findAll({
            order: [['brand', 'DESC']],
            raw: true
        })
            .then((product) => {
                let products = product;
                for(let product of products){
                    product.price = product.price.toFixed(2);
                }
                req.user.walletMoney = walletMoney;
                res.render('product/shop', { product });
                return;
            })
            .catch((err) => console.log(err));
        });
      })
      .catch((err) => console.log(err));
      

    
});

router.get('/shopList', (req, res) => {
//   let user = await User.findOne({where: {id:userid}});
  
        
        Product.findAll({
            order: [['brand', 'DESC']],
            raw: true
        })
            .then((product) => {
                let products = product;
                for(let product of products){
                    product.price = product.price.toFixed(2);
                }
                res.render('product/shopList', { product });
                return;
            })
            .catch((err) => console.log(err));
});



function groupBy(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

function join(items) {
    var result = [];
    for(let i in items) {
        result.push(items[i].reduce(function(acc, xx) {
            acc.quantity += 1;
            return acc;
        }));
    }

    return result;
}

router.get('/cart', ensureAuthenticated, (req, res) => {
    let userid = req.user.id;
    if (req.user.userrole != "customer") {
      flashMessage(res, "error", "You have to login to a customer account!");
      res.redirect("/");
      return;
      
    }
    AddToCart.update(
      {status: 'history'},
      {where: { status: 'purchased', uid: userid}}
      )
    AddToCart.findAll({
        where: {
            status: 'cart',
            uid: userid
        },
        order: [['brand', 'DESC']],
        raw: true
    })
        .then((product) => {
            let joined = join(groupBy(product, 'prodID'));
            for(let join of joined) {
                join.price = join.price.toFixed(2);
                join.totalPrice = (join.price * join.quantity).toFixed(2);
            }
            res.render('product/cart', { 
                product: joined
            });
        })
        .catch(err => console.log(err));
});


// cart checkout
router.get('/checkOut', ensureAuthenticated, async function (req, res) {
    if (req.user.userrole != "customer") {
      flashMessage(res, "error", "You have to login to a customer account!");
      res.redirect("/");
      return;
      
    }
    let userid = req.user.id;
    AddToCart.findAll({
      where: {
          status: 'cart',
          uid: userid
      },
      order: [['brand', 'DESC']],
      raw: true
  })
      .then((product) => {
        let count = 0
        for (var i in product) {
          count += 1
        }
        if (count == 0) {
          flashMessage(res, "error", "No items to purchase!");
          return res.redirect("/product/cart");
        }
      });
    
    let status = req.body.status;
    
    // AddToCart.update(
    //   {status: 'purchased'},
    //   {where: {
    //       status: 'cart',
    //       uid: userid
    //       }},
    //     )


    AddToCart.findAll({
        where: {
            status: 'cart',
            uid: userid
        },
        order: [['brand', 'DESC']],
        raw: true
    })
        .then((product) => {
            let joined = join(groupBy(product, 'prodID'));
            for(let join of joined) {
                join.price = join.price.toFixed(2);
                join.totalPrice = (join.price * join.quantity).toFixed(2);
            }

            var summation = 0;

            for(let x of joined) {
                summation += parseFloat(x.totalPrice);
            }
            console.log(summation)
            if (req.user.walletMoney < summation) {
              flashMessage(res, "error", "Insufficient funds!");
              return res.redirect("/product/cart");
            }

            // AddToCart.update(
            //   {status: 'purchased'},
            //   {where: {
            //       status: 'cart',
            //       uid: userid}})
            // .catch(err => console.log(err));
            return res.render('product/payment', { 
                product: joined,
                summation: summation.toFixed(2)
            });

          }) 
});

// Single purchase checkout

router.get('/singleCheckOut/:id', ensureAuthenticated, async function (req, res) {
  if (req.user.userrole != "customer") {
    flashMessage(res, "error", "You have to login to a customer account!");
    res.redirect("/");
    return; 
  }
  
  
  Product.findByPk(req.params.id)
  .then((product) => {
      console.log(product);
      if (!product) {
          flashMessage(res, 'error', 'Product not found');
          res.redirect('/product/shop');
          return;
      }
      if (product.price > req.user.walletMoney) {
        flashMessage(res, "error", "Insufficent funds!");
        return res.redirect('/product/shop');
      }
      else {                
          product.price = product.price.toFixed(2);
      }
      let quantity = 1;
      console.log(quantity)
      return res.render('product/singlePayment', {product, quantity});
  })
  .catch(err => console.log(err));
});

// Cart checkout
router.post("/checkOut", ensureAuthenticated, (req, res) => {
    let userid = req.user.id;
    if (!onlyNumbers(req.body.contact)) 
    {
      flashMessage(res, "error", "Please input numbers only for your Contact");
      return res.redirect("checkOut");
    }
    AddToCart.findAll({
      where: {
        status: 'cart',
        uid: userid,
      },
      order: [["brand", "DESC"]],
      raw: true,
    })
      .then((product) => {
        let joined = join(groupBy(product, "prodID"));
        for (let join of joined) {
          join.price = join.price.toFixed(2);
          join.totalPrice = (join.price * join.quantity).toFixed(2);
        }
  
        var summation = 0;
  
        for (let x of joined) {
          summation += parseFloat(x.totalPrice);
        }
  
        let money = pos_to_neg(summation);
        let userId = req.user.id;
        let contact = req.body.contact;
        let address = req.body.address;
        if (req.user.walletMoney >= summation) {
          AddToCart.update(
            {status: 'purchased', contact, address},
            {where: {
                status: 'cart',
                uid: userid
                }},
              )
          Wallet.create({
              money,
              userId,
            }).then((wal) => console.log(wal));
            flashMessage(
              res,
              "success",
              `Payment of $${neg_to_pos(summation)} was made successfully`
            );
            // AddToCart.update(
            //   {status: 'history'},
            //   {where: {
            //   status: 'purchased',
            //   uid: userid
            //   }},
            // ).catch(err => console.log(err));

            return res.redirect("receipt");
            
        }
        else {
          flashMessage(res, "error", `Insufficient funds!`);
          return res.redirect("/product/shop");
        }
        
      })
      .catch((err) => console.log(err));
  });

// Single purchase checkout
router.post("/singleCheckOut/:id", ensureAuthenticated, (req, res) => {
  if (req.user.userrole != "customer") {
    flashMessage(res, "error", "You have to login to a customer account!");
    res.redirect("/");
    return; 
  }
  if (!onlyNumbers(req.body.contact)) 
    {
      flashMessage(res, "error", "Please input numbers only for your Contact");
      return res.redirect("/product/singleCheckout/"+req.params.id);
    }
  Product.findOne({
    where : {id : req.params.id},
    raw: true
  })
  .then((prod) => {
      let summation = 0;
      summation += parseFloat(prod.price);
      let prodID = req.params.id
      let brand = prod.brand
      let product = prod.product
      let description = prod.description
      let productURL = prod.productURL
      let size = prod.size
      let color = prod.color
      let price = prod.price
      let quantity = 1
      let uid = req.user.id
      let status = 'purchased'
      let contact = req.body.contact
      let address = req.body.address

      
      if (req.user.walletMoney >= summation) {
          let money = pos_to_neg(summation);
          let userId = req.user.id;
          AddToCart.create(
            {prodID,brand,product,description, productURL, size, color, price, quantity, uid, status, contact, address}
          );

          Wallet.findAll({
              where: { userId: req.user.id },
              order: [["createdAt", "DESC"]],
              raw: true,
            })
              .then((listoftransactions) => {
                var totalamount = 0;
                for (var rowId in listoftransactions) {
                  var transactionamt = listoftransactions[rowId].money;
                  totalamount += transactionamt;
                }
                listoftransactions.totalamount = totalamount;
                let walletMoney = parseFloat(listoftransactions.totalamount);
                Wallet.create({
                  money,
                  userId,
                }).then((wallet) => {
                  console.log(wallet.toJSON());
                  res.redirect('/product/singleReceipt');
                  return;
                  })
                  .catch(err => console.log(err));
              })
      }
      else {
          flashMessage(res, "error", "Insufficient funds!")
          return res.redirect('/product/shop');
      }

  });
});


//single purchase receipt

router.get('/singleReceipt', ensureAuthenticated, (req, res) => {
  let userid = req.user.id;
    if (req.user.userrole != "customer") {
      flashMessage(res, "error", "You have to login to a customer account!");
      res.redirect("/");
      return;
      
    }
    Wallet.findAll({
        where: { userId: req.user.id },
        order: [["createdAt", "DESC"]],
        raw: true,
      })
        .then((listoftransactions) => {
          var totalamount = 0;
          for (var rowId in listoftransactions) {
            var transactionamt = listoftransactions[rowId].money;
            totalamount += transactionamt;
          }
          listoftransactions.totalamount = totalamount;
          var walletMoney = listoftransactions.totalamount;
          req.user.walletMoney = walletMoney;
          User.update(
            {
              walletMoney,
            },
            { where: { id: req.user.id } })
          }).catch(err => console.log(err));
          
    AddToCart.findAll({
        where: {
            uid: userid,
            status: 'purchased',
            uid: userid,
        },
        order: [['brand', 'DESC']],
        raw: true
    })
        .then((product) => {
            let joined = join(groupBy(product, 'prodID'));
            for(let join of joined) {
                join.price = join.price.toFixed(2);
                join.totalPrice = (join.price * join.quantity).toFixed(2);
            }

            var summation = 0;

            for(let x of joined) {
                summation += parseFloat(x.totalPrice);
            }
            // AddToCart.update({status : 'purchased'},{ where: { uid: req.user.id, status: 'cart' } })
            // .then((cart) => {
            //   console.log(cart);
            // })
            //   .catch(err => console.log(err));
            res.render('product/receipt', { 
                product: joined,
                summation: summation.toFixed(2)
            });
        })
        .catch(err => console.log(err));
});


// cart receipt
router.get('/receipt', ensureAuthenticated, (req, res) => {
  let userid = req.user.id;
    if (req.user.userrole != "customer") {
      flashMessage(res, "error", "You have to login to a customer account!");
      res.redirect("/");
      return;
      
    }
    Wallet.findAll({
        where: { userId: req.user.id },
        order: [["createdAt", "DESC"]],
        raw: true,
      })
        .then((listoftransactions) => {
          var totalamount = 0;
          for (var rowId in listoftransactions) {
            var transactionamt = listoftransactions[rowId].money;
            totalamount += transactionamt;
          }
          listoftransactions.totalamount = totalamount;
          var walletMoney = listoftransactions.totalamount;
          req.user.walletMoney = walletMoney;
          User.update(
            {
              walletMoney,
            },
            { where: { id: req.user.id } })
          }).catch(err => console.log(err));
          
    AddToCart.findAll({
        where: {
            uid: userid,
            status: 'purchased',
            uid: userid,
        },
        order: [['brand', 'DESC']],
        raw: true
    })
        .then((product) => {
            let joined = join(groupBy(product, 'prodID'));
            for(let join of joined) {
                join.price = join.price.toFixed(2);
                join.totalPrice = (join.price * join.quantity).toFixed(2);
            }

            var summation = 0;

            for(let x of joined) {
                summation += parseFloat(x.totalPrice);
            }
            AddToCart.update({status : 'purchased'},{ where: { uid: req.user.id, status: 'cart' } })
            .then((cart) => {
              console.log(cart);
            })
              .catch(err => console.log(err));
            res.render('product/receipt', { 
                product: joined,
                summation: summation.toFixed(2)
            });
        })
        .catch(err => console.log(err));
});

router.get('/history', ensureAuthenticated, async (req, res) => {
  let userid = req.user.id;

    if (req.user.userrole != "customer") {
      flashMessage(res, "error", "You have to login to a customer account!");
      res.redirect("/");
      return;
  }
  let result = await AddToCart.update(
      {status: 'history'},
      {where: {
      status: 'purchased',
      uid: userid
      }},)
    AddToCart.findAll({
        where: {
          status: 'history',
          uid: userid
        },
        order: [['brand', 'DESC']],
        raw: true
    })
        .then((product) => {
            let joined = join(groupBy(product, 'prodID'));
            for(let join of joined) {
                join.price = join.price.toFixed(2);
                join.totalPrice = (join.price * join.quantity).toFixed(2);
            }

            var summation = 0;

            for(let x of joined) {
                summation += parseFloat(x.totalPrice);
            }

            res.render('product/history', { 
                product: joined,
                summation: summation.toFixed(2)
            });
        })
        .catch(err => console.log(err));
});

router.get('/successful', ensureAuthenticated,  (req, res) => {
  if (req.user.userrole != "customer") {
    flashMessage(res, "error", "You have to login to a customer account!");
    res.redirect("/");
    return;
  }
  Wallet.findAll({
    where: { userId: req.user.id },
    order: [["createdAt", "DESC"]],
    raw: true,
  })
    .then((listoftransactions) => {
      var totalamount = 0;
      for (var rowId in listoftransactions) {
        var transactionamt = listoftransactions[rowId].money;
        totalamount += transactionamt;
      }
      listoftransactions.totalamount = totalamount;
      var walletMoney = listoftransactions.totalamount;
      User.update(
        {
          walletMoney,
        },
        { where: { id: req.user.id } }
      )
        .then((users) => {
          req.user.walletMoney = walletMoney;
          res.render("product/successful", { });
          return;
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
//   Wallet.findAll({
//     where: { userId: req.user.id },
//     order: [["createdAt", "DESC"]],
//     raw: true,
//   })
//     .then((listoftransactions) => {
//       var totalamount = 0;
//       for (var rowId in listoftransactions) {
//         var transactionamt = listoftransactions[rowId].money;
//         totalamount += transactionamt;
//       }
//       listoftransactions.totalamount = totalamount;
//       var walletMoney = listoftransactions.totalamount;
//       User.update(
//         {
//           walletMoney,
//         },
//         { where: { id: req.user.id } }
//       )
//         .then((users) => {
//           req.user.walletMoney = walletMoney;
//           res.render('product/successful', {});
//           return;
//         })
//         .catch((err) => console.log(err));
//     })
//     .catch((err) => console.log(err));
    
});

router.get("/addToCart/:id", async (req, res) => {
    let id = req.params.id;
    let userid = req.user.id;
    let status = req.body.status;
    
    var prod = await Product.findOne({
        where: {
            id: id
        }
    });

    var toadd = {
        ...prod.dataValues,
        uid: userid,
        prodID: id,
        quantity: 1,
        status: 'cart'
    }
    
    if (status != 'purchased' || status != 'history'){
      AddToCart.create(toadd);
    }

    return res.redirect("/product/cart");
});

router.get('/editProduct/:id', ensureAuthenticated, (req, res) => {
  if (req.user.userrole == "customer") {
    flashMessage(res, "error", "You have no authorized access!");
      res.redirect("/");
      return;
    
  }
    Product.findByPk(req.params.id)
        .then((product) => {
            if (!product) {
                flashMessage(res, 'error', 'Product not found');
                res.redirect('/product/listProduct');
                return;
            }
            if (req.user.id != product.userId) {
                flashMessage(res, 'error', 'Unauthorised access');
                res.redirect('/product/listProduct');
                return;
            }
            console.log("SH");
            console.log(product.productURL);
            res.render('product/editProduct', { product });
        })
        .catch(err => console.log(err));
});

router.post('/editProduct/:id', ensureAuthenticated, (req, res) => {
    let brand = req.body.brand;
    let product = req.body.product;
    let description = req.body.description;
    let productURL = req.body.productURL;
    let size = req.body.size;
    let color = req.body.color;
    let price = req.body.price;
    let userId = req.user.id;

    Product.update(
        {brand, product, description, productURL, size, color, price, userId},
        { where: { id: req.params.id } }
    ).catch(err => console.log(err));
    AddToCart.update(
        {brand, product, description, productURL, size, color, price},
        { where: { prodId: req.params.id } }
    )
        .then((result) => {
            console.log(result[0] + ' product updated');
            res.redirect('/product/listProduct');
        })
        .catch(err => console.log(err));
});


// router.get('/order/:id', ensureAuthenticated, (req, res) => {
//     Product.findByPk(req.params.id)
//         .then((product) => {
//             if (!product) {
//                 flashMessage(res, 'error', 'Product not found');
//                 res.redirect('/product/shop');
//                 return;
//             }
//             else {                
//                 product.price = product.price.toFixed(2);
//             }
            

//             res.render('product/order', 
//             {product});
//         })
//         .catch(err => console.log(err));
// });

// router.post('/order/:id', ensureAuthenticated, (req, res) => {
//     let brand = req.body.brand;
//     let product = req.body.product;
//     let description = req.body.description;
//     let productURL = req.body.productURL;
//     let size = req.body.size;
//     let color = req.body.color;
//     let price = req.body.price;
//     let userId = req.user.id;

//     AddToCart.update(
//         {brand, product, description, productURL, size, color, price, userId},
//         { where: { id: req.params.id } }
//     )
//         .then((result) => {
//             console.log(result[0] + ' product added to cart');
//             res.redirect('/product/cart');
//         })
//         .catch(err => console.log(err));
// });

router.get('/singlePurchase/:id', ensureAuthenticated, (req, res) => {
    Product.findByPk(req.params.id)
        .then((product) => {
            console.log(product);
            if (!product) {
                flashMessage(res, 'error', 'Product not found');
                res.redirect('/product/shop');
                return;
            }
            if (product.price > req.user.walletMoney) {
              flashMessage(res, "error", "Insufficent funds!");
              return res.redirect('/product/shop');
            }
            else {                
                product.price = product.price.toFixed(2);
            }
            
            return res.render('product/singlePurchase', {product});
        })
        .catch(err => console.log(err));
});

router.post('/singlePurchase/:id', ensureAuthenticated, (req, res) => {
    Product.findOne({
        where : {id : req.params.id},
        order: [['brand', 'DESC']],
        raw: true
    })
    .then((product) => {
        let summation = 0;
        summation += parseFloat(product.price);
        
        if (req.user.walletMoney >= summation) {
            let money = pos_to_neg(summation);
            let userId = req.user.id;
            Wallet.findAll({
                where: { userId: req.user.id },
                order: [["createdAt", "DESC"]],
                raw: true,
              })
                .then((listoftransactions) => {
                  var totalamount = 0;
                  for (var rowId in listoftransactions) {
                    var transactionamt = listoftransactions[rowId].money;
                    totalamount += transactionamt;
                  }
                  listoftransactions.totalamount = totalamount;
                  let walletMoney = parseFloat(listoftransactions.totalamount);
                  Wallet.create({
                    money,
                    userId,
                  }).then((wallet) => {
                    console.log(wallet.toJSON());
                    res.redirect('/product/successful');
                    return;
                    })
                    .catch(err => console.log(err));
                })
        }
        else {
            flashMessage(res, "error", "Insufficient funds!")
            return res.redirect('/product/shop');
        }

    });
});

router.get('/deleteProduct/:id', ensureAuthenticated, async function (req, res) {
    try {
        if (req.user.userrole == "customer") {
          flashMessage(res, "error", "You have no authorized access!");
            res.redirect("/");
            return;
          
        }
        let product = await Product.findByPk(req.params.id);
        if (!product) {
            flashMessage(res, 'error', 'Product not found');
            res.redirect('/product/listProduct');
            return;
        }
        if (req.user.id != product.userId) {
            flashMessage(res, 'error', 'Unauthorised access');
            res.redirect('/product/listProduct');
            return;
        }

        let result = await Product.destroy({ where: { id: product.id } });
        let result1 = await AddToCart.destroy({ where: { prodID: product.id } });
        console.log(result + ' product deleted');
        console.log(result1 + ' product removed from cart');
        res.redirect('/product/listProduct');
    }
    catch (err) {
        console.log(err);
    }
});

router.get('/cartRemove/:id', ensureAuthenticated, async function (req, res) {
    try {
        if (req.user.userrole != "customer") {
          flashMessage(res, "error", "You have to login to a customer account!");
          res.redirect("/");
          return;
        }
        let product = await Product.findByPk(req.params.id);
        if (!product) {
            flashMessage(res, 'error', 'Product not found');
            res.redirect('/product/cart');
            return;
        }
        

        let result = await AddToCart.destroy({ where: { 
            uid: req.user.id,
            prodID: req.params.id,
            status: 'cart',
        }
        });
        console.log(result + ' product removed');
        res.redirect('/product/cart');
    }
    catch (err) {
        console.log(err);
    }
});

// router.get('/afterPayment/:id', ensureAuthenticated, async function (req, res) {
//     try {
//         let product = await Product.findByPk(req.params.id);
//         if (!product) {
//             flashMessage(res, 'error', 'Product not found');
//             res.redirect('#');
//             return;
//         }
        
//         let result = await AddToCart.destroy({ where: { 
//             uid: req.user.id,
//             prodID: req.params.id
//         },  
//         });
//         console.log(result + ' product removed');
//         res.redirect('#');
//     }
//     catch (err) {
//         console.log(err);
//     }
// });

router.get('/omdb', ensureAuthenticated, (req, res) => {
    let apikey = process.env.OMDB_API_KEY;
    let title = req.query.title;
    fetch(`https://www.omdbapi.com/?t=${title}&apikey=${apikey}`)
        .then(res => res.json())
        .then(data => {
            console.log(data);
            res.json(data);
        });
});

router.post('/upload', ensureAuthenticated, (req, res) => {
    // Creates user id directory for upload if not exist
    if (!fs.existsSync('./public/uploads/' + req.user.id)) {
        fs.mkdirSync('./public/uploads/' + req.user.id, { recursive: true });
    }

    upload(req, res, (err) => {
        if (err) {
            // e.g. File too large`
            res.json({ err: err });
        }
        else if (req.file == undefined) {
            res.json({});
        }
        else {
            res.json({ file: `/uploads/${req.user.id}/${req.file.filename}` });
        }
    });
});

router.post("/productUpload", ensureAuthenticated, (req, res) => {
    // Creates user id directory for upload if not exist
    if (!fs.existsSync("./public/uploads/product/")) {
      fs.mkdirSync("./public/uploads/product/", { recursive: true });
    }
    productUpload(req, res, (err) => {
      if (err) {
        // e.g. File too large
        res.json({ file: "/img/no-image.jpg", err: err });
      } else {
        res.json({ file: `/uploads/product/${req.file.filename}` });
      }
    });
  });

router.get('/payment', ensureAuthenticated, (req, res) => {
    res.render('product/payment');
});

router.post('/payment', ensureAuthenticated, (req, res) => {
    let contact = req.body.contact;
    let address = req.body.address;
    AddToCart.update(
        {contact, address},
        { where: { uid: req.user.id} }
    )
    .then((product) => {
        console.log(contact, address);
        return res.render('product/successful');
    })
    .catch(err => console.log(err))
});

module.exports = router;