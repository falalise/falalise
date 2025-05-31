const express = require('express');
const router = express.Router();
const flashMessage = require('../helpers/messenger');
const User = require('../models/User');
const Inbox = require('../models/Inbox');
const bcrypt = require('bcryptjs');
const passport = require('passport');
// Required for email verification
require('dotenv').config();
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const upload = require('../helpers/imageUpload');
const { sign } = require('crypto');
const Ticket = require('../models/Ticket');
const Booking = require('../models/Bookings');
const { runInNewContext } = require('vm');
const { DATE } = require('sequelize');
const { NONE } = require('sequelize');
const Bookings = require('../models/Bookings');
const { session } = require('passport');
const { Session } = require('inspector');

function sendEmail(toEmail, url) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const message = {
        to: toEmail,
        from: `ADIJC FITNESS <${process.env.SENDGRID_SENDER_EMAIL}>`,
        subject: 'Verify ADIJC FITNESS Account',
        html: `Thank you registering with ADIJC FITNESS.<br><br> Please <a href=\"${url}"><strong>verify</strong></a> your account.`
    };

    // Returns the promise from SendGrid to the calling function
    return new Promise((resolve, reject) => {
        sgMail.send(message)
            .then(response => resolve(response))
            .catch(err => reject(err));
    });
}
router.get('/forgetpassword/:userEmail', async (req, res) => {
    let email = req.params.userEmail;
    let authdd = jwt.verify(email,process.env.APP_SECRET);
    console.log(authdd);
    let user = res.locals.user;
    let users = await User.findOne({ where: { email: authdd } });
    // if (!user){
    //     res.redirect('/');
    //     flashMessage(res, 'error', 'Please head to the forget password section');
    // }

    if (users.forgetpassword == 0 ){
        res.redirect('/');
        flashMessage(res, 'error', 'Please head to the forget password section');
    }
    if (user){
        res.redirect('/');
        flashMessage(res, 'error', 'Please head to the forget password section');
    }
    res.render('user/forgetpassword');
});
router.get('/login', (req, res) => {
    if (res.locals.user != null){
        flashMessage(res, 'error', 'You are already log in');
        res.redirect('/');
        return;
    }
    res.render('user/login');
});

router.get('/register', (req, res) => {
    if (res.locals.user != null){
        flashMessage(res, 'error', 'You are already log in');
        res.redirect('/');
        return;
    }
    res.render('user/register');
});

router.get('/emailverify', (req, res) => {
    if (res.locals.user != null){
        flashMessage(res, 'error', 'Please log out');
        res.redirect('/');
        return;
    }
    res.render('user/emailverify');
});

