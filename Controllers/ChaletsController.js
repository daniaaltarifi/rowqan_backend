const Chalet = require("../Models/ChaletsModel");
const Status = require("../Models/StatusModel");
const chaletsImages = require("../Models/ChaletsImagesModel");
const RightTimeModel = require("../Models/RightTimeModel");

const DatesForRightTime = require('../Models/DatesForRightTime')

const numberstars = require('../Models/no_StartChalet')


const { validateInput, ErrorResponse } = require("../Utils/validateInput");
const { client } = require("../Utils/redisClient");
const  {Sequelize,Op}  = require('sequelize');

const { sequelize } = require('../Config/dbConnect')

const axios = require('axios');


exports.createChalet = async (req, res) => {
  try {
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
      status_id,
    } = req.body || {};

    const image = req.files?.image?.[0]?.path || null;
    if (!image) {
      return res.status(400).json(
        ErrorResponse("Validation failed", ["Image is required"])
      );
    }

    if (!status_id) {
      return res.status(400).json(
        ErrorResponse("Validation failed", ["status_id is required"])
      );
    }

    if (!["en", "ar"].includes(lang)) {
      return res
        .status(400)
        .json(ErrorResponse('Invalid language, it should be "en" or "ar"'));
    }

   
    const geoApiUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
    const geoResponse = await axios.get(geoApiUrl);

    if (geoResponse.data.length > 0) {
      const location = geoResponse.data[0];
      const latitude = location.lat;
      const longitude = location.lon;

      const nearMeData = JSON.stringify({ latitude, longitude });

     
      const newChalet = await Chalet.create({
        title,
        description,
        image,
        Rating,
        city,
        area,
        intial_Amount,
        type: type ? JSON.parse(type) : null,
        features,
        Additional_features,
        near_me: nearMeData,
        lang,
        status_id,
      });

      console.log("Received rightTimesData:", rightTimesData);

      let rightTimeDetails = [];
      if (Array.isArray(rightTimesData)) {
        rightTimeDetails = await Promise.all(
          rightTimesData.map(async (rightTime) => {
            const createdRightTime = await RightTimeModel.create({
              type_of_time: rightTime.type_of_time,
              from_time: rightTime.from_time,
              to_time: rightTime.to_time,
              lang: rightTime.lang,
              price: rightTime.price,
              After_Offer: rightTime.After_Offer,
              chalet_id: newChalet.id,
              date: rightTime.date
            });

            return {
              id: createdRightTime.id,
              type_of_time: createdRightTime.type_of_time,
              price: createdRightTime.price,
            };
          })
        );
      }
     
      const cacheKey = `chalets4:page:1:limit:100:lang:${lang || "all"}`;
      const updatedChaletData = JSON.stringify(newChalet);
      client.setEx(cacheKey, 3600, updatedChaletData).catch((error) => {
        console.error("Error updating cache:", error);
      });

      res.status(201).json({
        message: lang === "en" ? "Chalet created successfully" : "تم إنشاء الشاليه بنجاح",
        chalet: newChalet,
        rightTimeDetails: rightTimeDetails,
      });
    } else {
      return res
        .status(400)
        .json({ error: "Failed to fetch geolocation for the given city." });
    }
  } catch (error) {
    console.error("Error in createChalet:", error);
    res.status(500).json(
      ErrorResponse("Error creating chalet", [
        "An internal server error occurred.",
      ])
    );
  }
};







exports.getAllChalets = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query; 
    const offset = (page - 1) * limit;
    const { lang } = req.params;

    
    if (lang && !["ar", "en"].includes(lang)) {
      return res.status(400).json({
        error: 'Invalid language. Supported languages are "ar" and "en".',
      });
    }

    
