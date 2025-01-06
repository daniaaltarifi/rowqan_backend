const express = require('express');
const router = express.Router();

const userTypesController = require('../Controllers/UsersTypesController');
const authMiddleware = require('../MiddleWares/authMiddleware');
const rateLimiter = require('../MiddleWares/rateLimiter');

router.get('/getAllUsersTypes/:lang', rateLimiter, userTypesController.getAllUserTypes);
router.get('/getAllUsersTypesByType/:lang/:type', authMiddleware, rateLimiter, userTypesController.getUsersByType);
router.get('/getAllChaletsOwners/:lang', rateLimiter, userTypesController.getChaletOwners);
router.get('/getAllEventsOwners/:lang',  rateLimiter, userTypesController.getEventOwners);
router.get('/getAllLandsOwners/:lang',  rateLimiter, userTypesController.getLandOwners);
router.get('/getUsersTypesById/:id/:lang', rateLimiter, userTypesController.getUserTypeById);
router.get('/getChaletOwnerById/:id/:lang', rateLimiter, userTypesController.getChaletOwnerById);
router.get('/getEventOwnerById/:id/:lang', rateLimiter, userTypesController.getEventOwnerById);
router.get('/getLandOwnerById/:id/:lang', rateLimiter, userTypesController.getLandOwnerById);
router.post('/createUserType', rateLimiter, userTypesController.createUserType);
router.put('/UpdateUserType/:id', rateLimiter, userTypesController.updateUserType);
router.put('/UpdateChaletsOwner/:id', rateLimiter, userTypesController.updateChaletOwner);
router.put('/UpdateEventOwner/:id', rateLimiter, userTypesController.updateEventsOwner);
router.put('/UpdateLandOwner/:id', rateLimiter, userTypesController.updateLandsOwner);
router.delete('/DeleteUserType/:id/:lang', rateLimiter, userTypesController.deleteUserType);
router.delete('/DeleteChaletOwner/:id/:lang', rateLimiter, userTypesController.deleteChaletOwner);
router.delete('/DeleteEventOwner/:id/:lang', rateLimiter, userTypesController.deleteEventOwner);
router.delete('/DeleteLandOwner/:id/:lang', rateLimiter, userTypesController.deleteLandOwner);


const userController = require('../Controllers/UsersController');
const rateLimit = require('express-rate-limit');
// const authMiddleware = require('../MiddleWares/authMiddleware');
const rateLimiter = require('../MiddleWares/rateLimiter');
const { login, register, resetPassword, requestPasswordReset } = require('../MiddleWares/verifyjwt');
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: 'Too many password reset requests from this IP, please try again after 15 minutes.',
  standardHeaders: true, 
  legacyHeaders: false,
});
router.post('/createUser', rateLimiter, register);

router.get('/getAllUsers/:lang',rateLimiter, userController.getAllUsers);

router.get('/getUserById/:id/:lang', rateLimiter, userController.getUserById);

router.put('/UpdateUser/:id', rateLimiter, userController.updateUser);

router.delete('/DeleteUser/:id/:lang',  rateLimiter, userController.deleteUser);

router.post('/login', rateLimiter,login);

router.post('/logout', rateLimiter, userController.logout);

router.post('/createAdmin', userController.createAdmin);
router.get('/verifytoken',userController.verifyToken, (req, res) => {
    const userId = req.user.id; // The user ID from the JWT token's payload
    res.status(200).json({ userId });
  });
  router.post('/reset-password/:token',resetPassword);
  router.post('/forgot-password', passwordResetLimiter,requestPasswordReset);

module.exports = router;
