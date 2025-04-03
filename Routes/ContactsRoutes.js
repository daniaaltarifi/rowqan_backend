const express = require('express');
const router = express.Router();
const upload = require('../Config/Multer'); 
const contactController = require('../Controllers/ContactsController');
const authMiddleware = require('../MiddleWares/authMiddleware');  
const rateLimiter = require('../MiddleWares/rateLimiter'); 


router.post('/createContacts', rateLimiter, upload.single('image'), contactController.createContact);
router.put('/updateContacts/:id', rateLimiter, upload.single('image'), contactController.updateContact);


router.get('/getContactsbyid/:id/:lang', contactController.getContactById);
router.get('/getAllContacts', contactController.getContacts);

router.delete('/deleteContacts/:id', contactController.deleteContact);

module.exports = router;
