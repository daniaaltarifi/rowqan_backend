const express = require('express');
const router = express.Router();
const LetRowqanChooseController = require('../Controllers/LetRowqanChooseController'); 
const authMiddleware = require('../MiddleWares/authMiddleware');  
const rateLimiter = require('../MiddleWares/rateLimiter');  


router.post('/createChoose', rateLimiter, LetRowqanChooseController.createReservation);


router.put('/update/:id', rateLimiter, LetRowqanChooseController.updateReservation);


router.get('/getallChoose', LetRowqanChooseController.getAllReservations);


router.get('/getbyid/:id', LetRowqanChooseController.getReservationById);


router.delete('/delete/:id', rateLimiter, LetRowqanChooseController.deleteReservation);

module.exports = router;