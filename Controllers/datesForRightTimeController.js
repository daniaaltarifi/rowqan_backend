const NewModel = require('../Models/DatesForRightTime');
const { validateInput, ErrorResponse } = require('../Utils/validateInput');
const { client } = require("../Utils/redisClient");

exports.createNewDate = async (req, res) => {
  try {
    const { date, price, right_time_id } = req.body || {};

    if (!date || !price || !right_time_id) {
      return res.status(400).json(ErrorResponse("Validation failed", ["All Fields are required"]));
    }

    const validationErrors = validateInput({ date, price, right_time_id });
    if (validationErrors.length > 0) {
      return res.status(400).json(ErrorResponse("Validation failed", validationErrors));
    }

    const newModel = await NewModel.create({ date, price, right_time_id });
    await client.set(`newmodel:${newModel.id}`, JSON.stringify(newModel), { EX: 3600 });

    res.status(201).json({ message: "NewModel created successfully", newModel });
  } catch (error) {
    console.error("Error in createNewModel:", error.message);
    res.status(500).json(ErrorResponse("Failed to create NewModel", ["An internal server error occurred."]));
  }
};

exports.getAlldatesForRightTime = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const cacheKey = `newmodel:page:${page}:limit:${limit}`;

    client.del(cacheKey);
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const newModels = await NewModel.findAll({
      attributes: ["id", "date", "price", "right_time_id"],
      order: [["id", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    await client.setEx(cacheKey, 3600, JSON.stringify(newModels));
    res.status(200).json(newModels);
  } catch (error) {
    console.error("Error in getNewModels:", error.message);
    res.status(500).json(ErrorResponse("Failed to fetch NewModels", ["An internal server error occurred."]));
  }
};

exports.getDateForRightTimeById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `newmodel:${id}`;

    client.del(cacheKey);
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const newModel = await NewModel.findOne({
      attributes: ["id", "date", "price", "right_time_id"],
      where: { id },
    });

    if (!newModel) {
      return res.status(404).json(ErrorResponse("NewModel not found", ["No entry found with the given ID."]));
    }

    await client.setEx(cacheKey, 3600, JSON.stringify(newModel));
    res.status(200).json(newModel);
  } catch (error) {
    console.error("Error in getNewModelById:", error);
    res.status(500).json(ErrorResponse("Failed to fetch NewModel", ["An internal server error occurred."]));
  }
};

exports.updatedateRightTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, price, right_time_id } = req.body;

    const validationErrors = validateInput({ date, price, right_time_id });
    if (validationErrors.length > 0) {
      return res.status(400).json(ErrorResponse("Validation failed", validationErrors));
    }

    const newModel = await NewModel.findByPk(id);
    if (!newModel) {
      return res.status(404).json(ErrorResponse("NewModel not found", ["No entry found with the given ID."]));
    }

    const updatedFields = {};
    if (date) updatedFields.date = date;
    if (price) updatedFields.price = price;
    if (right_time_id) updatedFields.right_time_id = right_time_id;

    await newModel.update(updatedFields);
    await client.setEx(`newmodel:${id}`, 3600, JSON.stringify(newModel));

    res.status(200).json({ message: "NewModel updated successfully", newModel });
  } catch (error) {
    console.error("Error in updateNewModel:", error);
    res.status(500).json(ErrorResponse("Failed to update NewModel", ["An internal server error occurred."]));
  }
};


exports.deleteNewModel = async (req, res) => {
  try {
    const { id } = req.params;

    const newModel = await NewModel.findOne({ where: { id } });
    if (!newModel) {
      return res.status(404).json(ErrorResponse("NewModel not found", ["No entry found with the given ID."]));
    }

    await client.del(`newmodel:${id}`);
    await newModel.destroy();

    res.status(200).json({ message: "NewModel deleted successfully" });
  } catch (error) {
    console.error("Error in deleteNewModel:", error);
    res.status(500).json(ErrorResponse("Failed to delete NewModel", ["An internal server error occurred."]));
  }
};
