const Chalet = require("../Models/ChaletsModel");
const Status = require("../Models/StatusModel");
const multer = require("../Config/Multer");
const path = require("path");
const ChaletsDetails = require("../Models/ChaletsDetails");
const chaletsImages = require("../Models/ChaletsImagesModel");
const BreifDetailsChalets = require("../Models/BreifDetailsChalets");
const RightTimeModel = require("../Models/RightTimeModel");
const ReservationDate = require("../Models/ReservationDatesModel");
const ReservationsModel = require("../Models/ReservationsModel");
const { validateInput, ErrorResponse } = require("../Utils/validateInput");
const { client } = require("../Utils/redisClient");
const Chalet_props = require("../Models/ChaletsProps");
const { Op,Sequelize } = require("sequelize");


const axios = require('axios');

exports.createChalet = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    const { 
      title, 
      description, 
      Rating, 
      city,  
      area, 
      intial_Amount, 
      type, 
      features, 
      Additional_features,
      near_me,
      lang, 
      rightTimesData, 
      status_id 
    } = req.body || {};

    console.log("Received lang:", lang);
 
    const image = req.files?.image?.[0]?.path || null; 
    if (!image) {
      return res.status(400).json(
        ErrorResponse("Validation failed", [
          "Image is required"
        ])
      );
    }

   
    if (!status_id) {
      return res.status(400).json(
        ErrorResponse('Validation failed', ['status_id is required'])
      );
    }

   
    if (!["en", "ar"].includes(lang)) {
      return res.status(400).json(
        ErrorResponse('Invalid language, it should be "en" or "ar"')
      );
    }

    
    const geoApiUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;

    const geoResponse = await axios.get(geoApiUrl);

    if (geoResponse.data.length > 0) {
      const location = geoResponse.data[0];
      const latitude = location.lat;
      const longitude = location.lon;

      console.log("Latitude:", latitude, "Longitude:", longitude);

      const nearMeData = near_me 
        ? JSON.stringify({ latitude, longitude }) 
        : JSON.stringify({ latitude, longitude });

      
      const newChalet = await Chalet.create({
        title,
        description,
        image, 
        Rating,
        city,
        area,
        intial_Amount,
        type,
        features,
        Additional_features,
        near_me: nearMeData, 
        lang,  
        status_id
      });

      console.log("Chalet created:", newChalet);

     
      if (Array.isArray(rightTimesData) && rightTimesData.length > 0) {
       
        await Promise.all(
          rightTimesData.map(async (rightTime, index) => {
          
            const rightTimesImage = req.files?.[`rightTimesData[${index}][image]`]?.[0]?.path || null;
            if (!rightTimesImage) {
              return res.status(400).json(
                ErrorResponse("Validation failed", [
                  `Image for right time data at index ${index} is required`
                ])
              );
            }

            
            await RightTimeModel.create({
              image: rightTimesImage,
              type_of_time: rightTime.type_of_time,
              from_time: rightTime.from_time,
              to_time: rightTime.to_time,
              lang: rightTime.lang, 
              price: rightTime.price,
              After_Offer: rightTime.After_Offer,
              chalet_id: newChalet.id, 
            });
          })
        );
      } else {
        console.log("No rightTimesData provided or it's not an array");
      }

    
      res.status(201).json({
        message: lang === "en" ? "Chalet created successfully" : "تم إنشاء الشاليه بنجاح",
        chalet: newChalet,
      });

    } else {
      return res.status(400).json({ error: "Failed to fetch geolocation for the given city." });
    }

  } catch (error) {
    console.error("Error in createChalet:", error);
    res.status(500).json(ErrorResponse("Error creating chalet"));
  }
};












exports.getAllChalets = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { lang } = req.params;

    if (lang && !["ar", "en"].includes(lang)) {
      return res.status(400).json({
        error: 'Invalid language. Supported languages are "ar" and "en".',
      });
    }
    client.del(`chalets:page:${page}:limit:${limit}:lang:${lang || "all"}`);
    const cacheKey = `chalets:page:${page}:limit:${limit}:lang:${
      lang || "all"
    }`;
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const whereClause = lang ? { lang } : {};

    const chalets = await Chalet.findAll({
      where: whereClause,
      include: [
        { model: Status, attributes: ["status"] },
        { model: chaletsImages, attributes: ["id","image"] },
        { model: RightTimeModel, attributes: ["type_of_time","from_time","to_time","price","After_Offer"] },
        { model: ReservationsModel, attributes: ["id"] },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["id", "DESC"]],
    });

    await client.setEx(cacheKey, 3600, JSON.stringify(chalets));

    res.status(200).json(chalets);
  } catch (error) {
    console.error("Error in getAllChalets:", error.message);
    res.status(500).json({
      error: "Failed to fetch chalets",
    });
  }
};



