
const express = require("express");
const router = express.Router();
require("dotenv").config();
const sgMail = require("@sendgrid/mail");
const moment = require("moment");
const Bookings = require("../models/Bookings");
const Locations = require("../models/Locations");
const Wallet = require("../models/Wallet");
const User = require("../models/User");
const Programme = require("../models/Programmes");
const ensureAuthenticated = require("../helpers/auth");
const flashMessage = require("../helpers/messenger");
require("dotenv").config();
const Sequelize = require('sequelize');

// neg and pos functions
function pos_to_neg(num) {
  return -Math.abs(num);
}

function neg_to_pos(num) {
  return Math.abs(num);
}

// after today
function isAfterToday(date) {
  const today = new Date();

  // today.setHours(00, 00, 00, 001);
  // console.log(today);
  return date > today;
}

// Messages

function sendAddEmail(toEmail, name, date, activity, amount) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const message = {
    to: toEmail,
    from: `ADIJC <${process.env.SENDGRID_SENDER_EMAIL}>`,
    subject: "Booking notification",
    html: `<i>This is an automated message, do not reply.</i><br>
    Dear ${name},<br>Your booking on the ${date} for ${activity} has been successfully created! 
    $${amount} has been deducted from your e-wallet.<br>Thank you!<br>Regards, ADIJC Fitness`,
  };

  // Returns the promise from SendGrid to the calling function
  return new Promise((resolve, reject) => {
    sgMail
      .send(message)
      .then((response) => resolve(response))
      .catch((err) => reject(err));
  });
}

function sendDeleteEmail(toEmail, name, date, activity, adminName, amount) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const message = {
    to: toEmail,
    from: `ADIJC <${process.env.SENDGRID_SENDER_EMAIL}>`,
    subject: "Booking notification",
    html: `<i>This is an automated message, do not reply.</i><br>
    Dear ${name},<br>Your booking on the ${date} for ${activity} has been deleted by Admin: ${adminName}! 
    $${amount} has been refunded into your e-wallet.<br>Thank you!<br>Regards, ADIJC Fitness`,
  };

  // Returns the promise from SendGrid to the calling function
  return new Promise((resolve, reject) => {
    sgMail
      .send(message)
      .then((response) => resolve(response))
      .catch((err) => reject(err));
  });
}

function sendEditEmail(
  toEmail,
  name,
  date,
  activity,
  adminName,
  changes,
  reason
) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const message = {
    to: toEmail,
    from: `ADIJC <${process.env.SENDGRID_SENDER_EMAIL}>`,
    subject: "Booking notification",
    html: `<i>This is an automated message, do not reply.</i><br>
    Dear ${name},<br>Your booking on the ${date} for ${activity} has been edited by Admin: ${adminName}.<br>
    Changes made:<br>${changes}<br>Reason:<br>${reason}<br>Thank you!<br>Regards, ADIJC Fitness`,
  };

  // Returns the promise from SendGrid to the calling function
  return new Promise((resolve, reject) => {
    sgMail
      .send(message)
      .then((response) => resolve(response))
      .catch((err) => reject(err));
  });
}

// Required for file upload
const fs = require("fs");
const upload = require("../helpers/imageUpload");
const e = require("connect-flash");


// Admin side

router.get(
  "/listBookingsAdmin",
  ensureAuthenticated,
  async function (req, res) {
    if (req.user.userrole == "customer") {
      flashMessage(res, "error", "You have no authorized access!");
        res.redirect("/");
        return;
      
    }
    
    let bookingcount = await Bookings.count();
    Bookings.findAll({
      include: [User, Locations, Programme],
      where : {bookingstatus : 1},
      order: [["createdAt", "DESC"]],
      raw: true,
    })
      .then((bookings) => {
        check = false;
        console.log(bookingcount);

        for (var i = 0; i < bookingcount; i++) {
          if (
            bookingcount == 0 ||
            typeof bookings[i].bookingstatus === "undefined"
          ) {
            res.render("booking/listBookings", {});
            return;
          }
          if (bookings[i].bookingstatus == 1) {
            check = true;
            break;
          }
        }
        if (!check) {
          // console.log(bookings[0]['user.email']); // access email n stuff
          res.render("booking/listBookingsAdmin", {});
        } else {
          res.render("booking/listBookingsAdmin", { bookings });
        }
        return;
      })
      .catch((err) => console.log(err));
  }
);

