const express = require('express');
const router = express.Router();
const paymentsController = require('../Controllers/PaymentController');
const authMiddleware = require('../MiddleWares/authMiddleware');  
const rateLimiter = require('../MiddleWares/rateLimiter');

router.post('/createPayment', rateLimiter, paymentsController.createPayment);
router.post('/createPayPal', rateLimiter, paymentsController.createPayPalPayment);



router.post('/createPaymentIntent',rateLimiter, paymentsController.createPaymentIntent);


router.put('/updatePayment/:id', rateLimiter, paymentsController.updatePayment);

router.put('/updatePaymentStatus/:id', rateLimiter, paymentsController.updatePaymentStatus);

router.get('/getPayments/:userId',rateLimiter, paymentsController.getPayments);

router.get('/getAllPayments',rateLimiter, paymentsController.getAllPayments);

router.get('/getcapturePayPalPayment',rateLimiter, paymentsController.capturePayPalPayment);

router.get('/getPaymentById/:id', rateLimiter, paymentsController.getPaymentById);

router.delete('/deletePayment/:id', rateLimiter, paymentsController.deletePayment);


module.exports = router;