await client.del(`chalets5:page:${page}:limit:${limit}:lang:${lang || "all"}`);

    
const cacheKey = `chalets5:page:${page}:limit:${limit}:lang:${lang || "all"}`;

   
    
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit");
      return res.status(200).json(
       JSON.parse(cachedData),  
      );
    }

    
    const whereClause = lang ? { lang } : {};

    
    const chalets = await Chalet.findAll({
      where: whereClause,
      attributes: ["id", "title", "description", "image", "Rating", "city", "area", "intial_Amount", "type", "features", "Additional_features"], 
      include: [
        { model: Status, attributes: ["status"] },
        { model: chaletsImages, attributes: ["id", "image"] },
        {
          model: RightTimeModel,
          attributes: ["id", "type_of_time", "from_time", "to_time", "price", "After_Offer","date"],
          include: {
            model: DatesForRightTime,
            attributes: ["id", "date","price"],
          },
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["id", "DESC"]], 
    });

    
    if (chalets.length === 0) {
      return res.status(404).json({
        error: "No chalets found",
      });
    }

    
    await client.setEx(cacheKey, 300, JSON.stringify(chalets));

    
    res.status(200).json(
      chalets,  
    );
  } catch (error) {
    console.error("Error in getAllChalets:", error.message);
    res.status(500).json({
      error: "Failed to fetch chalets",
    });
  }
};







exports.getChaletsWithOffer = async (req, res) => {
  try {
    
    const chaletsWithOffer = await RightTimeModel.findAll({
      where: {
        After_Offer: { [Op.gt]: 0 },  
      },
      order: [['id', 'DESC']],  
    });

   
    if (!chaletsWithOffer.length) {
      return res.status(404).json({
        success: false,
        message: 'No chalets found with an offer.',
      });
    }

    
    return res.status(200).json({
      success: true,
      data: chaletsWithOffer,
    });
  } catch (error) {
    console.error('Error in getChaletsWithOffer:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch chalets with offer.',
    });
  }
};


exports.getChaletsByTypeOfTimeAndOffer = async (req, res) => {
  const { type_of_time } = req.params; 

  try {
   
    const chaletsWithOfferAndTime = await RightTimeModel.findAll({
      where: {
        type_of_time: type_of_time,
        After_Offer: { [Op.gt]: 0 }, 
      },
      include: [
        {
          model: Chalet, 
          attributes: [
            "id",
            "title",
            "description",
            "image",
            "type",
            "city",
            "area",
            "Rating",
            "type",
            "intial_Amount"
          ],
        },
      ],
    });

  
    if (!chaletsWithOfferAndTime || chaletsWithOfferAndTime.length === 0) {
      return res.status(200).json({
        success: false,
        message: `No chalets found with type_of_time "${type_of_time}" and an offer.`,
      });
    }

    
    const formattedChalets = chaletsWithOfferAndTime.map((item) => ({
      id: item.Chalet.id,
      title: item.Chalet.title,
      description: item.Chalet.description,
      image: item.Chalet.image,
      city: item.Chalet.city,
      area: item.Chalet.area,
      Rating: item.Chalet.Rating,
      type_of_time: item.type_of_time,
      after_offer: item.After_Offer,
      type: item.Chalet.type,
      intial_Amount: item.Chalet.intial_Amount,
    }));

    
    return res.status(200).json({
      success: true,
      data: formattedChalets,
    });
  } catch (error) {
    console.error("Error in getChaletsByTypeOfTimeAndOffer:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch chalets with the specified type_of_time and offer.",
    });
  }
};







