const number_stars = require('../Models/no_StartChalet');
const Chalet = require('../Models/ChaletsModel');
const { validateInput, ErrorResponse } = require('../Utils/validateInput');
const { client } = require("../Utils/redisClient");


const { Op,Sequelize } = require("sequelize");
exports.createNumberOfStars = async (req, res) => {
  try {
    const { chalet_id, no_start } = req.body || {};

    if (!chalet_id || !no_start) {
      return res.status(400).json(
        ErrorResponse("Validation failed", [
          "chalet_id and no_start are required",
        ])
      );
    }

    const validationErrors = validateInput({ chalet_id, no_start });
    if (validationErrors.length > 0) {
      return res.status(400).json(ErrorResponse("Validation failed", validationErrors));
    }

    const chalet = await Chalet.findByPk(chalet_id);
    if (!chalet) {
      return res.status(404).json(
        ErrorResponse("Chalet not found", ["No Chalet found with the given ID"])
      );
    }

    const newStar = await number_stars.create({ chalet_id, no_start });

    
    await client.del(`chalets:${chalet_id}:stars`);

    res.status(201).json({
      message: "Number of Stars created successfully",
      star: newStar,
    });
  } catch (error) {
    console.error("Error in createNumberOfStars:", error.message);
    res.status(500).json(
      ErrorResponse("Failed to create number of stars", [
        "An internal server error occurred.",
      ])
    );
  }
};


exports.getNumberOfStarsbyChaletId = async (req, res) => {
  try {
    const { chalet_id } = req.params;

    const cacheKey = `chalets:${chalet_id}:stars`;

    
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const stars = await number_stars.findAll({
      where: { chalet_id },
    });

    if (!stars || stars.length === 0) {
      return res.status(404).json(
        ErrorResponse("Stars not found", [
          "No stars found for the given chalet",
        ])
      );
    }

    
    await client.setEx(cacheKey, 3600, JSON.stringify(stars));

    res.status(200).json(stars);
  } catch (error) {
    console.error("Error in getNumberOfStars:", error.message);
    res.status(500).json(
      ErrorResponse("Failed to fetch stars", [
        "An internal server error occurred.",
      ])
    );
  }
};


exports.getNumberOfStars = async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;  
  
      const offset = (page - 1) * limit;  
  
      
      const cacheKey = `stars:page:${page}:limit:${limit}`;
  
   
      client.del(cacheKey);
  
    
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }
  
      
      const stars = await number_stars.findAll({
        order: [['createdAt', 'DESC']],  
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
  
      if (stars.length === 0) {
        return res.status(404).json(
          ErrorResponse("Stars not found", [
            "No stars found"
          ])
        );
      }
  
     
      await client.setEx(cacheKey, 3600, JSON.stringify(stars));  
  
      
      res.status(200).json(stars);
    } catch (error) {
      console.error("Error in getNumberOfStars:", error.message);
      res.status(500).json(
        ErrorResponse("Failed to fetch stars", [
          "An internal server error occurred."
        ])
      );
    }
  };
  




  exports.getNumberOfStarsGreaterThanFour = async (req, res) => {
    try {
      const { page = 1, limit = 20, lang } = req.query;
  
      const offset = (page - 1) * limit;
  
      
      const cacheKey = `no_stars:page:${page}:limit:${limit}:lang:${lang}`;
  
      
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData)); 
           }
  
      
      const stars = await number_stars.findAll({
        where: {
          no_start: {
            [Sequelize.Op.gte]: 4, 
          },
          lang: lang, 
        },
        attributes: ['id', 'no_start', 'lang', 'createdAt'], 
        order: [['createdAt', 'DESC']], 
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
  
      if (stars.length === 0) {
        return res.status(404).json(
          ErrorResponse("Stars not found", [
            `No stars found with no_start >= 4 and lang: ${lang}`
          ])
        );
      }
  
      
      await client.setEx(cacheKey, 3600, JSON.stringify(stars));
  
      
      res.status(200).json(stars);
    } catch (error) {
      console.error("Error in getNumberOfStars:", error.message);
      res.status(500).json(
        ErrorResponse("Failed to fetch stars", [
          "An internal server error occurred."
        ])
      );
    }
  };
  
  


exports.getAverageStars = async (req, res) => {
  try {
    const { chalet_id } = req.params;  

    
    const stars = await number_stars.findAll({
      where: { chalet_id },  
    });

    if (stars.length === 0) {
      return res.status(404).json({ message: "No ratings found for this chalet" });
    }

    
    const totalStars = stars.reduce((acc, star) => acc + star.no_start, 0);  
    const averageStars = totalStars / stars.length;  

    
    res.status(200).json({
      chalet_id: chalet_id,
      averageStars: averageStars.toFixed(2), 
    });
  } catch (error) {
    console.error("Error in getAverageStars:", error);
    res.status(500).json({
      error: "Error calculating average stars",
    });
  }
};



exports.updateNumberOfStars = async (req, res) => {
  try {
    const { id } = req.params;
    const { no_start } = req.body;

    if (!no_start) {
      return res.status(400).json(
        ErrorResponse("Validation failed", ["no_start is required"])
      );
    }

    const validationErrors = validateInput({ no_start });
    if (validationErrors.length > 0) {
      return res.status(400).json(ErrorResponse("Validation failed", validationErrors));
    }

    const starEntry = await number_stars.findByPk(id);
    if (!starEntry) {
      return res.status(404).json(
        ErrorResponse("Star entry not found", ["No star entry found with the given ID"])
      );
    }

    await starEntry.update({ no_start });

    
    await client.del(`chalets:${starEntry.chalet_id}:stars`);

    res.status(200).json({
      message: "Number of Stars updated successfully",
      starEntry,
    });
  } catch (error) {
    console.error("Error in updateNumberOfStars:", error.message);
    res.status(500).json(
      ErrorResponse("Failed to update number of stars", [
        "An internal server error occurred.",
      ])
    );
  }
};


exports.deleteNumberOfStars = async (req, res) => {
  try {
    const { id } = req.params;

    const starEntry = await number_stars.findByPk(id);
    if (!starEntry) {
      return res.status(404).json(
        ErrorResponse("Star entry not found", ["No star entry found with the given ID"])
      );
    }

    const chaletId = starEntry.chalet_id;

    await starEntry.destroy();

    
    await client.del(`chalets:${chaletId}:stars`);

    res.status(200).json({
      message: "Number of Stars deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteNumberOfStars:", error.message);
    res.status(500).json(
      ErrorResponse("Failed to delete number of stars", [
        "An internal server error occurred.",
      ])
    );
  }
};
