const BreifDetailsChalets = require('../Models/BreifDetailsChalets');
const Chalet = require('../Models/ChaletsModel');
const { validateInput, ErrorResponse } = require('../Utils/validateInput');
const {client} = require('../Utils/redisClient');
const ChaletsDetails = require('../Models/ChaletsDetails');
const { Sequelize } = require('sequelize');
const chalets_props = require('../Models/ChaletsProps')


exports.createBreifDetailsChalet = async (req, res) => {
  try {
    const { type, value, lang, chalet_id } = req.body;
    if (!type || !value || !lang || !chalet_id) {
      return res.status(400).json(
        ErrorResponse("Validation failed", [
          "type, value, lang, and chalet_id are required",
        ])
      );
    }
    if (!['en', 'ar'].includes(lang)) {
      return res.status(400).json( ErrorResponse('Invalid language'));
    }

    
    const chalet = await Chalet.findByPk(chalet_id);
    if (!chalet) {
      return res.status(404).json( ErrorResponse('Chalet not found'));
    }

    
    const existingBreifDetailsChalet = await BreifDetailsChalets.findOne({
      where: { chalet_id, lang, type }
    });
    if (existingBreifDetailsChalet) {
      return res.status(400).json( ErrorResponse('BreifDetailsChalet with the same type, lang, and chalet_id already exists'));
    }

    
    const newBreifDetailsChalet = await BreifDetailsChalets.create({
      type,
      value,
      lang,
      chalet_id,
    });

    
    const cacheDeletePromises = [client.del(`chalet:${chalet_id}:breifDetails`)];

    await Promise.all(cacheDeletePromises);

    
    res.status(201).json(newBreifDetailsChalet,);
  } catch (error) {
    console.error("Error in createBreifDetailsChalet:", error.message);
    res.status(500).json(
       ErrorResponse("Failed to create BreifDetailsChalet", [
        "An internal server error occurred.",
      ])
    );
  }
};

