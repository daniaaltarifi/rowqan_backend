const express = require('express');
const router = express.Router();
const DateController = require('../Controllers/datesForRightTimeController');
const rateLimiter = require('../MiddleWares/rateLimiter')




router.post('/createDate', DateController.createNewDate);


router.get('/AlldatesForRightTime', DateController.getAlldatesForRightTime);


router.get('/ForRightTimeById/:id', DateController.getDateForRightTimeById);


router.put('/UpdateDateForRightTime/:id', DateController.updatedateRightTime);


router.delete('/newmodel/:id', DateController.deleteNewModel);

module.exports = router;