exports.getAllChaletsAfterOffer = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { lang } = req.params;

    if (lang && !["ar", "en"].includes(lang)) {
      return res.status(400).json({
        error: 'Invalid language. Supported languages are "ar" and "en".',
      });
    }

    const cacheKey = `chalets:page:${page}:limit:${limit}:lang:${lang || "all"}`;
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const whereClause = {
      After_Offer: { [Op.gt]: 0 }, 
    };

    if (lang) {
      whereClause.lang = lang;
    }

    const chaletsafteroffer = await RightTimeModel.findAll({
      where: whereClause,
      include: [
        {
          model: Chalet,
          attributes: ["id", "title", "image", "Rating", "city", "area"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["id", "DESC"]],
    });

    
    await client.set(
      cacheKey,
      JSON.stringify(chaletsafteroffer),
      "EX",
      3600 
    );

    return res.status(200).json(chaletsafteroffer);
  } catch (error) {
    console.error("Error in getAllChaletsAfterOffer:", error.message);
    res.status(500).json({
      error: "Failed to fetch chalets",
    });
  }
};






exports.getChaletsByType = async (req, res) => {
  try {

    const { page = 1, limit = 80 } = req.query;
    const offset = (page - 1) * limit;
    const { key, value } = req.query; 

    if (!key || !value) {
      return res.status(400).json({
        error: "Both 'key' and 'value' query parameters are required.",
      });
    }

    
    const chalets = await Chalet.findAll({
      where: Sequelize.where(
        Sequelize.fn('LOCATE', `${key}:${value}`, Sequelize.col('type')),
        {
          [Op.gt]: 0 
        }
      ),
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["id", "DESC"]],
    });

    if (!chalets.length) {
      return res.status(404).json({
        success: false,
        message: "No chalets found matching the specified criteria.",
      });
    }

    return res.status(200).json({
      success: true,
      data: chalets,
    });
  } catch (error) {
    console.error("Error in getChaletsByType:", error.message);
    res.status(500).json({
      error: "Failed to fetch chalets by type.",
    });
  }
};










exports.getAllChaletsByProps = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { lang } = req.params;

    client.del(
      `chaletProps:page:${page}:limit:${limit}:lang:${lang || "allChaletProps"}`
    );

    if (lang && !["ar", "en"].includes(lang)) {
      return res.status(400).json({
        error: 'Invalid language. Supported languages are "ar" and "en".',
      });
    }

    const cacheKey = `chaletProps:page:${page}:limit:${limit}:lang:${
      lang || "allChaletProps"
    }`;
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const whereClause = lang ? { lang } : {};

    const chalets = await Chalet.findAll({
      where: whereClause,
      include: [{ model: Chalet_props, attributes: ["id","title", "image"] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["id", "DESC"]],
    });

    await client.setEx(cacheKey, 3600, JSON.stringify(chalets));

    res.status(200).json(chalets);
  } catch (error) {
    console.error("Error in get All Chalets Bt Props:", error.message);
    res.status(500).json({
      error: "Failed to fetch chalets",
    });
  }
};




exports.getAllChaletsByPropsandDetails = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query; 
    const offset = (page - 1) * limit;
    const { lang } = req.params;

    const cacheKey = `chaletProps:page:${page}:limit:${limit}:lang:${lang || "all"}`;

    
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    
    if (lang && !["ar", "en"].includes(lang)) {
      return res.status(400).json({
        error: 'Invalid language. Supported languages are "ar" and "en".',
      });
    }

    
    const whereClause = lang ? { lang } : {};

    
    const chalets = await Chalet.findAll({
      where: whereClause,
      include: [
        {
          model: BreifDetailsChalets,
          attributes: ["id", "type", "value"],
        },
      ],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [["id", "DESC"]],
    });

    
    await client.setEx(cacheKey, 3600, JSON.stringify(chalets));

    res.status(200).json(chalets);
  } catch (error) {
    console.error("Error in getAllChaletsByPropsandDetails:", error.message);
    res.status(500).json({
      error: "Failed to fetch chalets",
    });
  }
};