// User side
router.get("/listBookings", ensureAuthenticated, async function (req, res) {
  let bookingcount = await Bookings.count({ where: { userId: req.user.id } });
  let userRole = req.user.userrole;
  if (userRole != "customer") {
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
      
  

  Bookings.findAll({
    include: [Locations, Programme],
    where: { userId: req.user.id, bookingstatus : 1},
    order: [["date", "DESC"]],
    raw: true,
  })
    .then((bookings) => {
      check = false;
      console.log(bookings[i])
      for (var i = 0; i < bookingcount; i++) {
        if (
          bookingcount == 0 ||
          typeof bookings[i] == "undefined"
        ) {
          res.render("booking/listBookings", {});
          return;
        }
        if (!isAfterToday(bookings[i].date)) {
          bookingstatus = 0;
          Bookings.update({bookingstatus}, {where : {date : bookings[i].date}});
        }
        if (bookings[i].bookingstatus == 1) {
          check = true;
          break;
        }
      }
      if (!check) {
        res.render("booking/listBookings", {});
      } else {
        res.render("booking/listBookings", { bookings });
      }
      return;
    })
    .catch((err) => console.log(err));
});

// User add booking
router.get("/addBooking", ensureAuthenticated, async function (req, res) {
  let userRole = req.user.userrole;
  if (userRole != "customer") {
    flashMessage(res, "error", "You have no authorized access!");
    res.redirect("/");
    return;
  }
  let locationcount = await Locations.count({ where: { status: 1 } });
  let progcount = await Programme.count({ where: { avail: 1 } });
  Locations.findAll({
    where: { status: 1 },
    order: [["createdAt", "DESC"]],
    raw: true,
  })
    .then((location) => {
      if (locationcount > 0 && progcount > 0) {
        let locationList = [];
        let locationurlList = [];
        for (var i = 0; i < locationcount; i++) {
          locationList.push(location[i].locationName);
        }

        for (var i = 0; i < locationcount; i++) {
          locationurlList.push(location[i].locationURL);
        }
        let firstLoc = locationList[0];
        
        Programme.findAll({
          where: { avail: 1 },
        }).then((prog) => {
          
            let progList = [];
            let progurlList = [];
            let progLocList = [];
            let progTimeList = [];
            let progDateList = [];
            let fullProgList = [];
            let progPayment = [];
            let firstProg = prog[0];
            let gymOp = "Gym";
            for (var i = 1; i < progcount; i++) {
              progList.push(prog[i].name);
              
            }
            for (var i = 0; i < progcount; i++) {
              if (!isAfterToday(prog[i].progDate)) {
                console.log("HELLO");
                let avail = 0;
                let bookingstatus = 0;
                Programme.update({avail}, {where : {id : prog[i].id}});
                Bookings.update({bookingstatus}, {where: {programmeId : prog[i].id}});
                continue;
              }
              fullProgList.push(prog[i].name);
              progurlList.push(prog[i].progURL);
              progLocList.push(prog[i].loc);
              progDateList.push(moment(prog[i].progDate).format("DD/MM/YYYY"));
              progTimeList.push(moment(prog[i].progDate).format("HH:mm"));
              progPayment.push(prog[i].price);
            }
            return res.render("booking/addBooking", {
              firstLoc,
              gymOp,
              firstProg,
              progPayment,
              locationList,
              locationurlList,
              prog,
              fullProgList,
              progList,
              progurlList,
              progLocList,
              progDateList,
              progTimeList,
            });
            
        });
      } else if (locationcount > 0 && progcount == 0) {
        let locationList = [];
        let locationurlList = [];
        let gymOp = "Gym";
        for (var i = 0; i < locationcount; i++) {
          locationList.push(location[i].locationName);
        }

        for (var i = 0; i < locationcount; i++) {
          locationurlList.push(location[i].locationURL);
        }
        let firstLoc = locationList[0];
        flashMessage(
          res,
          "error",
          "No programmes available at the moment for Gyms!"
        );
        res.render("booking/addBooking", {
          firstLoc,
          gymOp,
          locationList,
          locationurlList,
        });
        return;
      } else if (progcount > 0 && locationcount == 0) {
        Programme.findAll({
          where: { avail: 1 },
        }).then((prog) => {
          
          let progList = [];
          let progurlList = [];
          let progLocList = [];
          let progTimeList = [];
          let progDateList = [];
          let fullProgList = [];
          let progPayment = [];
          let firstProg = prog[0];
          
          for (var i = 1; i < progcount; i++) {
            progList.push(prog[i].name);
            
          }
          for (var i = 0; i < progcount; i++) {
            if (!isAfterToday(prog[i].progDate)) {
              console.log("HELLO");
              let avail = 0;
              let bookingstatus = 0;
              Programme.update({avail}, {where : {id : prog[i].id}});
              Bookings.update({bookingstatus}, {where: {programmeId : prog[i].id}});
              continue;
            }
            fullProgList.push(prog[i].name);
            progurlList.push(prog[i].progURL);
            progLocList.push(prog[i].loc);
            progDateList.push(moment(prog[i].progDate).format("DD/MM/YYYY"));
            progTimeList.push(moment(prog[i].progDate).format("HH:mm"));
            progPayment.push(prog[i].price)
          }
          console.log(progList);
          flashMessage(
            res,
            "error",
            "No locations for gyms are available at the moment!"
          );
          console.log(firstProg,"FIRST PROG \n",fullProgList,"FULLPROGLIST\n",progList,"PROGLIST\n",progPayment,"PROGPAYMENT\n",progurlList,"PROGURLLIST\n",progLocList,"PROGLOCLIST\n",progDateList,"PROGDATELIST\n",progTimeList,"PROGTIMELIST\n",);
          res.render("booking/addBooking", {
            prog,
            fullProgList,
            progList,
            firstProg,
            progPayment,
            progurlList,
            progLocList,
            progDateList,
            progTimeList,
          });
          return;
        });
      } else {
        flashMessage(
          res,
          "error",
          "No programmes or gym locations available at the moment!"
        );
        res.redirect("/booking/listBookings");
        return;
      }
    })
    .catch((err) => console.log(err));
});

router.post("/addBooking", ensureAuthenticated, async (req, res) => {
  let booked = await User.findOne({ where: { id: req.user.id } });
  let progcount = await Bookings.count({where: {activity :req.body.activity, bookingstatus: 1}});
  let locationcount = await Locations.count({ where: { status: 1 } });
  let activity = req.body.activity;
  let user = User.findOne({ where: { id: req.user.id } });
  let activityURL = "";
  let timeslot = "";
  let locationN = ""
  let paymentmade = 0;
  let date = new Date();
  if (activity == "Gym") {
    activityURL = "/img/Homepage/gym.webp";
    date = moment(`${req.body.date} ${req.body.timeslot}`, "DD/MM/YYYY HH:mm");
    timeslot = req.body.timeslot;
    locationN = req.body.location;
    paymentmade = 5;
    
  } else {
    let prog = await Programme.findOne({where : {name : activity, avail : 1}});
    console.log(progcount);
    activityURL = prog.progURL;
    locationN = prog.loc;
    paymentmade = (prog.price).toFixed(2);
    date = moment(prog.progDate , "DD/MM/YYYY HH:mm");
    
  }
  if (!isAfterToday(date)) {
    flashMessage(res, "error", "Book a timing after the current time and date!");
    return res.redirect("/booking/addBooking");
  }
  let bookingstatus = 1;
  let userId = req.user.id;
  let userName = req.user.name;
  let userEmail = req.user.email;
  
  let mailDate = date.format("DD/MM/YYYY").toString();
  if (activity == "Gym") {
    Locations.findOne({ where: { locationName: locationN, status : 1 } })
      .then((loc) => {
        let locationId = loc.id;
        Bookings.findAndCountAll({
          include: [User, Locations],
          where: { locationId: locationId, bookingstatus: 1, date: date },
          raw: true,
        })
          .then((result) => {
            console.log(result);
            let capacity = loc.capacity;
            let walletMoney = booked["walletMoney"];
            if (result.count >= capacity) {
              flashMessage(res, "error", "Too many people at this timing!");
              return res.redirect("/booking/addBooking");
            } else if (walletMoney < paymentmade) {
              flashMessage(res, "error", "Not enough money! Top up!");
              return res.redirect("/booking/addBooking");
            } else {
              Bookings.create({
                activity,
                date,
                timeslot,
                activityURL,
                paymentmade,
                bookingstatus,
                userId,
                locationId,
              }).then((bookings) => {
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
                    let money = pos_to_neg(paymentmade);
                    let walletMoney = parseFloat(
                      listoftransactions.totalamount
                    );
                    Wallet.create({
                      money,
                      userId,
                    }).then((wallet) => {
                      console.log(wallet.toJSON());
                      User.update({ walletMoney,}, { where: { id: req.user.id } })
                        .then((user) => {
                          sendAddEmail(
                            userEmail,
                            userName,
                            mailDate,
                            activity,
                            paymentmade
                          )
                            .then((response) => {
                              console.log(response);
                              flashMessage(res, "success", "Booking created successfully");
                              flashMessage(res, "success", `Payment of $${paymentmade} was made successfully`);
                              res.redirect("/booking/listBookings");
                              return;
                            })
                            .catch((err) => {
                              console.log(err);
                              flashMessage(res, "error", "Error when sending email to " + userEmail);
                              res.redirect("/booking/listBookings");
                              return;
                            });
                        })
                        .catch((err) => console.log(err));
                    });
                  })
                  .catch((err) => console.log(err));
              });
            }
          })
          .catch((err) => console.log(err));
      })
      .catch((err) => {
        console.log(err);
        flashMessage(res, "error", "Location not found!");
        return res.redirect("/booking/listBookings");
      });
  } else {
    console.log(activity)
    
    Programme.findOne({ where : {name : activity, avail : 1}})
    .then((programme) => {
      let walletMoney = booked["walletMoney"];
      if (progcount >= programme.cap) {
        flashMessage(res, "error", "Programme is fully booked!");
        return res.redirect("/booking/addBooking");
      }
      else if (walletMoney < paymentmade) {
              flashMessage(res, "error", "Not enough money! Top up!");
              return res.redirect("/booking/addBooking");
            }
      let money = parseFloat(pos_to_neg(paymentmade));
      let programmeId = programme.id;
      Bookings.create({
        activity,
        date,
        timeslot,
        activityURL,
        paymentmade,
        bookingstatus,
        userId,
        programmeId
      }).then((bookings) => {
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
              
              let walletMoney = parseFloat(
                listoftransactions.totalamount
              );
            Wallet.create({
              money,
              userId,
            }).then(
              (wallet) => {
              console.log(wallet.toJSON());
              User.update({ walletMoney,}, { where: { id: req.user.id } })
              .then((user) => {
                req.user.id = walletMoney
                sendAddEmail(
                userEmail,
                userName,
                mailDate,
                activity,
                paymentmade)
                .then((response) => {
                console.log(response);
                flashMessage(res, "success", "Booking created successfully");
                flashMessage(res, "success", `Payment of $${paymentmade} was made successfully`);
                return res.redirect("/booking/listBookings");
                })
                .catch((err) => {
                  console.log(err);
                  flashMessage(res, "error", "Error when sending email to " + userEmail);
                  return res.redirect("/booking/listBookings");
                });
            })
          })
          .catch(
            (err) => 
            console.log(err));
        })

        
      });
    })
    .catch((err) => console.log(err))
    return;
  }
});

