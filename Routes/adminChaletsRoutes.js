const express = require('express');
const router = express.Router();
const multer = require('../Config/Multer'); 
const AdminChaletsController = require('../Controllers/adminChaletsController'); 
const authMiddleware = require('../MiddleWares/authMiddleware');  
const rateLimiter = require('../MiddleWares/rateLimiter');  

router.get('/getChaletsByAdminId/:id',rateLimiter,AdminChaletsController.getChaletByUserId)




module.exports = router;