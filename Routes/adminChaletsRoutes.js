const express = require('express');
const router = express.Router();
const multer = require('../Config/Multer'); 
const AdminChaletsController = require('../Controllers/adminChaletsController'); 
const authMiddleware = require('../MiddleWares/authMiddleware');  
const rateLimiter = require('../MiddleWares/rateLimiter');  

router.get('/getChaletsByAdminId/:userId',rateLimiter,AdminChaletsController.getChaletByUserId)

router.get('/getUserIdByChaletId/:chaletId',rateLimiter,AdminChaletsController.getUserIdByChaletId)


module.exports = router;