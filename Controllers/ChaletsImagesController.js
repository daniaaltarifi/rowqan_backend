const Chalet = require('../Models/ChaletsModel');
const ChaletsImages = require('../Models/ChaletsImagesModel');
const { validateInput, ErrorResponse } = require('../Utils/validateInput');
const {client} = require('../Utils/redisClient')





exports.createChaletImages = async (req, res) => {
  try {
    const { chalet_id } = req.body;

    if (!chalet_id) {
      return res.status(400).json(
        ErrorResponse("Validation failed", [
          "Chalet ID is required",
        ])
      );
    }

    const files = req.files ? req.files : [];

    if (files.length === 0) {
      return res.status(400).json(ErrorResponse("Files are required"));
    }

    const BASE_URL_IMAGE = "https://res.cloudinary.com/dqimsdiht/";
    const BASE_URL_VIDEO = "https://res.cloudinary.com/dqimsdiht/video/upload/v1736589099/";

    let validFiles = [];

    validFiles = files.map((file) => {
      const extension = file.originalname.split(".").pop().toLowerCase();
      if (!["png", "jpeg", "mp4",'jpg','avi','webp'].includes(extension)) {
        return null; 
      }

      const filenameWithExtension = `${file.filename}.${extension}`;
      const baseUrl = extension === "mp4" ? BASE_URL_VIDEO : BASE_URL_IMAGE;

      return {
        chalet_id,
        image: `${baseUrl}${filenameWithExtension}`,
      };
    }).filter(Boolean); 

    if (validFiles.length === 0) {
      return res
        .status(400)
        .json(ErrorResponse('Invalid file types. Allowed: .png, .jpeg, .mp4'));
    }

    const chalet = await Chalet.findByPk(chalet_id);
    if (!chalet) {
      return res.status(404).json(ErrorResponse("Chalet not found"));
    }

    const newFiles = await ChaletsImages.bulkCreate(validFiles);

    res.status(201).json({
      message: "Chalet files uploaded successfully",
      files: newFiles,
    });
  } catch (error) {
    console.error("Error in createChaletImages:", error);
    res.status(500).json(ErrorResponse("Failed to create chalet files"));
  }
};










exports.getImagesByChaletId = async (req, res) => {
  try {
    const { chalet_id } = req.params;
client.del(`chaletImages:${chalet_id}`);
    const cacheKey = `chaletImages:${chalet_id}`;
   
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for chalet images:", chalet_id);
      return res.status(200).json(
       JSON.parse(cachedData),
      );
    }
    console.log("Cache miss for chalet images:", chalet_id);

   
    const chaletImages = await ChaletsImages.findAll({
      where: { chalet_id },
      attributes: ['image'], 
    });

  
    if (!chaletImages.length) {
      return res.status(404).json(ErrorResponse('No images found for this chalet'));
    }

   
    const images = chaletImages.map((img) => img.image);
    await client.setEx(cacheKey, 3600, JSON.stringify(images));

    res.status(200).json(
     images,
    );
  } catch (error) {
    console.error("Error in getImagesByChaletId:", error);
    res.status(500).json(ErrorResponse('Failed to retrieve chalet images'));
  }
};



exports.updateChaletImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.file ? req.file.filename : null;

  
    if (!image) {
      return res.status(400).json(ErrorResponse('Image is required'));
    }

   
    const chaletImage = await ChaletsImages.findByPk(id);
    if (!chaletImage) {
      return res.status(404).json(ErrorResponse('Chalet image not found'));
    }

   
    chaletImage.image = image || chaletImage.image;

   
    await chaletImage.save();

    
    const cacheKey = `chaletImage:${id}`;
    await client.del(cacheKey);  
    await client.setEx(cacheKey, 3600, JSON.stringify(chaletImage));

    res.status(200).json(
      chaletImage,
    );
  } catch (error) {
    console.error(error);
    res.status(500).json(ErrorResponse('Failed to update chalet image'));
  }
};


exports.deleteChaletImage = async (req, res) => {
  try {
    const { id } = req.params;

   
    const [chaletImage, _] = await Promise.all([
      ChaletsImages.findByPk(id),
      client.del(`chaletImage:${id}`), 
    ]);

    
    if (!chaletImage) {
      return res.status(404).json(
        ErrorResponse("Chalet image not found", [
          "No Chalet image found with the given ID.",
        ])
      );
    }

   
    await chaletImage.destroy();

   
    return res.status(200).json({ message: "Chalet image deleted successfully" });
  } catch (error) {
    console.error("Error in deleteChaletImage:", error);

    return res.status(500).json(
      ErrorResponse("Failed to delete Chalet image", [
        "An internal server error occurred. Please try again later.",
      ])
    );
  }
};



exports.getChaletImageById = async (req, res) => {
  try {
    const { id } = req.params;

    const cacheKey = `chaletImage:${id}`;

    
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for chalet image:", id);
      return res.status(200).json(
        JSON.parse(cachedData),
      );
    }
    console.log("Cache miss for chalet image:", id);

  
    const chaletImage = await ChaletsImages.findByPk(id);
    if (!chaletImage) {
      return res.status(404).json(ErrorResponse('Chalet image not found'));
    }

   
    await client.set(cacheKey, JSON.stringify(chaletImage));

    return res.status(200).json(
      chaletImage,
    );
  } catch (error) {
    console.error("Error in getChaletImageById:", error);
    return res.status(500).json(
      ErrorResponse('Failed to retrieve chalet image', [
        'An internal server error occurred. Please try again later.',
      ])
    );
  }
};