exports.getChaletById = async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;
    const cacheKey = `chalet:${id}:lang:${lang || "all"}`;


    client.del(cacheKey);

    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for chalet:", id);
      return res.status(200).json(JSON.parse(cachedData));
    }
    console.log("Cache miss for chalet:", id);

    const whereClause = { id };
    if (lang) {
      if (!["ar", "en"].includes(lang)) {
        return res.status(400).json({
          error: 'Invalid language. Supported languages are "ar" and "en".',
        });
      }
      whereClause.lang = lang;
    }

    const chalet = await Chalet.findOne({
      where: whereClause,
      include: [
        { model: Status, attributes: ["id","status"] },
        { model: chaletsImages, attributes: ["image"] },
        { model: BreifDetailsChalets, attributes: ["type"] },
        { model: RightTimeModel, attributes: ["time"] },
        { model: ChaletsDetails, attributes: ["detail_type"] },
        { model: ReservationsModel, attributes: ["Chalet_id"] },
      ],
    });

    if (!chalet) {
      return res.status(404).json({
        error: `Chalet with id ${id} and language ${lang} not found`,
      });
    }

    const updatedChaletData = {
      id: chalet.id,
      title: chalet.title,
      image: chalet.image,
      reserve_price: chalet.reserve_price,
      lang: chalet.lang,
      status: [{ id: chalet.Status.id, status: chalet.Status.status }],  
      ChaletsImages: chalet.ChaletsImages.map(img => img.image),
      BreifDetailsChalets: chalet.BreifDetailsChalets.map(detail => detail.type),
      RightTimeModels: chalet.RightTimeModels.map(time => time.time),
      ChaletsDetails: chalet.ChaletsDetails.map(detail => detail.detail_type),
      Reservations: chalet.Reservations.map(reservation => reservation.Chalet_id),
    };
    

    await client.setEx(cacheKey, 3600, JSON.stringify(updatedChaletData));

    res.status(200).json(updatedChaletData);
  } catch (error) {
    console.error("Error in getChaletById:", error);
    res.status(500).json({ error: "Failed to fetch chalet" });
  }
};



exports.updateChalet = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      Rating, 
      city,  
      area, 
      intial_Amount, 
      type, 
      features, 
      Additional_features,
      near_me,
      lang, 
      status_id 
    } = req.body || {};

    console.log("Received lang:", lang);
    
    const image = req.files?.image?.[0]?.path || null;
    const validationErrors = [];

  
    if (!status_id) {
      validationErrors.push('status_id is required');
    }

    if (!["en", "ar"].includes(lang)) {
      validationErrors.push('Invalid language, it should be "en" or "ar"');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json(ErrorResponse("Validation failed", validationErrors));
    }

   
    const chalet = await Chalet.findByPk(id);
    if (!chalet) {
      return res.status(404).json(ErrorResponse(`Chalet with id ${id} not found`));
    }

   
    if (status_id) {
      const status = await Status.findByPk(status_id);
      if (!status) {
        return res.status(404).json(ErrorResponse("Status not found"));
      }
    }

    
    const updatedFields = {};
    if (title && title !== chalet.title) updatedFields.title = title;
    if (description && description !== chalet.description) updatedFields.description = description;
    if (Rating && Rating !== chalet.Rating) updatedFields.Rating = Rating;
    if (city && city !== chalet.city) updatedFields.city = city;
    if (area && area !== chalet.area) updatedFields.area = area;
    if (intial_Amount && intial_Amount !== chalet.intial_Amount) updatedFields.intial_Amount = intial_Amount;
    if (type && type !== chalet.type) updatedFields.type = type;
    if (features && features !== chalet.features) updatedFields.features = features;
    if (Additional_features && Additional_features !== chalet.Additional_features) updatedFields.Additional_features = Additional_features;
    if (near_me && near_me !== chalet.near_me) updatedFields.near_me = near_me;
    if (lang && lang !== chalet.lang) updatedFields.lang = lang;
    if (status_id && status_id !== chalet.status_id) updatedFields.status_id = status_id;
    if (image && image !== chalet.image) updatedFields.image = image;

    if (Object.keys(updatedFields).length > 0) {
      await chalet.update(updatedFields);
    }

    const updatedData = chalet.toJSON();

    
    const cacheKey = `chalet:${id}`;
    await client.setEx(cacheKey, 3600, JSON.stringify(updatedData));

    res.status(200).json({
      message: lang === "en" ? "Chalet updated successfully" : "تم تحديث الشاليه بنجاح",
      chalet: updatedData,
    });

  } catch (error) {
    console.error("Error in updateChalet:", error);
    res.status(500).json(ErrorResponse("Failed to update chalet"));
  }
};




