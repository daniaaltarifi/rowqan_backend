const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const cloudinary = require('../Config/cloudinaryConfig');  

const storage = new CloudinaryStorage({
  cloudinary: cloudinary, 
  params: {
    folder: 'Chalets_Images',  
    allowed_formats: ['jpg', 'png', 'mp4', 'avi', 'mkv', 'pdf', 'doc', 'docx', 'txt','jpeg','webp'],  
    resource_type: 'auto',  
  },
});




const upload = multer({ storage });

module.exports = upload;