// User Edit booking
router.get("/editBooking/:id", ensureAuthenticated, async (req, res) => {
  let locationcount = await Locations.count({ where: { status: 1 } });
  Bookings.findByPk(req.params.id, {
    include: [Locations],
  })
    .then((bookings) => {
      
      if (!bookings) {
        flashMessage(res, "error", "Booking not found");
        res.redirect("/booking/listBookings");
        return;
      }
      if (req.user.id != bookings.userId) {
        flashMessage(res, "error", "Unauthorised access");
        res.redirect("/booking/listBookings");
        return;
      }
      if (bookings.locationId === null) {
        flashMessage(res, "error", "You cannot edit programme bookings!");
        res.redirect("/booking/listBookingsAdmin");
        return;
      }

      Locations.findAll({ where: { status: 1 } })
        .then((loc) => {
          let location = "";
          for (var j = 0; j < locationcount; j++) {
            if (loc[j].id == bookings.locationId) {
              location = loc[j].locationName;
              locationurl = loc[j].locationURL;
            }
          }
          let date = bookings.date;
          let locationList = [];
          let locationurlList = [];
          for (var i = 0; i < locationcount; i++) {
            locationList.push(loc[i].locationName);
            locationurlList.push(loc[i].locationURL);
          }

          res.render("booking/editBooking", {
            bookings,
            locationurl,
            locationList,
            locationurlList,
            location,
            date,
          });
        })
        .catch((err) => {
          console.log(err);
          flashMessage(res, "error", "Location not found!");
        });
    })
    .catch((err) => console.log(err));
});

