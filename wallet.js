const express = require("express");
const router = express.Router();
const flashMessage = require("../helpers/messenger");
const moment = require("moment");
const Cards = require("../models/Cards");
const Wallet = require("../models/Wallet");
const ensureAuthenticated = require("../helpers/auth");
const { template } = require("handlebars");
const User = require("../models/User");

function pos_to_neg(num) {
  return -Math.abs(num);
}

function neg_to_pos(num) {
  return Math.abs(num);
}

router.get("/viewWallets", ensureAuthenticated, (req, res) => {
  if (req.user.userrole == "customer") {
    flashMessage(res, "error", "Unauthorized access!");
    res.redirect("/");
    return;
  }

  User.findAll(
    {
      where : {userstatus : 1, verified: 1, userrole: "customer", },
      order: [['createdAt', 'DESC']],
      raw: true
    })
    .then((users) => {
      console.log(req.user.userstatus);
      return res.render('wallet/viewWallets', { users });
    }).catch((err) => console.log(err));

});


router.get("/ewallet", ensureAuthenticated, (req, res) => {
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
          console.log(users);
          req.user.walletMoney = walletMoney;
          res.render("wallet/ewallet", { wallet: listoftransactions });
          return;
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
});

router.get("/addBalance", ensureAuthenticated, (req, res) => {
  res.render("wallet/addBalance");
  return;
});
router.get("/addCards", ensureAuthenticated, (req, res) => {
  res.render("wallet/addCards");
  return;
});
router.get("/withdrawBalance", ensureAuthenticated, (req, res) => {
  res.render("wallet/withdrawBalance");
  return;
});
router.get("/newcard", ensureAuthenticated, (req, res) => {
  Cards.findAll({
    where: { userId: req.user.id },
    raw: true,
  })
    .then((cards) => {
      // pass object to listVideos.handlebar
      let x = cards;
      res.render("wallet/newcard", { cards });
    })
    .catch((err) => console.log(err));
  return;
});

router.post("/addBalance", ensureAuthenticated,  (req, res) => {
  console.log(req.user.id);
  Wallet.findAll({
    where: { userId: req.user.id },
    order: [["createdAt", "DESC"]],
    raw: true,
  }).then((listoftransactions) => {
    var totalamount = 0;
    var count = 0;
    for (var rowId in listoftransactions) {
      var transactionamt = listoftransactions[rowId].money;
      totalamount += transactionamt;
    }
    listoftransactions.totalamount = totalamount;
    let money = req.body.money;
    let first_name = req.body.firstname;
    let userId = req.user.id;
    let walletMoney = parseFloat(listoftransactions.totalamount);

    Wallet.create({
      money,
      userId,
    })
      .then((wallet) => {
        console.log(wallet.toJSON());
      })
      .catch((err) => console.log(err));

    User.findOne({
      attributes: ["id", "walletMoney"],
      where: { id: userId },
    })
      .then((user) => {
        console.log(user.toJSON());
        User.update(
          {
            walletMoney,
          },
          { where: { id: userId } }
        ).then((result) => {
          
          return res.redirect("ewallet");
        })
        
      })
      .catch((err) => console.log(err));
  })
  .catch((err) => console.log(err));
});

router.post("/withdrawBalance", ensureAuthenticated, async (req, res) => {
  console.log(req.user.id);
  Wallet.findAll({
    where: { userId: req.user.id },
    order: [["createdAt", "DESC"]],
    raw: true,
  })
    .then((listoftransactions) => {
      // pass object to listVideos.handlebar
      var totalamount = 0;
      var count = 0;
      for (var rowId in listoftransactions) {
        var transactionamt = listoftransactions[rowId].money;
        totalamount += transactionamt;
      }
      listoftransactions.totalamount = totalamount;
      let money = pos_to_neg(req.body.money);
      if (money == 0) {
        flashMessage(res, "error", "You cannot withdraw $0!");
        return res.redirect("withdrawBalance");
      } else if (neg_to_pos(money) > listoftransactions.totalamount) {
        flashMessage(
          res,
          "error",
          "You cannot withdraw more money than what you currently have!"
        );
        return res.redirect("withdrawBalance");
      } else {
        let first_name = req.body.firstname;
        let userId = req.user.id;
        let walletMoney = parseFloat(listoftransactions.totalamount);
        Wallet.create({
          money,
          userId,
        })
          .then((wallet) => {
            console.log(wallet.toJSON());
            User.update(
              {
                walletMoney,
              },
              { where: { id: userId } }
            )
              .then((result) => {
                console.log(result);
                flashMessage(
                  res,
                  "success",
                  `$${neg_to_pos(money)} has been withdrawn from your wallet!`
                );
                return res.redirect("ewallet");
              })
              .catch((err) => console.log(err));
          })
          .catch((err) => console.log(err));
      }

    })
    .catch((err) => console.log(err));
});

