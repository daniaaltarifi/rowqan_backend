const express = require('express');
const router = express.Router();
const multer = require('../Config/Multer');
const TagController = require('../Controllers/TagsController');
const authMiddleware = require('../MiddleWares/authMiddleware');
const rateLimiter = require('../MiddleWares/rateLimiter');

router.post('/createTag', rateLimiter, multer.single('image'), TagController.createTag);

router.post('/createTagAndProps', rateLimiter, multer.single('image'), TagController.createTagAndProperty);


router.get('/getallTags/:lang', rateLimiter, TagController.getTags);

router.get('/getTagById/:id/:lang', rateLimiter, TagController.getTagById);

router.put('/updateTag/:id',  rateLimiter, multer.single('image'), TagController.updateTag);

router.delete('/deleteTag/:id', rateLimiter, TagController.deleteTag);

module.exports = router;