router.post("/editBooking/:id", ensureAuthenticated, (req, res) => {
  let locationN = req.body.location.toString();
  let timeslot = req.body.timeslot.toString();
  let date = moment(`${req.body.date} ${timeslot}`, "DD/MM/YYYY HH:mm");
  if (!isAfterToday(date)) {
    flashMessage(res, "error", "Book a timing after the current time and date!");
		return res.redirect("/booking/editBooking");
  }
  Locations.findOne({ where: { locationName: locationN, status : 1 } })
    .then((loc) => {
      let locationId = loc.id;
      Bookings.findAndCountAll({
        include: [User, Locations],
        where: { locationId: locationId, bookingstatus: 1, date: date },
        raw: true,
      })
        .then((booking) => {
          let capacity = loc.capacity;
          if (booking.count >= capacity) {
            flashMessage(res, "error", "Too many people at this timing!");
            return res.redirect("/booking/listBookings");
          } else {
            Bookings.update(
              {
                date,
                locationId,
              },
              { where: { id: req.params.id } }
            )
              .then((result) => {
                console.log(result[0] + " Booking updated");
                flashMessage(res, "success", "Booking successfully updated!");
                res.redirect("/booking/listBookings");
              })
              .catch((err) => console.log(err));
          }
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
});

// Staff edit booking
router.get("/editBookingAdmin/:id", ensureAuthenticated, async (req, res) => {
  let locationcount = await Locations.count({ where: { status: 1 } });
  let userRole = req.user.userrole;
  if (userRole == "customer") {
    flashMessage(res, "error", "You have no authorized access!");
    res.redirect("/booking/listBookings");
    return;
  }

  Bookings.findByPk(req.params.id)
    .then((bookings) => {
      if (!bookings) {
        flashMessage(res, "error", "Booking not found");
        res.redirect("/booking/listBookingsAdmin");
        return;
      }

      if (bookings.locationId === null) {
        flashMessage(res, "error", "You cannot edit programme bookings!");
        res.redirect("/booking/listBookingsAdmin");
        return;
      }
      Locations.findAll({ where: { status: 1 } })
        .then((loc) => {
          let location = "";
          for (var j = 0; j < locationcount; j++) {
            if (loc[j].id == bookings.locationId) {
              location = loc[j].locationName;
            }
          }
          let date = bookings.date;
          let locationList = [];
          let locationurlList = [];
          for (var i = 0; i < locationcount; i++) {
            locationList.push(loc[i].locationName);
            locationurlList.push(loc[i].locationURL);
          }

          res.render("booking/editBookingAdmin", {
            bookings,
            locationList,
            locationurlList,
            location,
            date,
          });
        })
        .catch((err) => {
          console.log(err);
          flashMessage(res, "error", "Location not found!");
        });
    })
    .catch((err) => console.log(err));
});

router.post("/editBookingAdmin/:id", ensureAuthenticated, async (req, res) => {
  let locationN = req.body.location.toString();
  let timeslot = req.body.timeslot.toString();
  let date = moment(`${req.body.date} ${timeslot}`, "DD/MM/YYYY HH:mm");
  if (!isAfterToday(date)) {
    flashMessage(res, "error", "Book a timing after the current time and date!");
		return res.redirect("/booking/editBookingAdmin/"+req.params.id);
  }
  let reason = req.body.reason.toString();
  // let book = await Bookings.findByPk(req.params.id, {include: Locations});
  // let userName = book[0]['user.name'];
  Locations.findOne({ where: { locationName: locationN, status :1 } }).then((loc) => {
    let locationId = loc.id;
    Bookings.findByPk(req.params.id, {
      include: [User, Locations],
      raw: true,
    })
      .then((bookings) => {
        let userName = bookings["user.name"];
        let activity = bookings.activity;
        let mailDate = date.format("DD/MM/YYYY").toString();
        let userEmail = bookings["user.email"];
        let oriDate = moment(bookings.date, "DD/MM/YYYY");
        let originalDate = moment(bookings.date, "DD/MM/YYYY");
        oriDate = originalDate.format("DD/MM/YYYY").toString();
        let newTimeslot = moment(bookings.date).format("HH:mm");
        let oldLocation = bookings["location.locationName"];
        var changes = [];
        var count = 0;
        if (oldLocation != locationN) {
          changes[
            count
          ] = `\nLocation changed from ${oldLocation} to ${locationN}`;
          count += 1;
        }
        if (newTimeslot != timeslot) {
          changes[
            count
          ] = `\nTimeslot changed from ${newTimeslot} to ${timeslot}`;
          count += 1;
        }
        if (oriDate != mailDate) {
          changes[count] = `\nDate changed from ${oriDate} to ${mailDate}`;
          count += 1;
        }
        if (count == 0) {
          changes[0] = "No changes";
        }
        Bookings.findAndCountAll({
          include: [User, Locations],
          where: { locationId: locationId, bookingstatus: 1, date: date },
          raw: true,
        })
          .then((booking) => {
            let capacity = loc.capacity;
            if (booking.count >= capacity) {
              flashMessage(res, "error", "Too many people at this timing!");
              return res.redirect("/booking/listBookingsAdmin");
            } else {
              Bookings.update(
                {
                  date,
                  locationId,
                },
                { where: { id: req.params.id } }
              )
                .then((result) => {
                  sendEditEmail(
                    userEmail,
                    userName,
                    oriDate,
                    activity,
                    req.user.name,
                    changes,
                    reason
                  )
                    .then((response) => {
                      console.log(response);
                      flashMessage(
                        res,
                        "success",
                        "Booking edited successfully"
                      );
                      res.redirect("/booking/listBookingsAdmin");
                    })
                    .catch((err) => {
                      console.log(err);
                      flashMessage(
                        res,
                        "error",
                        "Error when sending email to " + userEmail
                      );
                      res.redirect("/booking/listBookingsAdmin");
                    });
                })
                .catch((err) => console.log(err));
            }
          })
          .catch((err) => console.log(err));
      })
      .catch((err) => console.log(err));
  });
});

// Delete booking
router.get(
  "/deleteBooking/:id",
  ensureAuthenticated,
  async function (req, res) {
    try {
      let bookings = await Bookings.findByPk(req.params.id);
      if (!bookings) {
        flashMessage(res, "error", "Booking not found");
        res.redirect("/booking/listBookings");
        return;
      } else if (req.user.id != bookings.userId) {
        flashMessage(res, "error", "Unauthorised access");
        res.redirect("/booking/listBookings");
        return;
      }
      
      bookingstatus = 0;
      Bookings.update(
        {
          bookingstatus,
        },
        { where: { id: bookings.id } }
      )
        .then((bookings) => {
          console.log("Booking deleted");
          flashMessage(res, "success", "Booking successfully deleted!");
          res.redirect("/booking/listBookings");
        })
        .catch((err) => console.log(err));
    } catch (err) {
      console.log(err);
    }
  }
);

// Delete booking for Staff
router.get(
  "/deleteBookingAdmin/:id",
  ensureAuthenticated,
  async function (req, res) {
    try {
      if (req.user.userrole == "customer") {
        flashMessage(res, "error", "You have to login to a customer account!");
        res.redirect("/");
        return;
      }
      Bookings.findByPk(req.params.id, {
        include: User,
        raw: true,
      }).then((bookings) => {
        if (!bookings) {
          flashMessage(res, "error", "Booking not found");
          res.redirect("/booking/listBookingsAdmin");
          return;
        }
        if (req.user.userrole != "c") {
          bookingstatus = 0;
          let userEmail = bookings["user.email"];
          let userName = bookings["user.name"];
          let userId = bookings["user.id"];
          let originalDate = moment(bookings.date, "DD/MM/YYYY");
          oriDate = originalDate.format("DD/MM/YYYY").toString();
          let activity = bookings.activity;
          let paymentmade = bookings.paymentmade;
          Bookings.update(
            {
              bookingstatus,
            },
            { where: { id: bookings.id } }
          )
            .then((booking) => {
              Wallet.findAll({
                where: { userId: req.user.id },
                order: [["createdAt", "DESC"]],
                raw: true,
              })
                .then((listoftransactions) => {
                  var totalamount = 0;
                  var count = 0;
                  for (var rowId in listoftransactions) {
                    var transactionamt = listoftransactions[rowId].money;
                    totalamount += transactionamt;
                  }
                  listoftransactions.totalamount = totalamount;
                  let money = paymentmade;
                  let first_name = req.body.firstname;

                  let walletMoney = parseFloat(
                    listoftransactions.totalamount + money
                  );

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
                  }).then((user) => {
                    console.log(user.toJSON());
                    User.update(
                      {
                        walletMoney,
                      },
                      { where: { id: userId } }
                    )
                      .then((result) => {
                        sendDeleteEmail(
                          userEmail,
                          userName,
                          oriDate,
                          activity,
                          req.user.name,
                          paymentmade
                        )
                          .then((response) => {
                            console.log(response);
                            flashMessage(
                              res,
                              "success",
                              "Booking deleted successfully"
                            );
                            return res.redirect("/booking/listBookingsAdmin");
                          })
                          .catch((err) => {
                            console.log(err);
                            flashMessage(
                              res,
                              "error",
                              "Error when sending email to " + userEmail
                            );
                            res.redirect("/booking/listBookingsAdmin");
                          });
                      })
                      .catch((err) => console.log(err));
                  });
                })
                .catch((err) => console.log(err));
            })
            .catch((err) => console.log(err));
        } else {
          flashMessage(res, "error", "You have no authorization for this");
          res.redirect("/booking/listBookings");
          return;
        }
        return;
      });
    } catch (err) {
      console.log(err);
    }
  }
);

router.post("/upload", ensureAuthenticated, (req, res) => {
  // Creates user id directory for upload if not exist
  if (!fs.existsSync("./public/uploads/" + req.user.id)) {
    fs.mkdirSync("./public/uploads/" + req.user.id, { recursive: true });
  }
  upload(req, res, (err) => {
    if (err) {
      // e.g. File too large
      res.json({ file: "/img/no-image.jpg", err: err });
    } else {
      res.json({ file: `/uploads/${req.user.id}/${req.file.filename}` });
    }
  });
});



module.exports = router;