function onlyNumbers(str) {
  return /^[0-9]+$/.test(str);
}

router.post("/addCards", ensureAuthenticated, (req, res) => {
  console.log(req.user.id);
  if (!onlyNumbers(req.body.cardNumber) || !onlyNumbers(req.body.cvv)) 
  {
    flashMessage(res, "error", "Please input numbers only for your Card Number and CVV");
    return res.redirect("/wallet/addCards");
  }
  let cardNumber = parseInt(req.body.cardNumber);
  let CVV = parseInt(req.body.cvv);
  let Email = req.body.email;
  let Address = req.body.address;
  let userId = req.user.id;
  let expiryDate = moment(req.body.expMonth);
  let Status = 1;
  let Name = req.body.cardname;
  // let expiryDate = moment(`${expMonth}/${expyear}`, "MM/YY")
  Cards.create({
    cardNumber,
    CVV,
    Email,
    Address,
    userId,
    Name,
    Status,
    expiryDate,
  })
    .then((cards) => {
      console.log(cards.toJSON());

      res.redirect("ewallet");
    })
    .catch((err) => console.log(err));
});

router.get("/deleteCard/:id", ensureAuthenticated, async function (req, res) {
  try {
    let cards = await Cards.findByPk(req.params.id);
    if (!cards) {
      flashMessage(res, "error", "Card not found");
      res.redirect("/wallet/ewallet");
      return;
    }
    if (req.user.id != cards.userId) {
      flashMessage(res, "error", "Unauthorised access");
      res.redirect("/wallet/ewallet");
      return;
    }
    let Status = 0;
    Cards.update({ Status }, { where: { id: cards.id } }).then((card) => {
      console.log(card + " Card deleted");
      flashMessage(res, "success", "Card Deleted Successfully!");
      res.redirect("/wallet/newcard");
      return;
    });
  } catch (err) {
    console.log(err);
  }
});

router.get("/editCard/:id", ensureAuthenticated, (req, res) => {
  Cards.findByPk(req.params.id)
    .then((card) => {
      if (!card) {
        flashMessage(res, "error", "Cards not editted successfully");
        res.redirect("/wallet/newcard");
        return;
      }
      if (req.user.id != card.userId) {
        flashMessage(res, "error", "Unauthorised access");
        res.redirect("/wallet/newcard");
        return;
      }

      res.render("wallet/editCard", { card });
    })
    .catch((err) => console.log(err));
});

router.post("/editCard/:id", ensureAuthenticated, (req, res) => {
  if (!onlyNumbers(req.body.newCardno) || !onlyNumbers(req.body.newCVV)) 
  {
    flashMessage(res, "error", "Please input numbers only for your Card Number and CVV");
    return res.redirect("/wallet/editCard/" + req.params.id);
  }
  let expiryDate = req.body.expMonth;
  let Name = req.body.name;
  let cardNumber = parseInt(req.body.newCardno);
  let CVV = parseInt(req.body.newCVV);

  Cards.update({ Name, cardNumber, CVV, expiryDate }, { where: { id: req.params.id } })
    .then((result) => {
      console.log(result[0] + " card updated");
      flashMessage(res, "success", "Card Edited Successfully! ");
      res.redirect("/wallet/newcard");
    })
    .catch((err) => console.log(err));
});

module.exports = router;
