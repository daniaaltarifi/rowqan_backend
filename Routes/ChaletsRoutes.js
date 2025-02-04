const express = require('express');
const router = express.Router();
const chaletController = require('../Controllers/ChaletsController');
const upload = require('../Config/Multer');
const authMiddleware = require('../MiddleWares/authMiddleware');  
const rateLimiter = require('../MiddleWares/rateLimiter'); 


router.post(
  '/createchalet',
  upload.fields([
    { name: 'image', maxCount: 1 }, 
    { name: 'rightTimesData[0][image]', maxCount: 1 }, 
    { name: 'rightTimesData[1][image]', maxCount: 1 } ,
    { name: 'rightTimesData[2][image]', maxCount: 1 } ,
  ]),
  chaletController.createChalet
);


  


router.get('/getallchalets/:lang', chaletController.getAllChalets);

router.get('/getchalets/:lang', chaletController.getAllChaletsFront);

router.get('/getallchaletsbystatus/:status_id/:lang', chaletController.getChaletByStatus);

router.get('/getchaletbyid/:id', chaletController.getChaletById);


router.get('/getchaletsbyfeature/:lang', chaletController.getChaletByFeature);




router.get('/getChaletsByTypeOfTimeAndOffer/:type_of_time/:lang',rateLimiter,chaletController.getChaletsByTypeOfTimeAndOffer)

router.get('/getAllChaletsByType/:lang',rateLimiter,chaletController.getChaletsByType)

router.post('/filterByAreaOrCity/:lang',rateLimiter,chaletController.filterByCityAndArea)

router.get('/filterByChaletLocation/:lang',rateLimiter,chaletController.filterChaletsByLocation)

router.get('/getAllChaletsByPropsandDetails/:lang',rateLimiter,chaletController.getAllChaletsByPropsandDetails)

router.put('/updatechalet/:id', rateLimiter, upload.single('image'), chaletController.updateChalet);


router.delete('/deletechalet/:id/:lang', chaletController.deleteChalet);

module.exports = router;
