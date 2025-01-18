const FeaturesChalet = require("../Models/FeaturesChalet");
const { client } = require("../Utils/redisClient");
const { validateInput, ErrorResponse } = require("../Utils/validateInput");

exports.createFeature = async (req, res) => {
  try {
    const { FeatureName,lang } = req.body || {};
 
    if (!FeatureName  || !lang) {
      return res
        .status(400)
        .json(
          ErrorResponse("Validation failed", [
            "All Fields are required",
          ])
        );
    }


    const validationErrors = validateInput({ FeatureName,lang });
    if (validationErrors.length > 0) {
      return res
        .status(400)
        .json(ErrorResponse("Validation failed", validationErrors));
    }

    const newFeaturePromise = FeaturesChalet.create({ FeatureName,lang});

    const cacheDeletePromises = [client.del(`feature:page:1:limit:20`)];

    const [newFeature] = await Promise.all([
      newFeaturePromise,
      ...cacheDeletePromises,
    ]);

    await client.set(`feature:${newFeature.id}`, JSON.stringify(newFeature), {
      EX: 3600,
    });

    res.status(201).json({
      message: "Feature  created successfully",
      feature: newFeature,
    });
  } catch (error) {
    console.error("Error in create feature:", error.message);
    res
      .status(500)
      .json(
        ErrorResponse("Failed to create Feature", [
          "An internal server error occurred.",
        ])
      );
  }
};






exports.getFeatures = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const {lang} = req.params
    const offset = (page - 1) * limit;

    
    const cacheKey = `feature:page:${page}:limit:${limit}:lang:${lang || 'all'}`;

   
    client.del(cacheKey);

    
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    
    const whereCondition = lang ? { lang } : {};

    const featureEntries = await FeaturesChalet.findAll({
      attributes: ["id", "FeatureName", "lang"],
      where: whereCondition, 
      order: [["id", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    
    await client.setEx(cacheKey, 3600, JSON.stringify(featureEntries));

    res.status(200).json(featureEntries);
  } catch (error) {
    console.error("Error in get Features:", error.message);
    res
      .status(500)
      .json(
        ErrorResponse("Failed to fetch feature entries", [
          "An internal server error occurred.",
        ])
      );
  }
};





exports.getFeatureById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `features:${id}`;

    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const feature = await FeaturesChalet.findOne({
      attributes: ["id", "FeatureName", "lang"],
      where: { id },
    });

    if (!feature) {
      return res
        .status(404)
        .json(
          ErrorResponse("Feature not found", [
            "No feature found with the given ID.",
          ])
        );
    }
    
    await client.setEx(cacheKey, 3600, JSON.stringify(feature));

    return res.status(200).json(feature);
  } catch (error) {
    console.error("Error in getFeatureById:", error.message);
    return res
      .status(500)
      .json(
        ErrorResponse("Failed to fetch feature", [
          "An internal server error occurred.",
        ])
      );
  }
};

exports.updateFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { FeatureName, lang } = req.body;

    const validationErrors = validateInput({ FeatureName, lang });
    if (validationErrors.length > 0) {
      return res
        .status(400)
        .json(ErrorResponse("Validation failed", validationErrors));
    }

    const feature = await FeaturesChalet.findByPk(id);
    if (!feature) {
      return res
        .status(404)
        .json(
          ErrorResponse("Feature not found", [
            "No feature found with the given ID.",
          ])
        );
    }

    const updatedFields = {};
    if (FeatureName && FeatureName !== feature.FeatureName)
      updatedFields.FeatureName = FeatureName;
    if (lang && lang !== feature.lang) updatedFields.lang = lang;

    if (Object.keys(updatedFields).length > 0) {
      await feature.update(updatedFields);
    }

    const updatedData = feature.toJSON();

   
    const cacheKey = `features:${id}`;
    await client.del(cacheKey);
    await client.setEx(cacheKey, 3600, JSON.stringify(updatedData)); 

    res.status(200).json({
      message: "Feature updated successfully",
      feature: updatedData,
    });
  } catch (error) {
    console.error("Error in updateFeature:", error.message);
    return res
      .status(500)
      .json(
        ErrorResponse("Failed to update feature", [
          "An internal server error occurred.",
        ])
      );
  }
};






exports.deleteFeature = async (req, res) => {
  try {
    const { id } = req.params;

    const feature = await FeaturesChalet.findByPk(id);
    if (!feature) {
      return res.status(404).json(
        ErrorResponse("Feature not found", [
          "No feature found with the given ID.",
        ])
      );
    }

    await feature.destroy(); 

  
    await client.del(`features:${id}`);
    await client.del(`features:all`); 

    return res.status(200).json({ message: "Feature deleted successfully" });
  } catch (error) {
    console.error("Error in deleteFeature:", error.message);
    return res.status(500).json(
      ErrorResponse("Failed to delete feature", [
        "An internal server error occurred.",
      ])
    );
  }
};


