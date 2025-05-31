const express = require("express");
const Sequelize = require('sequelize');
const router = express.Router();
const moment = require("moment");
const ensureAuthenticated = require('../helpers/auth');
const flashMessage = require('../helpers/messenger');
const Programme = require("../models/Programmes");
const User = require("../models/User");
const fs = require('fs');
const upload = require('../helpers/imgProgUpload');
const Bookings = require('../models/Bookings');
const Wallet = require('../models/Wallet');
const sgMail = require("@sendgrid/mail");

// after today
function isAfterToday(date) {
	const today = new Date();
  
	// today.setHours(00, 00, 00, 001);
	// console.log(today);
	return date > today;
  }
// Messages
function sendDeleteEmail(toEmail, name, date, paymentmade,progName) {
	console.log("sldwa",progName);
	sgMail.setApiKey(process.env.SENDGRID_API_KEY);
	const message = {
	  to: toEmail,
	  from: `ADIJC <${process.env.SENDGRID_SENDER_EMAIL}>`,
	  subject: "Programme notification",
	  html: `<i>This is an automated message, do not reply.</i><br>
	  Dear ${name},<br>Your booking on ${date} for the ${progName} has been deleted due to the cancellation of the programme.
	  $${paymentmade} has been refunded into your e-wallet.<br>Thank you!<br>Regards, ADIJC Fitness`,
	};
  
	// Returns the promise from SendGrid to the calling function
	return new Promise((resolve, reject) => {
	  sgMail
		.send(message)
		.then((response) => resolve(response))
		.catch((err) => reject(err));
	});
  }


router.get('/programmeList', async (req, res) => {
	let programmecount = await Programme.count({where : {avail: 1}});
	if (req.user == undefined) {

	}
	else if (req.user.userrole != "customer") {
		flashMessage(res, "error", "You have to login to a customer account!");
		  res.redirect("/");
		  return;
		
	  }
	if (programmecount == 0) {
		res.render("programme/programmeList", { });
		  return;
	}
	Programme.findAll({
		order: [["progDate", "DESC"]],
		where : {avail : 1},
		raw: true,
	  })
		.then((programme) => {
		  // pass object to listVideos.handlebar
		  res.render("programme/programmeList", { programme });
		  return;
		})
		.catch((err) => console.log(err));
});

router.get('/manageProg', ensureAuthenticated, async (req, res) => {
	let programmecount = await Programme.count({where : {avail: 1}});
	console.log(programmecount);
	if (req.user.userrole == "customer") {
		flashMessage(res, "error", "You have no authorized access!");
		  res.redirect("/");
		  return;
	  }
	if (programmecount == 0) {
		res.render("programme/programmeList", { });
		return;
	}
	
	Programme.findAll({
		order: [["progDate", "DESC"]],
		where : {avail : 1},
		raw: true,
	  })
		.then((programme) => {
		  // pass object to listVideos.handlebar
		  for (var i = 0; i < programmecount; i++) {
			console.log(programme[i].progDate);
			console.log(programme[i]);
			if (!isAfterToday(programme[i].progDate)) {
				console.log("HELLO");
				let avail = 0;
				let bookingstatus = 0;
				Programme.update({avail}, {where : {id : programme[i].id}});
				Bookings.update({bookingstatus}, {where: {programmeId : programme[i].id}});
			  }
		  }
		  res.render("programme/manageProg", { programme });
		  return;
		})
		.catch((err) => console.log(err));
});


router.get('/createProg', ensureAuthenticated, (req, res) => {
	if (req.user.userrole == "customer") {
		flashMessage(res, "error", "You have no authorized access!");
		  res.redirect("/");
		  return;
		
	  }
	res.render('programme/createProg')
	return;
});

router.post("/createProg", ensureAuthenticated, (req, res) => {
	let name = req.body.name.toString();
	let desc = req.body.desc;
	let price = req.body.price;
	let progURL = req.body.progURL;
	let avail = 1;
	let loc = req.body.loc;
	let timeslot = req.body.timeslot;
	let cap = req.body.capacity;
	let progDate = moment(`${req.body.date} ${timeslot}`, "DD/MM/YYYY HH:mm");
	if (!isAfterToday(progDate)) {
		flashMessage(res, "error", "Book a timing after the current time and date!");
		return res.redirect("/programme/createProg");
	  }

	Programme.create(
		{ name, desc, progURL, price, progDate, avail, loc, cap}
		)
		.then((video) => {
			console.log(video.toJSON());


			res.redirect("/programme/manageProg");
			return;
		  })
		  .catch((err) => console.log(err));
});


