const express = require("express");
const Sequelize = require('sequelize');
const router = express.Router();
require("dotenv").config();
const sgMail = require("@sendgrid/mail");
const moment = require("moment");
const Bookings = require("../models/Bookings");
const Locations = require("../models/Locations");
const Wallet = require("../models/Wallet");
const User = require("../models/User");
const ensureAuthenticated = require("../helpers/auth");
const flashMessage = require("../helpers/messenger");
require("dotenv").config();

// Required for file upload
const fs = require("fs");
const locUpload = require("../helpers/locationImageUpload");
const e = require("connect-flash");


// User side
router.get('/gymList', async (req, res) => {
    let locationcount = await Locations.count();
    Locations.findAll({
      order: [["createdAt", "DESC"]],
      raw: true,
    })
      .then((location) => {
        check = false;
        for (var i = 0; i < locationcount; i++) {
          if (location[i].status == 1) {
            check = true;
            break;
          }
          
        }
        if (!check) {
          // No gyms
          return res.render('location/gymList', {});
        } else {
          return res.render('location/gymList', { location });
        }
        return;
      })
      .catch((err) => 
        console.log(err)
      ); 
	
});


// Admin side

router.get(
  "/listLocationsAdmin",
  ensureAuthenticated,
  async function (req, res) {
    let userRole = req.user.userrole;
    if (userRole == "customer") {
      flashMessage(res, "error", "You have no authorized access!");
      res.redirect("/");
      return;
    }
    let locationcount = await Locations.count();
    Locations.findAll({
      order: [["createdAt", "DESC"]],
      raw: true,
    })
      .then((location) => {
        check = false;
        for (var i = 0; i < locationcount; i++) {
          if (location[i].status == 1) {
            check = true;
            break;
          }
          
        }
        if (!check) {
          console.log(location)
          res.render("location/listLocationsAdmin", {});
        } else {
          console.log(location)
          res.render("location/listLocationsAdmin", { location });
        }
        return;
      })
      .catch((err) => 
        console.log(err)
      ); 
});


// Add Location
router.get("/addLocation", ensureAuthenticated, (req, res) => {
  let userRole = req.user.userrole;
  if (userRole == "customer") {
    flashMessage(res, "error", "You have no authorized access!");
    res.redirect("/");
    return;
  }
  res.render("location/addLocation");
});

router.post("/addLocation", ensureAuthenticated, (req, res) => {

  let locationName = req.body.locationName.toString();
  let capacity = req.body.capacity;
  let locationURL = req.body.locationURL;
  let status = 1;
  let count = 0;


  Locations.create({
    locationName,
    capacity,
    count,
    locationURL,
    status
  })
    .then((location) => {
      console.log(location, "successfully made!")
      res.redirect("/location/listLocationsAdmin");
    })
    .catch((err) => console.log(err));
  return;
});


// Staff edit booking
router.get("/editLocationAdmin/:id", ensureAuthenticated, (req, res) => {
  let userRole = req.user.userrole;
  if (userRole == "customer") {
    flashMessage(res, "error", "You have no authorized access!");
    res.redirect("/");
    return;
  }

  Locations.findByPk(req.params.id)
    .then((location) => {
      if (!location) {
        flashMessage(res, "error", "Location not found");
        res.redirect("/booking/listLocationsAdmin");
        return;
      }
      let cap = location.capacity;
      let locURL = location.locationURL;
      res.render("location/editLocationAdmin", { location, cap, locURL });
    })
    .catch((err) => console.log(err));
});

router.post("/editLocationAdmin/:id", ensureAuthenticated, (req, res) => {
  let locationURL = req.body.locationURL;
  let capacity = req.body.capacity;
  Locations.findByPk(req.params.id)
    .then((location) => {
      let locationId = req.params.id;
      date = moment(`${req.body.date} ${req.body.timeslot}`, "DD/MM/YYYY HH:mm");
      Bookings.findAndCountAll({
        include: [User, Locations],
        attributes: ['Bookings.date', [Sequelize.fn('COUNT', 'Bookings.*'), 'BookingsCount']],
        where: { locationId: locationId, bookingstatus: 1},
        group : ['Bookings.date'],
        raw: true,
      })
        .then((result) => {
          
          let check = false;
          for (var i in result.rows) {
            // console.log("LOcation id check", result.rows[i]['location.id'] == locationId)
            // console.log("cap check : ", result.rows[i].BookingsCount > capacity)
            // console.log("count check : ", result.rows[i].BookingsCount)
            if ((result.rows[i]['location.id'] == locationId && result.rows[i].BookingsCount > capacity)) {
              check = true;
            }
          }

          //console.log(result.rows[0].BookingsCount); // Boooking Count
          if (check) {
            flashMessage(res, "error", "Too many people have already booked this timing!");
            return res.redirect("/location/listLocationsAdmin");
          }
          else {
            Locations.update(
              {
                locationURL,
                capacity
              },
              { where: { id: location.id } }
            )
            flashMessage(res, "success", "Location edited successfully");
            return res.redirect("/location/listLocationsAdmin");
          }
        })
        .catch(err => console.log(err));
      
    })
    .catch((err) => console.log(err));
});


