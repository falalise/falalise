const e = require('connect-flash');
const express = require('express');
const router = express.Router();
const flashMessage = require('../helpers/messenger');
const Ticket = require('../models/Ticket');
const Inbox = require('../models/Inbox');
const User = require('../models/User');
const ensureAuthenticated = require('../helpers/auth');
router.get('/userticket/:id', ensureAuthenticated, async function (req, res) {
    let tickets = await Ticket.findOne({where: { userId: req.params.id, complete:'0', singleticket:'1' } })
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Please sign in');
        res.redirect('/');
        return;
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.id != req.params.id){
        flashMessage(res, 'error', 'Unauthorised access');
        res.redirect('/');
        return;
    }
    if (!tickets) {
        // flashMessage(res, 'error', 'Ticket not found');
        res.render('ticket/userticket');
        return;
    }
    if (req.user.id != tickets.userId) {
        flashMessage(res, 'error', 'Unauthorised access');
        res.redirect('/');
        return;
    }
    if (req.user.userrole != 'customer') {
        flashMessage(res, 'error', 'Unauthorised access');
        res.redirect('/');
        return;
    }
    res.render('ticket/userticket', { tickets });
});



router.get('/ticketform', async function (req, res){
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Please sign in');
        res.redirect('/');
        return;
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    let tickets = await Ticket.findOne({where: { userId: req.user.id, complete:'0', singleticket:'1' } })
    if (tickets){
        flashMessage(res, 'error','You have an exisiting ticket');
        res.redirect('/');
    }
    if (req.user.userrole != 'customer') {
        flashMessage(res, 'error', 'Unauthorised access');
        res.redirect('/');
        return;
    }
    
    res.render('ticket/ticketform');
});
router.post('/ticketform', async function (req, res){
    let title = req.body.title;
    let problem = req.body.problem;
    let posterURL = req.user.pictureURL;
    let userId = req.user.id;
    let username = req.user.name;
    let email = req.user.email;


    try{
    Ticket.create(
        { title, problem, posterURL, singleticket:1, complete:0, userId, username, email, progress: 'processing' }
    )
        .then((ticket) => {
            console.log(ticket.toJSON());
            flashMessage(res, 'success','Your ticket has been sent!');
            res.redirect(`/ticket/userticket/${req.user.id}`);
        })
        .catch(err => console.log(err));
    }
    catch (err) {
        console.log(err);
    }
});
    
router.get('/ticketlist', (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Please sign in');
        res.redirect('/');
        return;
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    if (req.user.userrole == 'customer'){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    Ticket.findAll({
        where: { singleticket: '1' },
        order: [['createdAt', 'DESC']],
        raw: true
    })
        .then((tickets) => {
            // pass object to retrieveuser.handlebar
            res.render('ticket/ticketlist', { tickets });
        })
        .catch(err => console.log(err));
});

router.get('/ticketlistbyprocess', (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Please sign in');
        res.redirect('/');
        return;
    }
    if (req.user.userrole == 'customer'){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    Ticket.findAll({
        where: { singleticket: '1', progress: 'processing' },
        order: [['createdAt', 'DESC']],
        raw: true
    })
        .then((tickets) => {
            // pass object to retrieveuser.handlebar
            res.render('ticket/ticketlistbyprocess', { tickets });
        })
        .catch(err => console.log(err));
});

router.get('/ticketlistbycomplete', (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Please sign in');
        res.redirect('/');
        return;
    }
    if (req.user.userrole == 'customer'){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    Ticket.findAll({
        where: { singleticket: '1', progress: 'complete' },
        order: [['createdAt', 'DESC']],
        raw: true
    })
        .then((tickets) => {
            // pass object to retrieveuser.handlebar
            res.render('ticket/ticketlistbycomplete', { tickets });
        })
        .catch(err => console.log(err));
});



router.get('/replyuser/:id',  (req, res) => {
    if (res.locals.user == null){
        flashMessage(res, 'error', 'Please sign in');
        res.redirect('/');
        return;
    }
    if (req.user.userrole == 'customer'){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
    }
    if (!req.user.userstatus){
        flashMessage(res, 'error', 'Cannot be accessed');
        res.redirect('/');
        return;
    }
    console.log(req.params.id)
    Ticket.findByPk(req.params.id)
        .then((ticket) => {
            if (!ticket) {
                flashMessage(res, 'error', 'Ticket not found');
                res.redirect('/ticket/ticketlist');
                return;
            }
            res.render('ticket/replyuser', { ticket });
        })
        .catch(err => console.log(err));
});

router.post('/replyuser/:id', async function (req, res) {
    let reply = req.body.reply;
    let ticket = await Ticket.findByPk(req.params.id );
    let userId = ticket.userId;
    let user = await User.findByPk(userId);
    let ticketId = req.params.id;
    let progress = "complete";
    let message = user.message + 1;
    User.update(
        { message },
        { where: {id:  ticket.userId}}
    )
    Ticket.update(
        { progress, complete: 1},
        { where: { id: req.params.id } }
    )
    Inbox.create(
        { reply, progress, userId, ticketId }
    )
    .then((inbox) => {
        console.log(inbox.toJSON());
        flashMessage(res, 'success','Reply sent to user');
        res.redirect('/ticket/ticketlist');
    })
    .catch(err => console.log(err));
    // else{
    //     Ticket.update(
    //     { progress},
    //     { where: { id: req.params.id } }
    //     )
    //     // .then((result) => {
    //     //     console.log(result[0] + ' Ticket updated');
    //     //     flashMessage(res, 'success', 'ticket '+ id + ' update changed successfully!');
    //     //     res.redirect('/ticket/ticketlist');
    //     // })
    //     // .catch(err => console.log(err));
    // Inbox.create(
    //     { reply, progress, userId, ticketId }
    // )
    //     .then((inbox) => {
    //         console.log(inbox.toJSON());
    //         flashMessage(res, 'success','Reply sent to user');
    //         res.redirect('/ticket/ticketlist');
    //     })
    //     .catch(err => console.log(err));
    // }
});



module.exports = router;