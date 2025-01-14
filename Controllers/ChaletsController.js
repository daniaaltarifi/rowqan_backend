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


exports.createChalet = async (req, res) => {
  try {
    const {
      title,
      lang,
      status_id,
      reserve_price,
      intial_Amount,
      properties,
      breifDetails,
    } = req.body || {};

    
    if (!title || !lang || !status_id || !reserve_price || !intial_Amount) {
      return res.status(400).json(
        ErrorResponse("Validation failed", [
          "Title, language, status_id, reserve_price, and intial_Amount are required.",
        ])
      );
    }

    const validationErrors = validateInput({
      title,
      lang,
      status_id,
      reserve_price,
      intial_Amount,
    });
    if (validationErrors.length > 0) {
      return res
        .status(400)
        .json(ErrorResponse("Validation failed", validationErrors));
    }

    if (!["ar", "en"].includes(lang)) {
      return res.status(400).json(
        ErrorResponse(
          'Invalid language. Supported languages are "ar" and "en".'
        )
      );
    }

    const status = await Status.findByPk(status_id);
    if (!status) {
      return res.status(404).json(ErrorResponse("Status not found"));
    }

   
    const newChalet = await Chalet.create({
      title,
      image: req.files?.image ? req.files.image[0].filename : 'img1.png', 
      lang,
      status_id,
      reserve_price,
      intial_Amount,
    });

   
    if (Array.isArray(properties)) {
      const chaletPropsData = properties.map((property) => ({
        Chalet_Id: newChalet.id, 
        title: property.title,
        lang: property.lang,
        image: property.image || null,
      }));

      await Chalet_props.bulkCreate(chaletPropsData);
     
    }
    console.log(`The chalets properties data is:${properties}`)

   
  
    if (breifDetails && breifDetails.Detail_Type && breifDetails.lang) {
      const breifDetail = {
        chalet_id: newChalet.chalet_id,  
        Detail_Type: breifDetails.Detail_Type,
        lang: breifDetails.lang,
      };

      await BreifDetailsChalets.create(breifDetail);  
      console.log(newChalet.id)
    }
    console.log(`The Chalet Id is:${newChalet.id}`)
    console.log(`The Brefi details is :${breifDetails}`)
    
    if (req.files?.chalet_images && req.files.chalet_images.length > 0) {
      const BASE_URL_IMAGE = "https://res.cloudinary.com/dqimsdiht/";
      const BASE_URL_VIDEO = "https://res.cloudinary.com/dqimsdiht/video/upload/v1736589099/";

      const validFiles = req.files.chalet_images
        .map((file) => {
          const extension = file.originalname.split(".").pop().toLowerCase();
          if (!["png", "jpeg", "mp4"].includes(extension)) {
            return null;
          }

          const filenameWithExtension = `${file.filename}.${extension}`;
          const baseUrl = extension === "mp4" ? BASE_URL_VIDEO : BASE_URL_IMAGE;

          return {
            chalet_id: newChalet.id,  
            chalet_images: `${baseUrl}${filenameWithExtension}`,
          };
        })
        .filter(Boolean);

      if (validFiles.length > 0) {
        await chaletsImages.bulkCreate(validFiles);
      }
    }

    res.status(201).json(newChalet);
  } catch (error) {
    console.error("Error in createChalet:", error);

    res
      .status(500)
      .json(
        ErrorResponse("Failed to create Chalet", [
          "An internal server error occurred.",
        ])
      );
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
        { model: RightTimeModel, attributes: ["time"] },
        { model: ChaletsDetails, attributes: ["detail_type"] },
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
    const { title, lang, status_id, reserve_price,intial_Amount } = req.body;
    const image = req.file ? req.file.filename : null;

    const validationErrors = validateInput({
      title,
      lang,
      status_id,
      reserve_price,
      intial_Amount
    });
    if (validationErrors.length > 0) {
      return res
        .status(400)
        .json(ErrorResponse("Validation failed", validationErrors));
    }

    const chalet = await Chalet.findByPk(id);
    if (!chalet) {
      return res
        .status(404)
        .json(ErrorResponse(`Chalet with id ${id} not found`));
    }

    if (lang && !["ar", "en"].includes(lang)) {
      return res
        .status(400)
        .json(
          ErrorResponse(
            'Invalid language. Supported languages are "ar" and "en".'
          )
        );
    }

    if (status_id) {
      const status = await Status.findByPk(status_id);
      if (!status) {
        return res.status(404).json(ErrorResponse("Status not found"));
      }
    }

    const updatedFields = {};
    if (title && title !== chalet.title) updatedFields.title = title;
    if (lang && lang !== chalet.lang) updatedFields.lang = lang;
    if (status_id && status_id !== chalet.status_id)
      updatedFields.status_id = status_id;
    if (reserve_price && reserve_price !== chalet.reserve_price)
      updatedFields.reserve_price = reserve_price;
    if (intial_Amount && intial_Amount !== chalet.intial_Amount)
      updatedFields.intial_Amount = intial_Amount;
    if (image && image !== chalet.image) updatedFields.image = image;

    if (Object.keys(updatedFields).length > 0) {
      await chalet.update(updatedFields);
    }

    const updatedData = chalet.toJSON();
    const cacheKey = `chalet:${id}`;
    await client.setEx(cacheKey, 3600, JSON.stringify(updatedData));

    return res.status(200).json(updatedData);
  } catch (error) {
    console.error("Error in updateChalet:", error);
    return res.status(500).json(ErrorResponse("Failed to update chalet"));
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
