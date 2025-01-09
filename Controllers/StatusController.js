const Status = require('../Models/StatusModel');
const { validateInput, ErrorResponse } = require('../Utils/validateInput');

const {client} = require('../Utils/redisClient')


exports.createStatus = async (req, res) => {
  try {
    const { status, lang } = req.body || {};

    if (!status || !lang) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation failed",
          errors: ["Status and language are required"],
        });
    }

   
    const validationErrors = validateInput({ status, lang });
    if (validationErrors.length > 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        });
    }

   
    const existingStatus = await Status.findOne({ where: { status, lang } });
    if (existingStatus) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation failed",
          errors: ["Status with the same name and language already exists"],
        });
    }

   
    const newStatus = await Status.create({ status, lang });

   
    return res.status(201).json({
      success: true,
      message: "Status created successfully",
      data: newStatus,
    });
  } catch (error) {
    console.error("Error in createStatus:", error.message);

   
    return res.status(500).json({
      success: false,
      message: "Failed to create Status",
      errors: ["An internal server error occurred."],
    });
  }
};



exports.getAllStatuses = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

  
    client.del(`statuses:page:${page}:limit:${limit}:lang:${req.params.lang}`);

   
    const cacheKey = `statuses:page:${page}:limit:${limit}:lang:${req.params.lang}`;
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    
    const whereCondition = req.params.lang ? { lang: req.params.lang } : {};

    
    const statuses = await Status.findAll({
      attributes: ["id", "status","lang"],
      where: whereCondition,
      order: [["id", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    
    if (!statuses.length) {
      return res.status(404).json({
        success: false,
        message: 'No statuses found for this language',
        data: null,
      });
    }

    
    await client.setEx(cacheKey, 3600, JSON.stringify(statuses));

    
    return res.status(200).json(statuses);
  } catch (error) {
    console.error("Error in getAllStatuses:", error.message);

    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve statuses',
      data: null,
      error: 'An internal server error occurred. Please try again later.',
    });
  }
};







exports.getStatusById = async (req, res) => {
  try {
    const { id,lang } = req.params;

    if (!['en', 'ar'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid language' });
    }

   client.del(`status:${id}:lang:${lang}`)
    const cacheKey = `status:${id}:lang:${lang}`;
    const cachedData = await client.get(cacheKey);

   
    if (cachedData) {
      console.log("Cache hit for status:", id);
      return res.status(200).json(
        JSON.parse(cachedData)
      );
    }
    console.log("Cache miss for status:", id);

   
    const status = await Status.findOne({
      where: { id, lang }
    });

    if (!status) {
      return res.status(404).json({
        error: 'Status not found for the specified language'
      });
    }

   
    await client.setEx(cacheKey, 3600, JSON.stringify(status));

    res.status(200).json(status);
  } catch (error) {
    console.error("Error in getStatusById:", error);

    res.status(500).json({
      error: 'Failed to fetch Status',
      message: "An internal server error occurred. Please try again later."
    });
  }
};



exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, lang } = req.body;

   
    const validationErrors = validateInput({ status, lang });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

   
    const statusRecord = await Status.findByPk(id);
    if (!statusRecord) {
      return res.status(404).json({
        success: false,
        message: "Status not found",
        errors: [`No status entry found with ID: ${id}`],
      });
    }

   
    const updatedFields = {};
    if (status && status !== statusRecord.status) updatedFields.status = status;
    if (lang && lang !== statusRecord.lang) updatedFields.lang = lang;

   
    if (Object.keys(updatedFields).length > 0) {
      await statusRecord.update(updatedFields);
    }

   
    return res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: statusRecord.toJSON(),
    });
  } catch (error) {
    console.error("Error in updateStatus:", error);

   
    return res.status(500).json({
      success: false,
      message: "Failed to update Status",
      errors: ["An internal server error occurred. Please try again later."],
    });
  }
};



exports.deleteStatus = async (req, res) => {
  try {
    const { id,lang } = req.params;
   
    const [status, _] = await Promise.all([
      Status.findOne({ where: { id, lang } }),
      client.del(`status:${id}:lang:${lang}`),
    ]);

    if (!status) {
      return res.status(404).json({
        error: 'Status not found for the specified language',
      });
    }
   
    await status.destroy();
   
    return res.status(200).json({
      message: 'Status deleted successfully',
    });
  } catch (error) {
    console.error("Error in deleteStatus:", error);

    return res.status(500).json({
      error: 'Failed to delete Status',
      message: "An internal server error occurred. Please try again later.",
    });
  }
};
