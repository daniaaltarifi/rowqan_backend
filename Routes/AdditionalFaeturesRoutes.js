const express = require('express');
const router = express.Router();
const multer = require('../Config/Multer'); 
const AdditionalFeaturesRoutes = require('../Controllers/AdditionalFeaturesController');
const authMiddleware = require('../MiddleWares/authMiddleware');  
const rateLimiter = require('../MiddleWares/rateLimiter'); 


router.post('/createFeature', rateLimiter, AdditionalFeaturesRoutes.createFeature);

router.get('/getAllFeatures/:lang', AdditionalFeaturesRoutes.getFeatures);  

router.get('/getFeaturesbyid/:id/:lang', AdditionalFeaturesRoutes.getFeatureById);

router.put('/updateFeature/:id', rateLimiter, AdditionalFeaturesRoutes.updateFeature);

router.delete('/deleteFeature/:id/:lang', AdditionalFeaturesRoutes.deleteFeature);

module.exports = router;
