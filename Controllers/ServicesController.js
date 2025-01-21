const { validateInput, ErrorResponse } = require('../Utils/validateInput');
const Services = require('../Models/ServicesModel');
const path = require('path');
const {client} = require('../Utils/redisClient')

exports.createService = async (req, res) => {
  try {
    const { title, status_service, url, lang } = req.body || {};
    const image = req.file?.filename || null;

    
    if (!title || !status_service || !url || !lang || !image) {
      return res
        .status(400)
        .json(
          ErrorResponse("Validation failed", [
            "All Fields are required",
          ])
        );
    }

    const validationErrors = validateInput({ title, status_service, url, lang });
    if (validationErrors.length > 0) {
      return res
        .status(400)
        .json(ErrorResponse("Validation failed", validationErrors));
    }

   
    const newService = await Services.create({
      title,
      status_service,
      url,
      lang,
      image,
    });

    
    const cacheDeletePromises = [client.del(`services1:lang:${lang}:page:1:limit:20`)];
    
    
    
    await Promise.all(cacheDeletePromises);

    
    await client.set(`services1:${newService.id}`, JSON.stringify(newService), {
      EX: 3600,
    });

   
    res.status(201).json({
      message: "Service created successfully",
      service: newService,
    });
  } catch (error) {
    console.error("Error in createService:", error.message);
    res
      .status(500)
      .json(
        ErrorResponse("Failed to create service", [
          "An internal server error occurred.",
        ])
      );
  }
};


exports.getAllServices = async (req, res) => {
  try {
    const { lang } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!['en', 'ar'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid language' });
    }

    const cacheKey = `services1:lang:${lang}:page:${page}:limit:${limit}`;
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
     
      return res.status(200).json(
        JSON.parse(cachedData),
      );
    }

   

    const services = await Services.findAll({
      where: { lang },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["id", "DESC"]],
    });

    if (!services.length) {
      return res.status(404).json({ error: 'No services found for this language' });
    }

 
    await client.setEx(cacheKey, 3600, JSON.stringify(services));

    res.status(200).json(services);
  } catch (error) {
    console.error("Error in getAllServices:", error.message);
    res.status(500).json({
      error: "Failed to retrieve services",
      details: ["An internal server error occurred."],
    });
  }
};




exports.getServiceByStatus = async (req, res) => {
  try {
    const { status_service, lang } = req.params;

    
    if (!status_service || !lang) {
      return res.status(400).json({
        error: 'Both "status_service" and "lang" are required.',
      });
    }

    
    const cacheKey = `services1:status:${status_service}:lang:${lang}`;

    
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }
    
    const services = await Services.findAll({
      where: {
        lang,
        status_service,
      },
      attributes: [
        "id",
        "title",
        "image",
        "status_service",
        "url",
      ], 
      order: [["id", "DESC"]],
    });

   
    if (!services.length) {
      return res.status(404).json({
        error: `No services found for language: ${lang} and status: ${status_service}.`,
      });
    }

    
    await client.setEx(cacheKey, 3600, JSON.stringify(services));

    return res.status(200).json(services);
  } catch (error) {
    console.error("Error in getServiceByStatus:", error.message);
    return res.status(500).json({
      error: "Failed to retrieve services.",
      details: ["An internal server error occurred."],
    });
  }
};





exports.getServiceByStatusOnlyLang = async (req, res) => {
  try {
    const { lang } = req.params;

    if (!["en", "ar"].includes(lang)) {
      return res.status(400).json({ error: "Invalid language" });
    }

    
    const cacheKey = `services1:lang:${lang}`;

    
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }


    
    const services = await Services.findAll({
      where: { lang },
      attributes: [
        "id",
        "name",
        "description",
        "price",
        "image",
        "rating",
        "created_at",
      ], 
      order: [["id", "DESC"]], 
        });

    
    if (!services.length) {
      return res
        .status(404)
        .json({ error: "No services found for this language" });
    }

    
    await client.setEx(cacheKey, 3600, JSON.stringify(services));

    return res.status(200).json(services);
  } catch (error) {
    console.error("Error in getServiceByStatusOnlyLang:", error.message);
    return res.status(500).json({
      error: "Failed to retrieve services",
      details: ["An internal server error occurred."],
    });
  }
};




exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status_service, url, lang } = req.body;
    const image = req.file ? req.file.filename : null;

    const service = await Services.findOne({ where: { id } });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const validationErrors = validateInput({ title, status_service, url, lang });
    if (validationErrors) {
      return res.status(400).json({ error: validationErrors });
    }

    service.title = title || service.title;
    service.status_service = status_service || service.status_service;
    service.url = url || service.url;
    service.lang = lang || service.lang;
    service.image = image || service.image;

    await service.save();

    res.status(200).json({ message: 'Service updated successfully', service });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update service' });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const { id, lang } = req.params;

    if (!['en', 'ar'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid language' });
    }

    const cacheKey = `services1:${id}:lang:${lang}`;

   
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(
        JSON.parse(cachedData)
      );
    }

    
    const service = await Services.findOne({
      where: { id, lang }
    });

    if (!service) {
      return res.status(404).json({
        error: `Service with id ${id} and language ${lang} not found`
      });
    }

    
    await client.setEx(cacheKey, 3600, JSON.stringify(service));

    res.status(200).json(
      service
    );
  } catch (error) {
    console.error("Error in getServiceById:", error.message);
    res.status(500).json({
      error: "Failed to fetch service",
      details: ["An internal server error occurred."]
    });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const { id, lang } = req.params;

    if (!['en', 'ar'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid language' });
    }

    
    const service = await Services.findByPk(id);

    if (!service) {
      return res.status(404).json({
        error: "Service not found",
        details: ["No service found with the given ID and language."]
      });
    }

    
    await client.del(`services1:${id}:lang:${lang}`);

  
    await service.destroy();

    return res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error in deleteService:", error);

    return res.status(500).json({
      error: "Failed to delete service",
      details: ["An internal server error occurred. Please try again later."]
    });
  }
};

