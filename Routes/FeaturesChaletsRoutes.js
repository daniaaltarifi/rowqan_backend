const express = require('express');
const router = express.Router();
const multer = require('../Config/Multer'); 
const FeaturesChaletsController = require('../Controllers/FeatureController');
const authMiddleware = require('../MiddleWares/authMiddleware');  
const rateLimiter = require('../MiddleWares/rateLimiter'); 


router.post('/createFeature', rateLimiter, FeaturesChaletsController.createFeature);

router.get('/getAllFeatures/:lang', FeaturesChaletsController.getFeatures);  

router.get('/getFeaturesbyid/:id/:lang', FeaturesChaletsController.getFeatureById);

router.put('/updateFeature/:id', rateLimiter, FeaturesChaletsController.updateFeature);

router.delete('/deleteFeature/:id/:lang', FeaturesChaletsController.deleteFeature);

module.exports = router;
