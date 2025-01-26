const express = require('express');
const router = express.Router();
const numberOfStarsController = require('../Controllers/numberOfStarsController');
const rateLimiter = require('../MiddleWares/rateLimiter')

router.post('/createstars', rateLimiter, numberOfStarsController.createNumberOfStars);


router.get('/getNumberOfstarsByChaletId/:chalet_id',rateLimiter, numberOfStarsController.getNumberOfStarsbyChaletId);

// router.get('/getNumberOfstars/:lang',rateLimiter, numberOfStarsController.getNumberOfStars);

router.get('/getNumberOfstarsGreaterThanFour/:lang',rateLimiter, numberOfStarsController.getHighRatedChalets);


router.get('/getAvergaestars/:chalet_id',rateLimiter, numberOfStarsController.getAverageStars);


router.put('/stars/:id',rateLimiter, numberOfStarsController.updateNumberOfStars);


router.delete('/stars/:id',rateLimiter, numberOfStarsController.deleteNumberOfStars);

module.exports = router;