exports.getAllBreifChalet = async (req, res) => {
  try {
    const { lang } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    client.del(`chalet:${page}:breifDetails:${lang}`);
    const cacheKey = `chalet:${page}:breifDetails:${lang}`;
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const whereClause = lang ? { lang } : {};
    const brief = await BreifDetailsChalets.findAll({
      where: whereClause,
      include: [{ model: Chalet, attributes: ["title"] }],
      order: [["id", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    await client.setEx(cacheKey, 3600, JSON.stringify(brief));

    res.status(200).json(brief);
  } catch (error) {
    console.error("Error in getAllBreifDetailsChalets:", error.message);
    res
      .status(500)
      .json(
        ErrorResponse("Failed to fetch Chalet brief", [
          "An internal server error occurred.",
        ])
      );
  }
};



exports.getChaletsByLocation = async (req, res) => {
  try {
    const {value}=req.params
    const { page = 1, limit = 200 } = req.body;
    const { lang } = req.params;
    const offset = (page - 1) * limit;


    
    if (!value) {
      return res.status(400).json({
        error: "Validation failed",
        details: ["Value (location) is required."],
      });
    }
  
    const chalets = await Chalet.findAll({
      include: [
        {
          model: BreifDetailsChalets,
          where: {
            value: value,
          },
          attributes: [], 
        },

        {
          model: chalets_props,
          attributes: ["id", "image", "title"],
        },
        {
          model:ChaletsDetails,
          attributes:["Detail_Type"]
        }
      
      ],
      where: lang ? { lang } : {}, 
      attributes: ["id", "title", "reserve_price", "intial_Amount","image",],
      order: [["id", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

   
    if (chalets.length === 0) {
      return res.status(404).json({
        error: "No chalets found",
        details: [`No chalets found for the specified location: ${value}.`],
      });
    }

  
    return res.status(200).json(chalets);
  } catch (error) {
    console.error("Error in getChaletsByLocation:", error);
    return res.status(500).json({
      error: "Failed to fetch chalets by location",
      details: ["An internal server error occurred. Please try again later."],
    });
  }
};



exports.getChaletsByValue = async (req, res) => {
  try {
    
    const locationValues = await BreifDetailsChalets.findAll({
      where: { type: 'location' },  
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('value')), 'value']], 
    });

  
    if (locationValues.length === 0) {
      return res.status(404).json({
        error: "No locations found",
        details: ["No locations found for the specified type 'location'."],
      });
    }

   
    return res.status(200).json(locationValues);

  } catch (error) {
    console.error("Error in getChaletsByValue:", error);
    return res.status(500).json({
      error: "Failed to fetch location values",
      details: ["An internal server error occurred. Please try again later."],
    });
  }
};












exports.getBreifDetailsByChaletId = async (req, res) => {
  try {
    const { chalet_id, lang } = req.params;

    if (!['en', 'ar'].includes(lang)) {
      return res.status(400).json(new ErrorResponse('Invalid language'));
    }

    const cacheKey = `chalet:${chalet_id}:breifDetails:${lang}`;

   
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for BreifDetails:", chalet_id);
      return res.status(200).json(JSON.parse(cachedData),);
    }
    console.log("Cache miss for BreifDetails:", chalet_id);

  
    const chalet = await Chalet.findOne({
      where: { id: chalet_id },
      attributes: ['id', 'title'], 
      include: {
        model: BreifDetailsChalets,
        where: { lang },
        required: false,
        attributes: ['id', 'type', 'value'],
      },
    });

    if (!chalet) {
      return res.status(404).json( ErrorResponse('Chalet not found'));
    }

    
    await client.setEx(cacheKey, 3600, JSON.stringify(chalet.BreifDetailsChalets));

    return res.status(200).json(chalet.BreifDetailsChalets);
  } catch (error) {
    console.error("Error in getBreifDetailsByChaletId:", error);
    return res.status(500).json(
       ErrorResponse('Failed to retrieve BreifDetailsChalets', [
        'An internal server error occurred. Please try again later.',
      ])
    );
  }
};



exports.getBreifDetailsById = async (req, res) => {
  try {
    const { id, lang } = req.params;

    if (!['en', 'ar'].includes(lang)) {
      return res.status(400).json(new ErrorResponse('Invalid language'));
    }
client.del(`breifDetails:${id}:${lang}`)
    const cacheKey = `breifDetails:${id}:${lang}`;

    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for BreifDetailsChalet:", id);
      return res.status(200).json(JSON.parse(cachedData),
    );
    }
    console.log("Cache miss for BreifDetailsChalet:", id);

   
    const breifDetailsChalet = await BreifDetailsChalets.findOne({
      attributes: ['id', 'type', 'value','chalet_id'], 
      where: { id, lang },
    });

    if (!breifDetailsChalet) {
      return res.status(404).json(new ErrorResponse('BreifDetailsChalet not found'));
    }

    
    await client.setEx(cacheKey, 3600, JSON.stringify(breifDetailsChalet));

    return res.status(200).json(
      breifDetailsChalet,
    );
  } catch (error) {
    console.error("Error in getBreifDetailsById:", error);
    return res.status(500).json(
      new ErrorResponse('Failed to retrieve BreifDetailsChalet', [
        'An internal server error occurred. Please try again later.',
      ])
    );
  }
};


exports.updateBreifDetailsChalet = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, value, lang, chalet_id } = req.body;

    const validationErrors = validateInput({ type, value, lang, chalet_id });
    if (validationErrors.length > 0) {
      return res.status(400).json(ErrorResponse(validationErrors));
    }

    if (!['en', 'ar'].includes(lang)) {
      return res.status(400).json(ErrorResponse('Invalid language'));
    }

    const breifDetailsChalet = await BreifDetailsChalets.findByPk(id);
    if (!breifDetailsChalet) {
      return res.status(404).json(ErrorResponse('BreifDetailsChalet not found'));
    }

    const chalet = await Chalet.findByPk(chalet_id);
    if (!chalet) {
      return res.status(404).json(ErrorResponse('Chalet not found'));
    }

    const updatedFields = {};
    if (type && type !== breifDetailsChalet.type) updatedFields.type = type;
    if (value && value !== breifDetailsChalet.value) updatedFields.value = value;
    if (lang && lang !== breifDetailsChalet.lang) updatedFields.lang = lang;
    if (chalet_id && chalet_id !== breifDetailsChalet.chalet_id) updatedFields.chalet_id = chalet_id;

    if (Object.keys(updatedFields).length > 0) {
      await breifDetailsChalet.update(updatedFields);
    }

   
    const updatedData = breifDetailsChalet.toJSON();
    const cacheKey = `breifDetails:${id}:${lang}`;
    await client.setEx(cacheKey, 3600, JSON.stringify(updatedData));

    return res.status(200).json(updatedData,
    );
  } catch (error) {
    console.error("Error in updateBreifDetailsChalet:", error);

    return res.status(500).json(
      ErrorResponse('Failed to update BreifDetailsChalet', [
        'An internal server error occurred. Please try again later.',
      ])
    );
  }
};




exports.deleteBreifDetailsChalet = async (req, res) => {
  try {
    const { id, lang } = req.params;

    if (!['en', 'ar'].includes(lang)) {
      return res.status(400).json( ErrorResponse('Invalid language'));
    }

    const [breifDetailsChalet, _] = await Promise.all([
      BreifDetailsChalets.findOne({ where: { id, lang } }),
      client.del(`breifDetailsChalet:${id}:${lang}`),
    ]);

    if (!breifDetailsChalet) {
      return res.status(404).json( ErrorResponse('BreifDetailsChalet not found'));
    }

    await breifDetailsChalet.destroy();

    return res.status(200).json({
      message: 'BreifDetailsChalet deleted successfully',
    });
  } catch (error) {
    console.error("Error in deleteBreifDetailsChalet:", error);

    return res.status(500).json(
       ErrorResponse('Failed to delete BreifDetailsChalet', [
        'An internal server error occurred. Please try again later.',
      ])
    );
  }
};