// Delete booking for Staff
router.get(
  "/deleteLocationAdmin/:id",
  ensureAuthenticated,
  async function (req, res) {
    try {
      if (req.user.userrole == "customer") {
        flashMessage(res, "error", "You have no authorized access!");
        res.redirect("/");
        return;
      }
      let location = await Locations.findByPk(req.params.id);
      let bookingcount = await Bookings.count({where : {bookingstatus:1, locationId : req.params.id}});
      
      if (!location) {
        flashMessage(res, "error", "Location not found");
        res.redirect("/location/listLocationsAdmin");
        return;
      }
      if (req.user.userrole != "customer") {
        let status = 0;
        Locations.update(
          {
            status,
          },
          { where: { id: location.id } }
        )
          .then((locations) => {
            Bookings.findAll({
              include: [Locations, User],
              where : {locationId : req.params.id, bookingstatus : 1},
              raw:true,
            })
              .then((bookings) => {
                let bookingstatus = 0;
                for (var i = 0; i < bookingcount;i++) {
                  let userEmail = bookings[i]['user.email']
                  let userName = bookings[i]['user.name']
                  let paymentmade = bookings[i].paymentmade;
                  let userId = bookings[i]['user.id']
                  let date = moment(bookings[i].date, "DD/MM/YYYY")
                  let mailDate = date.format("DD/MM/YYYY").toString();
                  let locationName = bookings[i]['location.locationName'];
                  Bookings.update(
                    {
                      bookingstatus,
                    },
                    { where: { id: bookings[i].id } }
                  )
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
                      
                      let walletMoney = parseFloat(listoftransactions.totalamount + money);

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
                            mailDate,
                            locationName
                          )
                            .then((response) => {
                              console.log(response);
                              // flashMessage(res, "success", "Location deleted successfully");
                              // res.redirect("/location/listLocationsAdmin");
                            })
                            .catch((err) => {
                              console.log(err);
                              flashMessage(
                                res,
                                "error",
                                "Error when sending email to " + userEmail
                              );
                              res.redirect("/location/listLocationsAdmin");
                            })
                        })
                        .catch((err) => console.log(err));
                        
                      })
                    })
                  }
                  return res.redirect("/location/listLocationsAdmin");
              })
              .catch((err) => console.log(err));
            })
              
      } else {
        flashMessage(res, "error", "You have no authorization for this");
        res.redirect("/location/listLocationsAdmin");
        return;
      }
    } catch (err) {
      console.log(err);
    }
  }
);

router.post("/locUpload", ensureAuthenticated, (req, res) => {
  // Creates user id directory for upload if not exist
  if (!fs.existsSync("./public/uploads/locations/")) {
    fs.mkdirSync("./public/uploads/locations/", { recursive: true });
  }
  locUpload(req, res, (err) => {
    if (err) {
      // e.g. File too large
      res.json({ err: err });
    }
      else if (req.file == undefined) {
      res.json({});
    } else {
      res.json({ file: `/uploads/locations/${req.file.filename}` });
    }
  });
});


function sendDeleteEmail(toEmail, name, date, locationName) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const message = {
    to: toEmail,
    from: `ADIJC <${process.env.SENDGRID_SENDER_EMAIL}>`,
    subject: "Location notification",
    html: `<i>This is an automated message, do not reply.</i><br>
    Dear ${name},<br>Your booking on ${date} for the Gym has been deleted due to the closing of the location ${locationName}.
    $5 has been refunded into your e-wallet.<br>Thank you!<br>Regards, ADIJC Fitness`,
  };

  // Returns the promise from SendGrid to the calling function
  return new Promise((resolve, reject) => {
    sgMail
      .send(message)
      .then((response) => resolve(response))
      .catch((err) => reject(err));
  });
}

 

module.exports = router;
