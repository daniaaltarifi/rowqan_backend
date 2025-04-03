const express = require('express');
const router = express.Router();

const ReservationsChaletsController = require('../Controllers/ReservationsChaletsController');
const authMiddleware = require('../MiddleWares/authMiddleware');
const rateLimiter = require('../MiddleWares/rateLimiter');


router.post('/createReservationChalet', rateLimiter, ReservationsChaletsController.createReservation);


router.get('/getAllReservationChalet/:lang', ReservationsChaletsController.getAllReservations);


router.get('/getAllReservationChaletById/:id/:lang', ReservationsChaletsController.getReservationById);


router.put('/updateReservations/:id', rateLimiter, ReservationsChaletsController.updateReservation);



router.get('/reservationsByChaletId/:chalet_id/:lang', ReservationsChaletsController.getReservationsByChaletId);


router.get('/getReservationsByRightTimeName/:chalet_id/:name/:lang', ReservationsChaletsController.getReservationsByRightTimeName);

router.get('/getReservationsByRightTime/:chalet_id/:lang', ReservationsChaletsController.getReservationsByRightTime);

router.get('/reservationsByUserId/:user_id/:lang', ReservationsChaletsController.getReservationsByUserId);

router.get('/available-times/:chalet_id/:date/:lang',ReservationsChaletsController.getAvailableTimesByDate)


router.delete('/reservations/:id/:lang', ReservationsChaletsController.deleteReservation);


router.get('/reservationsByChaletId/:chalet_id/:lang', ReservationsChaletsController.getReservationsByChaletId);



router.get('/reservationsDatesByChaletId/:chalet_id', ReservationsChaletsController.getChaletReservationsDate);


// router.get('/reservations/:chalet_id/:lang', ReservationsChaletsController.getReservationsByChaletId);

module.exports = router;