exports.deleteChalet = async (req, res) => {
  try {
    const { id, lang } = req.params;

    if (lang && !["ar", "en"].includes(lang)) {
      return res.status(400).json({
        error: 'Invalid language. Supported languages are "ar" and "en".',
      });
    }

    const chalet = await Chalet.findByPk(id);
    if (!chalet) {
      return res
        .status(404)
        .json(
          ErrorResponse("Chalet not found", [
            "No Chalet found with the given ID.",
          ])
        );
    }

    if (lang && chalet.lang !== lang) {
      return res.status(400).json({
        error: `Chalet not found for the given language: ${lang}`,
      });
    }

    
    await chalet.destroy();

   
    await RightTimeModel.destroy({ where: { chalet_id: id } });

    
    await chaletsImages.destroy({ where: { chalet_id: id } });

    
    await Reservations_Chalets.destroy({ where: { chalet_id: id } });

   
    await client.del(`chalet:${id}`);

    return res.status(200).json({ message: "Chalet deleted successfully" });
  } catch (error) {
    console.error("Error in deleteChalet:", error);

    return res
      .status(500)
      .json(
        ErrorResponse("Failed to delete Chalet", [
          "An internal server error occurred. Please try again later.",
        ])
      );
  }
};







exports.filterByCityAndArea = async (req, res) => {
  try {
    const { city, area } = req.body; 

    
    if (!city && !area) {
      return res.status(400).json({ error: "Please provide either a city or area to filter" });
    }

    
    const allChalets = await Chalet.findAll(); 

    
    const filteredChalets = allChalets.filter(chalet => {
      const chaletCity = chalet.city.toLowerCase();
      const chaletArea = chalet.area.toLowerCase();

      
      const cityMatches = city ? chaletCity === city.toLowerCase() : true;
      const areaMatches = area ? chaletArea === area.toLowerCase() : true;

      return cityMatches && areaMatches; 
    });

    if (filteredChalets.length === 0) {
      return res.status(404).json({ message: "No chalets found for the given city or area" });
    }

    return res.status(200).json(filteredChalets);

  } catch (error) {
    console.error("Error in filterByCityAndArea:", error);
    return res.status(500).json({ error: "Error filtering chalets" });
  }
};




const geolib = require('geolib');
const Reservations_Chalets = require("../Models/Reservations_Chalets");

exports.filterChaletsByLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.body; 

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and Longitude are required" });
    }

    
    const chalets = await Chalet.findAll(); 

    if (chalets.length === 0) {
      return res.status(404).json({ message: "No chalets found" });
    }

    
    const nearbyChalets = chalets.filter(chalet => {
      const chaletLocation = JSON.parse(chalet.near_me); 
      
      if (!chaletLocation || !chaletLocation.latitude || !chaletLocation.longitude) {
        console.log(`Invalid location data for chalet with ID: ${chalet.id}`);
        return false; 
      }

      const distance = geolib.getDistance(
        { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }, 
        { latitude: parseFloat(chaletLocation.latitude), longitude: parseFloat(chaletLocation.longitude) } 
      );

      
      const distanceInKm = distance / 1000;

      
      return distanceInKm <= radius;
    });

    if (nearbyChalets.length === 0) {
      return res.status(404).json({ message: "No chalets found within the specified radius" });
    }

    
    res.status(200).json({ chalets: nearbyChalets });

  } catch (error) {
    console.error("Error in filterChaletsByLocation:", error);
    res.status(500).json({ error: "Error filtering chalets by location" });
  }
};