router.get('/retrieveuser', (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    if (req.user.userrole == 'customer'){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    User.findAll({
        where: { verified: '1' , userstatus:'1'},
        order: [['createdAt', 'DESC']],
        raw: true
    })
        .then((users) => {
            // pass object to retrieveuser.handlebar
            users.forEach(element => {
                let dob = element.dateofbirth;
                // console.log(dob.toString())
                let stringdob = (dob.toString()).slice(10,15);
                // console.log(stringdob)
                var date_time = new Date();
                // console.log(date_time)
                let stringdate_time = (date_time.toString()).slice(11,15);
                // console.log(stringdate_time)
                let minus = stringdate_time - stringdob;
                // console.log(minus)
                element.age = minus
                // console.log(element.age)
            });
            res.render('user/retrieveuser', { users });
        })
        .catch(err => console.log(err));
});

router.get('/retrieveuserbyname', (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    if (req.user.userrole == 'customer'){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    User.findAll({
        where: { verified: '1' , userstatus:'1'},
        order: [['name']],
        raw: true
    })
        .then((users) => {
            // pass object to retrieveuser.handlebar
            users.forEach(element => {
                let dob = element.dateofbirth;
                // console.log(dob.toString())
                let stringdob = (dob.toString()).slice(10,15);
                // console.log(stringdob)
                var date_time = new Date();
                // console.log(date_time)
                let stringdate_time = (date_time.toString()).slice(11,15);
                // console.log(stringdate_time)
                let minus = stringdate_time - stringdob;
                // console.log(minus)
                element.age = minus
                // console.log(element.age)
            });
            res.render('user/retrieveuserbyname', { users });
        })
        .catch(err => console.log(err));
});

router.get('/retrieveuserbynamereverse', (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    if (req.user.userrole == 'customer'){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    User.findAll({
        where: { verified: '1' , userstatus:'1'},
        order: [['name', 'DESC']],
        raw: true
    })
        .then((users) => {
            // pass object to retrieveuser.handlebar
            users.forEach(element => {
                let dob = element.dateofbirth;
                // console.log(dob.toString())
                let stringdob = (dob.toString()).slice(10,15);
                // console.log(stringdob)
                var date_time = new Date();
                // console.log(date_time)
                let stringdate_time = (date_time.toString()).slice(11,15);
                // console.log(stringdate_time)
                let minus = stringdate_time - stringdob;
                // console.log(minus)
                element.age = minus
                // console.log(element.age)
            });
            res.render('user/retrieveuserbynamereverse', { users });
        })
        .catch(err => console.log(err));
});

router.get('/retrieveuserbyemail', (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    if (req.user.userrole == 'customer'){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    User.findAll({
        where: { verified: '1' , userstatus:'1'},
        order: [['email']],
        raw: true
    })
        .then((users) => {
            // pass object to retrieveuser.handlebar
            users.forEach(element => {
                let dob = element.dateofbirth;
                // console.log(dob.toString())
                let stringdob = (dob.toString()).slice(10,15);
                // console.log(stringdob)
                var date_time = new Date();
                // console.log(date_time)
                let stringdate_time = (date_time.toString()).slice(11,15);
                // console.log(stringdate_time)
                let minus = stringdate_time - stringdob;
                // console.log(minus)
                element.age = minus
                // console.log(element.age)
            });
            res.render('user/retrieveuserbyemail', { users });
        })
        .catch(err => console.log(err));
});


router.get('/retrieveuserbyemailreverse', (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    if (req.user.userrole == 'customer'){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    User.findAll({
        where: { verified: '1' , userstatus:'1'},
        order: [['email', 'DESC']],
        raw: true
    })
        .then((users) => {
            // pass object to retrieveuser.handlebar
            users.forEach(element => {
                let dob = element.dateofbirth;
                // console.log(dob.toString())
                let stringdob = (dob.toString()).slice(10,15);
                // console.log(stringdob)
                var date_time = new Date();
                // console.log(date_time)
                let stringdate_time = (date_time.toString()).slice(11,15);
                // console.log(stringdate_time)
                let minus = stringdate_time - stringdob;
                // console.log(minus)
                element.age = minus
                // console.log(element.age)
            });
            res.render('user/retrieveuserbyemailreverse', { users });
        })
        .catch(err => console.log(err));
});

router.get('/retrieveuserbyrole', (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    if (req.user.userrole == 'customer'){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    User.findAll({
        where: { verified: '1' , userstatus:'1'},
        order: [['userrole']],
        raw: true
    })
        .then((users) => {
            // pass object to retrieveuser.handlebar
            users.forEach(element => {
                let dob = element.dateofbirth;
                // console.log(dob.toString())
                let stringdob = (dob.toString()).slice(10,15);
                // console.log(stringdob)
                var date_time = new Date();
                // console.log(date_time)
                let stringdate_time = (date_time.toString()).slice(11,15);
                // console.log(stringdate_time)
                let minus = stringdate_time - stringdob;
                // console.log(minus)
                element.age = minus
                // console.log(element.age)
            });
            res.render('user/retrieveuserbyrole', { users });
        })
        .catch(err => console.log(err));
});

router.get('/retrieveuserbyrolereverse', (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    if (req.user.userrole == 'customer'){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    User.findAll({
        where: { verified: '1' , userstatus:'1'},
        order: [['userrole','DESC']],
        raw: true
    })
        .then((users) => {
            // pass object to retrieveuser.handlebar
            users.forEach(element => {
                let dob = element.dateofbirth;
                // console.log(dob.toString())
                let stringdob = (dob.toString()).slice(10,15);
                // console.log(stringdob)
                var date_time = new Date();
                // console.log(date_time)
                let stringdate_time = (date_time.toString()).slice(11,15);
                // console.log(stringdate_time)
                let minus = stringdate_time - stringdob;
                // console.log(minus)
                element.age = minus
                // console.log(element.age)
            });
            res.render('user/retrieveuserbyrolereverse', { users });
        })
        .catch(err => console.log(err));
});


router.post('/register', async function (req, res) {
    let { name, email, password, password2 } = req.body;

    let isValid = true;
    if (password.length < 6) {
        flashMessage(res, 'error', 'Password must be at least 6 characters');
        isValid = false;
    }
    if (password != password2) {
        flashMessage(res, 'error', 'Passwords do not match');
        isValid = false;
    }
    if (!isValid) {
        res.render('user/register', {
            name, email
        });
        return;
    }

    try {
        // If all is well, checks if user is already registered
        let user = await User.findOne({ where: { email: email } });
        if (user) {
            // If user is found, that means email has already been registered
            flashMessage(res, 'error', email + ' already registered');
            res.render('user/register', {
                name, email
            });
        }
        else {
            // Create new user record 
            var salt = bcrypt.genSaltSync(10);
            var hash = bcrypt.hashSync(password, salt);
            var userrole = 'customer';
            var gender = 'null';
            var favouritegym = '';
            var dateofbirth = new Date ();
            var information = '';
            var pictureURL = '/img/no-icon.png';
            var walletMoney = 0;
            // Use hashed password
            let user = await User.create({ name, email, password: hash, verified: 0,userstatus: 1, forgetpassword: 0,userrole, gender, favouritegym,dateofbirth, information, pictureURL, walletMoney,message: 0});
            // Send email
            let token = jwt.sign(email, process.env.APP_SECRET);
            let url = `${process.env.BASE_URL}:${process.env.PORT}/user/verify/${user.id}/${token}`;
            sendEmail(user.email, url)
                .then(response => {
                    console.log(response);
                    flashMessage(res, 'success', user.email + ' verification has been sent successfully');
                    res.redirect('/user/login');
                })
                .catch(err => {
                    console.log(err);
                    flashMessage(res, 'error', 'Error when sending email to ' + user.email);
                    res.redirect('/');
                });
        }
    }
    catch (err) {
        console.log(err);
    }
});

router.get('/verify/:userId/:token', async function (req, res) {
    let id = req.params.userId;
    let token = req.params.token;

    try {
        // Check if user is found
        let user = await User.findByPk(id);
        if (!user) {
            flashMessage(res, 'error', 'User not found');
            res.redirect('/user/login');
            return;
        }
        // Check if user has been verified
        if (user.verified) {
            flashMessage(res, 'info', 'User already verified');
            res.redirect('/user/login');
            return;
        }
        // Verify JWT token sent via URL 
        let authData = jwt.verify(token, process.env.APP_SECRET);
        if (authData != user.email) {
            flashMessage(res, 'error', 'Unauthorised Access');
            res.redirect('/user/login');
            return;
        }

        let result = await User.update(
            { verified: 1 },
            { where: { id: user.id } });
        console.log(result[0] + ' user updated');
        flashMessage(res, 'success', user.email + ' verified. Please login');
        res.redirect('/user/login');
    }
    catch (err) {
        console.log(err);
    }
});
router.get('/verifyemail/:userEmail/:token', async function (req, res) {
    let email = req.params.userEmail;
    let token = req.params.token;

    try {
        // Check if user is found
        let user = await User.findOne({ where: { email: email } });
        if (!user) {
            flashMessage(res, 'error', 'Email not found');
            res.redirect('/user/login');
            return;
        }
        // Verify JWT token sent via URL
        let secret = process.env.APP_SECRET + user.password;
        // if (token != secret){
        //     flashMessage(res, 'error', 'Verification Link has expired.');
        //     res.redirect('/user/login');
        //     return;
        // }
        // console.log(token);
        // let token1 = jwt.sign(email, secret);
        // console.log(token1)
        // if (token != token1){
        //     flashMessage(res, 'error', 'One-time password reset link has been used.');
        //     res.redirect('/user/login');
        //     return;
        // }

        let authData = jwt.verify(token, secret);
        console.log(authData);
        if (authData['email'] != user.email) {
            flashMessage(res, 'error', 'Unauthorised Access');
            res.redirect('/user/login');
            return;
        }
        let result = await User.update(
            { forgetpassword: 1 },
            { where: { email: user.email } });
        console.log(result[0] + ' user updated');
        flashMessage(res, 'success', user.email + ' verified. Please change your password');
        let token2 = jwt.sign(email,process.env.APP_SECRET)
        res.redirect(`/user/forgetpassword/${token2}`);
    }
    catch (err) {
        console.log(err);
        flashMessage(res, 'error', 'Invalid Link. Please send a new link');
        res.redirect('/user/login');
    }
});

router.get('/editUser/:id',  (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.userrole == 'customer'){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    User.findByPk(req.params.id)
        .then((users) => {
            if (!users) {
                flashMessage(res, 'error', 'User not found');
                res.redirect('/user/retrieveuser');
                return;
            }
            
            // if (req.user.id != video.userId) {
            //     flashMessage(res, 'error', 'Unauthorised access');
            //     res.redirect('/user/retrieveuser');
            //     return;
            // }
            res.render('user/editUser', { users });
        })
        .catch(err => console.log(err));
});

router.get('/editProfile/:id',  (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.id != req.params.id){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.email == "Ivan@gmail.com"){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    User.findByPk(req.params.id)
        .then((users) => {
            if (!users) {
                flashMessage(res, 'error', 'User not found');
                res.redirect('/');
                return;
            }
            // if (req.user.id != video.userId) {
            //     flashMessage(res, 'error', 'Unauthorised access');
            //     res.redirect('/user/retrieveuser');
            //     return;
            // }

            res.render('user/editProfile', { users });
        })
        .catch(err => console.log(err));
});
router.post('/editProfile/:id', (req, res) => {

    let name = req.body.name;
    let email = req.body.email;
    let gender = req.body.gender;
    let dateofbirth = req.body.dateofbirth;
    let age = req.body.age;
    let favouritegym = req.body.favouritegym;
    let information = req.body.information;
    let pictureURL = req.body.pictureURL;


    if (dateofbirth != ''){
    User.update(
        { name, email, gender, dateofbirth, age, favouritegym, information,pictureURL },
        { where: { id: req.params.id } }
    )
        .then((result) => {
            console.log(result[0] + ' User updated');
            flashMessage(res, 'success', name + ' update changed successfully!');
            res.redirect(`/user/profile/${req.user.id}`);
        })
        .catch(err => console.log(err));
    }
    else {
        User.update(
            { name, email, gender, age, favouritegym, information,pictureURL },
            { where: { id: req.params.id } }
        )
            .then((result) => {
                console.log(result[0] + ' User updated');
                flashMessage(res, 'success', name + ' update changed successfully!');
                res.redirect(`/user/profile/${req.user.id}`);
            })
            .catch(err => console.log(err));
    }
});

router.post('/upload', (req, res) => {
    // Creates user id directory for upload if not exist
    if (!fs.existsSync('./public/uploads/' + req.user.id)) {
    fs.mkdirSync('./public/uploads/' + req.user.id, { recursive:
    true });
    }
    upload(req, res, (err) => {
    if (err) {
        // e.g. File too large
        res.json({ file: '/img/no-image.jpg', err: err });
    }
    else if (req.file == undefined) {
        res.json({});
    }
    else {
    res.json({ file: `/uploads/${req.user.id}/${req.file.filename}` });
        }
    });
});


router.get('/profile/:id', (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    
    if (req.user.id != req.params.id){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    let dob = req.user.dateofbirth
    let stringdob = (dob.toString()).slice(10,15);
    var date_time = new Date();
    let stringdate_time = (date_time.toString()).slice(11,15);
    let minus = stringdate_time - stringdob;
    res.render('user/profile', {minus});
});

router.get('/changepassword/:id', (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.id != req.params.id){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.email == "Ivan@gmail.com"){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    res.render('user/changepassword');
});

router.post('/changepassword/:id', async function (req, res) {
    let currentpassword = req.body.currentpassword;
    let password1 = req.body.password1;
    let password2 = req.body.password2;
    let isValid = true;
    isMatch = bcrypt.compareSync(currentpassword, req.user.password);
    if (!isMatch) {
        flashMessage(res, 'error','Current password entered wrongly!');
        isValid = false;
        // res.render('/');
        // res.redirect(`/user/changepassword/${req.user.id}`);
    }
    if (password1.length < 6) {
        flashMessage(res, 'error', 'Password must be at least 6 characters');
        isValid = false;
    }
    if (password1 != password2){
        flashMessage(res, 'error', 'Passwords do not match');
        // res.redirect(`/user/changepassword/${req.user.id}`);
        isValid = false;
        // res.render('/');
    }
    if (!isValid) {
        res.render('user/changepassword')
        return;
    }
    try {
        let user = await User.findByPk(req.user.id);
        var salt = bcrypt.genSaltSync(10);
        var hash = bcrypt.hashSync(password1, salt);
        User.update(
            { password:hash },
            { where: { id: req.params.id } }
        )
            .then((result) => {
                console.log(result[0] + ' User updated');
                flashMessage(res, 'success', user.name + ' Password changed successfully!');
                res.redirect(`/user/profile/${req.user.id}`);
            })
            .catch(err => console.log(err));
    
    }
    catch (err) {
        console.log(err);
    }
    
});


router.post('/editUser/:id', (req, res) => {
    let name = req.body.name;
    let email = req.body.email;
    let userrole = req.body.userrole;
    let pictureURL = req.body.pictureURL;

    User.update(
        { name, email, userrole, pictureURL },
        { where: { id: req.params.id } }
    )
        .then((result) => {
            console.log(result[0] + ' User updated');
            flashMessage(res, 'success', name + ' update changed successfully!');
            res.redirect('/user/retrieveuser');
        })
        .catch(err => console.log(err));
    
});




router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        // Success redirect URL
        successRedirect: '/',
        // Failure redirect URL 
        failureRedirect: '/user/login',
        /* Setting the failureFlash option to true instructs Passport to flash 
        an error message using the message given by the strategy's verify callback.
        When a failure occur passport passes the message object as error */
        failureFlash: true
    })(req, res, next);
});

router.post('/emailverify', async function (req, res) {
    let { email } = req.body;
    let user = await User.findOne({ where: { email: email } });
        if (!user) {
            // If user is not found, that means email is not in the database
            flashMessage(res, 'error', email + ' does not exist!');
            res.render('user/emailverify', 
            );
        }
        else{
            let secret = process.env.APP_SECRET + user.password;
            let token = jwt.sign({email}, secret, {expiresIn: '1m'});
            // console.log(token);
            let url = `${process.env.BASE_URL}:${process.env.PORT}/user/verifyemail/${user.email}/${token}`;
            sendEmail(user.email, url)
                .then(response => {
                    console.log(response);
                    flashMessage(res, 'success', user.email + ' verification code sent successfully');
                    res.redirect('/user/login');
                })
                .catch(err => {
                    console.log(err);
                    flashMessage(res, 'error', 'Error when sending email to ' + user.email);
                    res.redirect('/');
                });
        }

});
router.post('/forgetpassword/:userEmail', async function (req, res) {
    let email = req.params.userEmail;
    let authdd = jwt.verify(email,process.env.APP_SECRET);
    console.log(authdd);
    let { password, password2 } = req.body;
    let isValid = true;
    let user = await User.findOne({ where: { email: authdd } });
    if (password.length < 6) {
        flashMessage(res, 'error', 'Password must be at least 6 characters');
        isValid = false;
    }
    if (password != password2) {
        flashMessage(res, 'error', 'Passwords do not match');
        isValid = false;
    }
    if (!isValid) {
        res.render('user/forgetpassword')
        return;
    }
    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(password, salt);
    let result = await User.update(
        { password: hash, forgetpassword:0 },
        { where: { email: user.email } });
    console.log(result[0] + ' user updated');
    flashMessage(res, 'success', user.email + ' Password Changed!. Please login');
    res.redirect('/user/login');

});


router.get('/deleteUser/:id', async function (req, res, next) {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.userrole == 'customer'){
    if (req.user.id != req.params.id){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
}
    if (req.params.id == 1){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    try {
        let user = await User.findByPk(req.params.id);
        if (!user) {
            flashMessage(res, 'error', 'User not found');
            res.redirect('/user/retrieveuser');
            return;
        }
        // if (req.user.id != video.userId) {
        //     flashMessage(res, 'error', 'Unauthorised access');
        //     res.redirect('/video/listVideos');
        //     return;
        // }
        let result = await User.update(
            { userstatus: 0},
            { where: { id: user.id } });
        console.log(result[0] + ' User deleted');
        if (user.id == res.locals.user.id){
            let bookingstatus = 0;
            Bookings.update({bookingstatus},{where : {bookingstatus : 1, userId : user.id}});
            flashMessage(res, 'success', user.name+ ' has been deleted');
            res.redirect('/user/logout');
        }
        // if (user.userrole == 's'){
        //     res.redirect('/user/retrieveuser');
        // }
        // if (user.id == res.locals.user.id && user.userrole == 's'){
        //     res.redirect('/');
        // }
        flashMessage(res, 'success', user.name + ' has been deleted');
        res.redirect('/user/retrieveuser')
    }
    catch (err) {
        console.log(err);
    }
});

router.get('/logout', (req, res, next) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        //return;
    }
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
});

router.get('/inbox/:id', async function (req, res){
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.id != req.params.id){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.userrole != 'customer' ){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    let result = await User.update(
        { message: 0 },
        { where: { id: req.user.id } });
    console.log(result[0] + ' user updated');
    Inbox.findAll({
        where: { userId: req.params.id },
        order: [['createdAt', 'DESC']],
        raw: true
    })
        .then((inboxes) => {
            // pass object to retrieveuser.handlebar
            console.log(inboxes);
            res.render('user/inbox', { inboxes });
        })
        .catch(err => console.log(err));
});

router.get('/deleteinbox/:id', async function (req, res) {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    let inbox = await Inbox.findOne({
        where: { id: req.params.id   }
    })
    if (!inbox){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    // console.log(inbox.);
    if (req.user.id != inbox.userId){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.userrole != 'customer' ){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    try {
        let inbox = await Inbox.findByPk(req.params.id);
        if (!inbox) {
            flashMessage(res, 'error', 'reply not found');
            res.redirect(`/user/inbox/${req.user.id}`);
            return;
        }

        let result = await Inbox.destroy({ where: { id: inbox.id } });
        console.log(result + ' reply deleted');
        flashMessage(res, 'success', 'reply deleted');
        res.redirect(`/user/inbox/${req.user.id}`);
    }
    catch (err) {
        console.log(err);
    }
});
router.get('/deleteuserticket/:id', async function (req, res) {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.userrole != 'customer' ){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    let ticket = await Ticket.findOne({
        where: { id: req.params.id   }
    })
    if (!ticket){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.id != ticket.userId){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    } 

    try {
        let ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) {
            flashMessage(res, 'error', 'ticket not found');
            res.redirect(`/ticket/userticket/${req.user.id}`);
            return;
        }

        let result = await Ticket.destroy({ where: { id: ticket.id } });
        console.log(result + ' ticket deleted');
        flashMessage(res, 'success', 'ticket deleted');
        res.redirect(`/ticket/userticket/${req.user.id}`);
    }
    catch (err) {
        console.log(err);
    }
});

router.get('/deleteticket/:id', async function (req, res) {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.userrole == 'customer' ){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    try {
        let ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) {
            flashMessage(res, 'error', 'ticket not found');
            res.redirect(`/ticket/ticketlist`);
            return;
        }
        // let result = await User.update(
        //     { userstatus: 0},
        //     { where: { id: user.id } });
        // console.log(result[0] + ' User deleted');
        // if (user.id == res.locals.user.id){
        //     flashMessage(res, 'success', user.name+ ' has been deleted');
        //     res.redirect('/');
        // }
        let result = await Ticket.update(
            { singleticket: 0 },
            { where: { id: ticket.id } });
        console.log(result + ' ticket deleted');
        flashMessage(res, 'success', 'ticket deleted');
        res.redirect(`/ticket/ticketlist`);
    }
    catch (err) {
        console.log(err);
    }
});
module.exports = router;