router.get("/editProg/:id", ensureAuthenticated, (req, res) => {
	if (req.user.userrole == "customer") {
		flashMessage(res, "error", "You have no authorized access!");
		  res.redirect("/");
		  return;
		
	  }
	Programme.findByPk(req.params.id)
	  .then((programme) => {
		if (!programme) {
		  flashMessage(res, "error", "Programme not found");
		  res.redirect("/programme/manageProg");
		  return;
		}
		let date = programme.progDate; 
		res.render("programme/editProg", { programme, date});
	  })
	  .catch((err) => console.log(err));
  });


router.post("/editProg/:id", ensureAuthenticated, async (req, res) => {
	let desc = req.body.desc;
	let price = req.body.price;
	let avail = 1;
	let programme = await Programme.findByPk(req.params.id);
	let progDate = moment(`${req.body.date} ${req.body.timeslot}`, "DD/MM/YYYY HH:mm");
	if (!isAfterToday(progDate)) {
		flashMessage(res, "error", "Book a timing after the current time and date!");
		return res.redirect("/programme/manageProg");
	}
	let cap = req.body.capacity;
	Bookings.findAndCountAll({
		include: [User, Programme],
        attributes: ['Bookings.date', [Sequelize.fn('COUNT', 'Bookings.*'), 'BookingsCount']],
        where: { programmeId: programme.id, bookingstatus: 1},
        group : ['Bookings.date'],
        raw: true,
	})
	.then((result) => {
		let check = false;
          for (var i in result.rows) {
            // console.log("LOcation id check", result.rows[i]['location.id'] == locationId)
            // console.log("cap check : ", result.rows[i].BookingsCount > capacity)
            // console.log("count check : ", result.rows[i].BookingsCount)
            if ((result.rows[i]['programme.id'] == programme.id && result.rows[i].BookingsCount > cap)) {
              check = true;
            }
          }

          //console.log(result.rows[0].BookingsCount); // Boooking Count
          if (check) {
            flashMessage(res, "error", "Too many people have already booked this timing!");
            return res.redirect("/programme/manageProg");
          }
		  else {
			Programme.update(
				{
				  desc, price, progDate, avail, cap
				},
				{ where: { id: req.params.id } }
			  )
				.then((result) => {
				  console.log(result[0] + " Programme updated");
				  res.redirect("/programme/manageProg");
				})
				.catch((err) => console.log(err));
		  }
	}).catch((err) => console.log(err));
	
  });

router.get("/deleteProg/:id", ensureAuthenticated, async function (req, res) {
	try {
		let bookingcount = await Bookings.count({where : {bookingstatus:1, programmeId : req.params.id}});
		if (req.user.userrole == "customer") {
			flashMessage(res, "error", "You have no authorized access!");
			  res.redirect("/");
			  return;
			
		  }
	  let programme = await Programme.findByPk(req.params.id);
	  if (!programme) {
		flashMessage(res, "error", "Programme not found");
		res.redirect("/programme/manageProg");
		return;
	  }
	  let avail = 0;
	  Programme.update({avail},{ where: { id: req.params.id } });
	  Bookings.findAll({
		include: [Programme, User],
		where : {programmeId : req.params.id, bookingstatus : 1},
		raw: true,
	  }).then((bookings) => {
		let bookingstatus = 0;
		for (var i=0; i < bookingcount; i++) {
			let userEmail = bookings[i]['user.email']
            let userName = bookings[i]['user.name']
            let paymentmade = bookings[i].paymentmade;
            let userId = bookings[i]['user.id']
            let date = moment(bookings[i]['programme.progDate'], "DD/MM/YYYY HH:mm");
			let mailDate = date.format("DD/MM/YYYY").toString();
        	let progName = bookings[i]['programme.name'];
			console.log(progName);
		
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
					paymentmade,
					progName
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
					  res.redirect("/programme/manageProg");
					})
				})
				.catch((err) => console.log(err));
				
			  })
			})
		}
	  }).catch((err) => console.log(err));
	  
	  res.redirect("/programme/manageProg");
	} catch (err) {
	  console.log(err);
	}
  });
  

router.post('/upload', ensureAuthenticated, (req, res) => {
	// Creates user id dictionary for upload if not exist
	if (!fs.existsSync('./public/uploads/programmes/')) {
		fs.mkdirSync('./public/uploads/programmes/', {recursive:true});
	}

	upload(req, res, (err) => {
		if (err) {
			//e.g. File too large
			res.json({ err: err });
        }
        else if (req.file == undefined) {
            res.json({});
		}
		else {
			res.json({file: `/uploads/programmes/${req.file.filename}`});
		}
	});
});

module.exports = router;