exports.getChaletsByType = async (req, res) => {
  try {
    const { page = 1, limit = 80, key, value } = req.query;
    const offset = (page - 1) * limit;

    if (!key || !value) {
      return res.status(400).json({
        error: "Both 'key' and 'value' query parameters are required.",
      });
    }
    const chalets = await Chalet.findAll({
      where: Sequelize.where(
        Sequelize.fn('JSON_UNQUOTE', Sequelize.fn('JSON_EXTRACT', Sequelize.col('type'), `$."${key}"`)),
        { [Op.like]: `%${value}%` }
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














exports.getAllChaletsByPropsandDetails = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query; 
    const offset = (page - 1) * limit;
    const { lang } = req.params;
client.del(`chaletProps:page:${page}:limit:${limit}:lang:${lang || "all"}`)
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

    const whereClause = { id };
    if (lang && ["ar", "en"].includes(lang)) {
      whereClause.lang = lang;
    } else if (lang) {
      return res.status(400).json({
        error: 'Invalid language. Supported languages are "ar" and "en".',
      });
    }

    const chalet = await Chalet.findOne({
      where: whereClause,
      include: [
        { 
          model: Status, 
          attributes: ["id", "status"], 
        },
        { 
          model: RightTimeModel, 
          attributes: ["id", "type_of_time", "from_time", "to_time", "price", "After_Offer", "date"], 
          include: [
            { 
              model: DatesForRightTime,
              attributes: ["id", "date","price"], 
            }
          ]
        },
        {
          model: chaletsImages, 
          attributes: ["id", "image"], 
        },
      ],
      attributes: [
        "id", "title", "description", "image", "Rating", "city", "area",
        "intial_Amount", "type", "features", "Additional_features", "near_me"
      ],
    });

    if (!chalet) {
      return res.status(404).json({
        error: `Chalet with id ${id} and language ${lang} not found`
      });
    }

    res.json(chalet);
    
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
      status_id,
    } = req.body;

    const image = req.file ? req.file.path : null;

    
    const chalet = await Chalet.findByPk(id);
    if (!chalet) {
      return res.status(404).json({
        success: false,
        message: `Chalet with id ${id} not found`,
      });
    }

    
    if (lang && !["ar", "en"].includes(lang)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language. Supported languages are "ar" and "en".',
      });
    }

 
    if (status_id) {
      const status = await Status.findByPk(status_id);
      if (!status) {
        return res.status(404).json({
          success: false,
          message: "Status not found",
        });
      }
    }

   
    const updatedFields = {};
    if (title && title !== chalet.title) updatedFields.title = title;
    if (description && description !== chalet.description)
      updatedFields.description = description;
    if (image && image !== chalet.image) updatedFields.image = image;
    if (Rating && Rating !== chalet.Rating) updatedFields.Rating = Rating;
    if (city && city !== chalet.city) updatedFields.city = city;
    if (area && area !== chalet.area) updatedFields.area = area;
    if (intial_Amount && intial_Amount !== chalet.intial_Amount)
      updatedFields.intial_Amount = intial_Amount;
    if (type && type !== chalet.type) updatedFields.type = type;
    if (features && features !== chalet.features) updatedFields.features = features;
    if (
      Additional_features &&
      Additional_features !== chalet.Additional_features
    )
      updatedFields.Additional_features = Additional_features;
    if (near_me && near_me !== chalet.near_me) updatedFields.near_me = near_me;
    if (lang && lang !== chalet.lang) updatedFields.lang = lang;
    if (status_id && status_id !== chalet.status_id)
      updatedFields.status_id = status_id;

   
    if (Object.keys(updatedFields).length > 0) {
      await chalet.update(updatedFields);
    }

    const updatedData = chalet.toJSON();
    const cacheKey = `chalet:${id}`;
    await client.setEx(cacheKey, 3600, JSON.stringify(updatedData));

   
    return res.status(200).json({
      success: true,
      message: "Chalet updated successfully",
      data: updatedData,
    });
  } catch (error) {
    console.error("Error in updateChalet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update chalet",
    });
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

    
    await RightTimeModel.destroy({ where: { chalet_id: id } });
    await chaletsImages.destroy({ where: { chalet_id: id } });
    await numberstars.destroy({where:{chalet_id:id}})
    
    await Payments.destroy({
      where: {
        reservation_id: {
          [Op.in]: Sequelize.literal(`(SELECT id FROM Reservations_Chalets WHERE chalet_id = ${id})`)
        }
      }
    });
    

    
    await Reservations_Chalets.destroy({ where: { chalet_id: id } });

    
    await chalet.destroy();

    
    await client.del(`chalets5:page:1:limit:100:lang:${lang || "all"}`);

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

    
    const allChalets = await Chalet.findAll({
      include: [{ model: Status, attributes:["status"],
        model:RightTimeModel,attributes:["type_of_time","from_time","to_time","price","After_Offer"]

       },
    ],
      order: [["Rating", "DESC"]],
      attributes: ["id", "title", "description", "image", "Rating", "city", "area", "intial_Amount", "type", "features", "Additional_features", "near_me", "status_id"],
    }); 

    
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
const Payments = require("../Models/PaymentModel");

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

    const cacheKey = `chalets1:status:${status_id}:lang:${
      lang || "not_provided"
    }:page:${page}:limit:${limit}`;

    
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for status_id: ${status_id}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    
    const whereClause = { status_id };
    if (lang) whereClause.lang = lang;

    
    const chalets = await Chalet.findAll({
      where: whereClause,
      attributes: [
        "id",
        "title",
        "description",
        "image",
        "Rating",
        "city",
        "area",
        "intial_Amount",
        "type",
        "features",
        "Additional_features",
      ],
      include: [
        { model: Status, attributes: ["status"] },
        { model: RightTimeModel, attributes: ["type_of_time","from_time","to_time","price","After_Offer"] },
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




exports.getChaletsByType = async (req, res) => {
  try {
    const { page = 1, limit = 80, key, value } = req.query;

    if (!key || !value) {
      return res.status(400).json({
        error: "Both 'key' and 'value' query parameters are required.",
      });
    }
   
    const offset = (page - 1) * limit;

   
    const chalets = await Chalet.findAll({
      where: Sequelize.where(
        Sequelize.json(`type.${key}`), 
        { [Op.eq]: value } 
      ),
      limit: parseInt(limit),
      offset: parseInt(offset), 
      attributes: ["id", "title", "description", "image", "Rating", "city", "area", "intial_Amount", "type", "features", "additional_features"],
      include: [
        { model: Status, attributes: ["status"] },
        { model: RightTimeModel, attributes: ["type_of_time","from_time","to_time","price","After_Offer"] },
      ],
      order: [["id", "DESC"]],
    });

    
    if (!chalets.length) {
      return res.status(404).json({
        success: false,
        message: "No chalets found matching the specified criteria.",
      });
    }

    
    return res.status(200).json(
       chalets,
    );
  } catch (error) {
    console.error("Error in getChaletsByType:", error.message);
    res.status(500).json({
      error: "Failed to fetch chalets by type.",
    });
  }
};






exports.getChaletByFeature = async (req, res) => {
  try {
    const { lang } = req.params;
    const { page = 1, limit = 100, feature, additionalFeatures } = req.query;
    const offset = (page - 1) * limit;

    if (lang && !["ar", "en"].includes(lang)) {
      return res.status(400).json({
        error: 'Invalid language. Supported languages are "ar" and "en".',
      });
    }

    const cacheKey = `chalets1:feature1:${feature || "not_provided"}:additionalFeatures1:${additionalFeatures || "not_provided"}:lang:${lang || "not_provided"}:page:${page}:limit:${limit}`;

    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for feature: ${feature || "not_provided"} and additionalFeatures: ${additionalFeatures || "not_provided"}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    const whereClause = {};

    
    if (feature) {
      whereClause.features = { [Op.like]: `%${feature}%` };
    }

    
    if (additionalFeatures) {
      whereClause.Additional_features = { [Op.like]: `%${additionalFeatures}%` };
    }

    
    if (lang) whereClause.lang = lang;

    const chalets = await Chalet.findAll({
      where: whereClause,
      attributes: [
        "id",
        "title",
        "description",
        "image",
        "Rating",
        "city",
        "area",
        "intial_Amount",
        "type",
        "features",
        "Additional_features",
      ],
      include: [{ model: Status, attributes: ["status"],
        model:RightTimeModel,attributes:["type_of_time","from_time","to_time","price","After_Offer"]
       }],
      order: [["id", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    if (chalets.length === 0) {
      return res.status(404).json({
        error: `No chalets found with feature ${feature || "not provided"}, additional feature ${additionalFeatures || "not provided"}, and language ${lang || "not provided"}.`,
      });
    }

    await client.setEx(cacheKey, 3600, JSON.stringify(chalets));

    return res.status(200).json(chalets);
  } catch (error) {
    console.error("Error in getChaletByFeature:", error.message);
    return res.status(500).json({ error: "Failed to fetch chalets" });
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
    const { page = 1, limit = 100 } = req.query;
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
