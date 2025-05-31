const express = require('express');
const router = express.Router();
const flashMessage = require('../helpers/messenger');
const Bookings = require('../models/Bookings');
const Locations = require("../models/Locations");
const Programmes = require("../models/Programmes");
const Product = require("../models/Product");

router.get('/', (req, res) => {
	const title = 'Video Jotter';
	
	// renders views/index.handlebars, passing title as an object
	Programmes.findAll({
		where: {avail : 1},
		raw:true,
	})
	.then((programme)=> {
		let progCount = 0;
		for (var i in programme) {
			progCount += 1;
		}
		Locations.findAll({
			where : {status : 1},
			raw:true,
		})
		.then((location) => {
			let count = 0;
			let firstLocationURL = "";
			let firstLocationName = "";
			let locationURLs = [];
			let locationNames = [];
			let locationList = [];
			for (var i in location) {
				count += 1;
			}
			
			if (count == 0 && progCount == 0) {
				return res.render('index', { });
			}
			else if (count == 0) {

				return res.render('index', { programme });
			}
			else if (progCount == 0) {
				for (var i=0; i < count; i++) {
					firstLocationURL = location[i].locationURL;
					firstLocationName= location[i].locationName;
					break;
				}
				for (var i=1; i < count; i++) {
					locationURLs.push(location[i].locationURL);
					locationNames.push(location[i].locationURL);
					locationList.push(location[i]);
				}
				return res.render('index', { location,firstLocationName, firstLocationURL,locationURLs, locationNames, locationList });
			}
			else {
				for (var i=0; i < count; i++) {
					firstLocationURL = location[i].locationURL;
					firstLocationName= location[i].locationName;
					break;
				}
				for (var i=1; i < count; i++) {
					locationURLs.push(location[i].locationURL);
					locationNames.push(location[i].locationURL);
					locationList.push(location[i]);
				}
				return res.render('index', { location, programme, firstLocationURL,firstLocationName, locationURLs, locationNames, locationList });
			}
			
		})
		.catch(err => console.log(err))
	}).catch(err => console.log(err))
	
	
});

router.get('/about', (req, res) => {
	const author = 'Your Name';
	res.render('about', { author });
});

router.post('/flash', (req, res) => {
	const message = 'This is an important message';
	const error = 'This is an error message';
	const error2 = 'This is the second error message';

    // req.flash('message', message);
    // req.flash('error', error);
    // req.flash('error', error2);

    flashMessage(res, 'success', message);
    flashMessage(res, 'info', message);
    flashMessage(res, 'error', error);
    flashMessage(res, 'error', error2, 'fas fa-sign-in-alt', true);

	res.redirect('/about');
});

module.exports = router;
