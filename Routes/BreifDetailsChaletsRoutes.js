const express = require('express');
const router = express.Router();
const BreifDetailsChaletsController = require('../Controllers/BreifDetailsChaletsController');
const authMiddleware = require('../MiddleWares/authMiddleware');  
const rateLimiter = require('../MiddleWares/rateLimiter'); 


router.post('/createBreif', rateLimiter, BreifDetailsChaletsController.createBreifDetailsChalet);
router.put('/updateBreif/:id', rateLimiter, BreifDetailsChaletsController.updateBreifDetailsChalet);

router.get('/getAllBreifChalet/:lang', BreifDetailsChaletsController.getAllBreifChalet);

router.get('/getBreifsByChaletId/:chalet_id/:lang', BreifDetailsChaletsController.getBreifDetailsByChaletId);
router.get('/getChaletsByLocation/:value/:lang', BreifDetailsChaletsController.getChaletsByLocation);


router.get('/getChaletsByvalue/:lang', BreifDetailsChaletsController.getChaletsByValue);


router.get('/getById/:id/:lang', BreifDetailsChaletsController.getBreifDetailsById);
router.delete('/deleteBreif/:id/:lang', BreifDetailsChaletsController.deleteBreifDetailsChalet);

module.exports = router;