exports.getChaletByStatus = async (req, res) => {
  try {
    const { status_id, lang } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!status_id) {
      return res.status(400).json({ error: "status_id is required" });
    }

    if (lang && !["ar", "en"].includes(lang)) {
      return res.status(400).json({
        error: 'Invalid language. Supported languages are "ar" and "en".',
      });
    }
    client.del(
      `chalets:status:${status_id}:lang:${
        lang || "not_provided"
      }:page:${page}:limit:${limit}`
    );
    const cacheKey = `chalets:status:${status_id}:lang:${
      lang || "not_provided"
    }:page:${page}:limit:${limit}`;

    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for status_id: ${status_id}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    const whereClause = { status_id };
    if (lang) {
      whereClause.lang = lang;
    }

    const chalets = await Chalet.findAll({
      where: whereClause,
      attributes: [
        "id",
        "title",
        "image",
        "reserve_price",
        "lang",
        "status_id",
      ],
      include: [
        { model: Status, attributes: ["status"] },
        { model: Chalet_props, attributes: ["id", "title", "image"] },
      ],
      order: [["id", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    if (chalets.length === 0) {
      return res.status(404).json({
        error: `No chalets found with status_id ${status_id} and language ${
          lang || "not provided"
        }.`,
      });
    }

    await client.setEx(cacheKey, 3600, JSON.stringify(chalets));

    return res.status(200).json(chalets);
  } catch (error) {
    console.error("Error in getChaletByStatus:", error.message);
    return res.status(500).json({ error: "Failed to fetch chalets" });
  }
};

exports.getChaletsByDetailType = async (req, res) => {
  try {
    const { type, lang } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!type || !lang) {
      return res
        .status(400)
        .json({ error: "Detail type and language are required" });
    }

    if (!["en", "ar"].includes(lang)) {
      return res.status(400).json({ error: "Invalid language" });
    }

    const cacheKey = `chalets:detailType:${type}:lang:${lang}:page:${page}:limit:${limit}`;

    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for chalets with detail type:", type);
      return res.status(200).json(JSON.parse(cachedData));
    }
    console.log("Cache miss for chalets with detail type:", type);

    const chalets = await Chalet.findAll({
      include: {
        model: ChaletsDetails,
        where: {
          lang,
          detail_type: type,
        },
        required: true,
      },
      order: [["id", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    if (chalets.length === 0) {
      return res.status(404).json({
        error: "No chalets found for the given detail type and language",
      });
    }

    await client.setEx(cacheKey, 3600, JSON.stringify(chalets));

    res.status(200).json(chalets);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to retrieve chalets by detail type" });
  }
};

exports.createCategoryLand = async (req, res) => {
  try {
    const { title, price, location, lang } = req.body;
    const image = req.file ? req.file.filename : null;

    const newCategoryLand = await CategoriesLandsModel.create({
      title,
      price,
      location,
      lang,
      image,
    });

    res.status(201).json(newCategoryLand);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create Category Land" });
  }
};

exports.getAllChaletsFront = async (req, res) => {
  try {
    const { lang } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!lang) {
      return res.status(400).json({ error: "Language is required" });
    }

    if (!["en", "ar"].includes(lang)) {
      return res.status(400).json({ error: "Invalid language" });
    }

    const cacheKey = `chalets:lang:${lang}:page:${page}:limit:${limit}`;

    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for chalets");
      return res.status(200).json(JSON.parse(cachedData));
    }
    console.log("Cache miss for chalets");

    const chalets = await Chalet.findAll({
      where: { lang },
      include: [
        {
          model: Status,
          as: "Status",
          attributes: ["status"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["id", "DESC"]],
    });

    if (chalets.length === 0) {
      return res.status(404).json({
        error: lang === "en" ? "No Chalets found" : "لا توجد شاليهات",
      });
    }

    await client.setEx(cacheKey, 3600, JSON.stringify(chalets));

    res.status(200).json(chalets);
  } catch (error) {
    console.error("Error in getAllChaletsFront:", error);
    res.status(500).json({
      error:
        lang === "en"
          ? "Failed to retrieve chalets"
          : "فشل في استرجاع الشاليهات",
    });
  }
};
