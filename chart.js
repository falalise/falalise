const express = require('express');
const router = express.Router();
const flashMessage = require('../helpers/messenger');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Bookings = require('../models/Bookings');
// const dfd = require("danfojs-node");
const { raw } = require('express');
const moment = require('moment');

router.get('/displaychart', (req, res) => {
    User.findAll({
        where: { verified: '1' },
        order: [['createdAt', 'DESC']],
        raw: true
    })
        .then((users) => {
            // pass object to retrieveuser.handlebar
            res.render('chart/displaychart', { users });
        })
        .catch(err => console.log(err));
});
router.get('/NoOfUsersJoined', async (req, res) => {
    const usersJoined = await User.findAll({where: {verified: 1, userstatus: 1}, order: [['createdAt']]});
  
    let data = [];
    usersJoined.forEach(element => {
      let rawData = [(element.createdAt).toString().slice(3,8)+(element.createdAt).toString().slice(11,15), 1];
      data.push(rawData)
            
    });
    // console.log(data)

    data = data.map(x => {
      return({Dates: x[0], NoOfUsersJoined_sum:x[1]});
    });

    let dataday = []
    usersJoined.forEach(element => {
    let rawDataDay = [(element.createdAt).toString().slice(4,15), 1];
    dataday.push(rawDataDay)
  });
  // console.log(dataday);

  dataday = dataday.map(x => {
    return({Dates: x[0], NoOfUsersJoined_sum:x[1]});
  });



  let datayear = []
    usersJoined.forEach(element => {
    let rawDataYear = [(element.createdAt).toString().slice(11,15), 1];
    datayear.push(rawDataYear)
  });

  datayear = datayear.map(x => {
    return({Dates: x[0], NoOfUsersJoined_sum:x[1]});
  });

    let unique_dates = []
    let newData = []
    data.forEach(element => {
      if(!unique_dates.includes(element.Dates)){
        unique_dates.push(element.Dates)
        newData.push(element)
      }else{
        newData[unique_dates.indexOf(element.Dates)].NoOfUsersJoined_sum += element.NoOfUsersJoined_sum
        
      }
    });

    let unique_datesday = []
    let newDataDay = []
    dataday.forEach(element => {
      if(!unique_datesday.includes(element.Dates)){
        unique_datesday.push(element.Dates)
        newDataDay.push(element)
      }else{
        newDataDay[unique_datesday.indexOf(element.Dates)].NoOfUsersJoined_sum += element.NoOfUsersJoined_sum
        
      }
    });

    let unique_datesyear = []
    let newDataYear = []
    datayear.forEach(element => {
      if(!unique_datesyear.includes(element.Dates)){
        unique_datesyear.push(element.Dates)
        newDataYear.push(element)
      }else{
        newDataYear[unique_datesyear.indexOf(element.Dates)].NoOfUsersJoined_sum += element.NoOfUsersJoined_sum
        
      }
    });

    res.status(200).json({ 'data':newData, 'dataday':newDataDay, 'datayear': newDataYear })
  });

  router.get('/NoOfTickets', async (req, res) => {
    const NoOfTickets = await Ticket.findAll({where: {singleticket: 1}, order: [['createdAt']]});
  
  
    let data = [];
    NoOfTickets.forEach(element => {
      let rawData = [(element.createdAt).toString().slice(3,8)+(element.createdAt).toString().slice(11,15), 1];
      data.push(rawData)
      
    });
    data = data.map(x => {
      // console.log(x[1]);
      // console.log(x[0]);
      return({Dates: x[0], NoOfTickets_sum:x[1]});
    })
    let dataday = []
    NoOfTickets.forEach(element => {
    let rawDataDay = [(element.createdAt).toString().slice(4,15), 1];
    dataday.push(rawDataDay)
  });
  // console.log(dataday);

  dataday = dataday.map(x => {
    return({Dates: x[0], NoOfTickets_sum:x[1]});
  });

  let datayear = []
    NoOfTickets.forEach(element => {
    let rawDataYear = [(element.createdAt).toString().slice(11,15), 1];
    datayear.push(rawDataYear)
  });
  // console.log(dataday);

  datayear = datayear.map(x => {
    return({Dates: x[0], NoOfTickets_sum:x[1]});
  });

    let unique_dates = []
    let newData = []
    data.forEach(element => {
      if(!unique_dates.includes(element.Dates)){
        unique_dates.push(element.Dates)
        newData.push(element)
      }else{
        newData[unique_dates.indexOf(element.Dates)].NoOfTickets_sum += element.NoOfTickets_sum
        
      }
    });

    let unique_datesday = []
    let newDataDay = []
    dataday.forEach(element => {
      if(!unique_datesday.includes(element.Dates)){
        unique_datesday.push(element.Dates)
        newDataDay.push(element)
      }else{
        newDataDay[unique_datesday.indexOf(element.Dates)].NoOfTickets_sum += element.NoOfTickets_sum
        
      }
    });

    let unique_datesyear = []
    let newDataYear = []
    datayear.forEach(element => {
      if(!unique_datesyear.includes(element.Dates)){
        unique_datesyear.push(element.Dates)
        newDataYear.push(element)
      }else{
        newDataYear[unique_datesyear.indexOf(element.Dates)].NoOfTickets_sum += element.NoOfTickets_sum
        
      }
    });

    res.status(200).json({ 'data':newData, 'dataday':newDataDay, 'datayear': newDataYear })
  });

  router.get('/GenderType', async (req, res) => {
    const GenderType = await User.findAll();
  
  
    let data = [];
    GenderType.forEach(element => {
      let rawData = [element.gender, 1];
      data.push(rawData)
      
      
    });
    // console.log(data);
    data = data.map(x => {
      return({Genders: x[0], GenderType_sum:x[1]});
    });
    
    let unique_dates = []
    let newData = []
    data.forEach(element => {
      if(!unique_dates.includes(element.Genders)){
        unique_dates.push(element.Genders)
        newData.push(element)
      }else{
        newData[unique_dates.indexOf(element.Genders)].GenderType_sum += element.GenderType_sum
        
      }
    });
    // console.log(newData);
    res.status(200).json({ 'data':newData })
  });
  router.get('/Totalbooking', async (req, res) => {
    const Totalbooking = await Bookings.findAll({where: {bookingstatus: 1}});
  
  
    let data = [];
    Totalbooking.forEach(element => {
      let rawData = [element.activity, 1];
      data.push(rawData)
      
    });
    // console.log(data);
    data = data.map(x => {
      return({activity: x[0], programme_sum:x[1]});
    });
    
    let unique_dates = []
    let newData = []
    data.forEach(element => {
      if(!unique_dates.includes(element.activity)){
        unique_dates.push(element.activity)
        newData.push(element)
      }else{
        newData[unique_dates.indexOf(element.activity)].programme_sum += element.programme_sum
        
      }
    });
    // console.log(newData);
    // console.log(newData);
    res.status(200).json({ 'data':newData })
  });


  router.get('/Totaluser', async (req, res) => {
    const Totaluser = await User.findAll({where: {verified: 1, userstatus: 1}});
  
  
    let data = [];
    Totaluser.forEach(element => {
      let rawData = [element.userrole, 1];
      data.push(rawData)
      
    });
    // console.log(data);
    data = data.map(x => {
      return({userrole: x[0], userrole_sum:x[1]});
    });
    
    let unique_dates = []
    let newData = []
    data.forEach(element => {
      if(!unique_dates.includes(element.userrole)){
        unique_dates.push(element.userrole)
        newData.push(element)
      }else{
        newData[unique_dates.indexOf(element.userrole)].userrole_sum += element.userrole_sum
        
      }
    });
    // console.log(newData);
    res.status(200).json({ 'data':newData })
  });


  


module.exports = router;