const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dqimsdiht', 
    api_key: '962796269278498',       
    api_secret: 'f6WAhyAeENy3rYT5NN23q9MRhec', 
});

module.exports = cloudinary;
