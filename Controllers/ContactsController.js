const Contacts = require('../Models/Conatcts');
const { validateInput, ErrorResponse } = require('../Utils/validateInput');
const { client } = require("../Utils/redisClient");


exports.createContact = async (req, res) => {
    try {
      const { title, action, lang } = req.body || {};
      const image = req.file?.filename || null;
  
   
  

      if (!title || !action || !lang || !image) {
        return res.status(400).json(
          ErrorResponse("Validation failed", ["All fields are required"])
        );
      }
  

      const inputErrors = validateInput({ title, action, lang });
      if (inputErrors.length > 0) {
        console.log("Validation errors:", inputErrors);
        return res.status(400).json(
          JSON.parse(JSON.stringify(ErrorResponse("Validation failed", inputErrors)))
        );
      }

      if (!["en", "ar"].includes(lang)) {
        return res.status(400).json(
          JSON.parse(JSON.stringify(ErrorResponse("Validation failed", ["Invalid language. Supported: en, ar"])))
        );
      }
  
    
 
      const newContact = await Contacts.create({
        title,
        action,
        lang,
        image,
      });
  
      console.log("New contact created:", newContact); 
  
   
      return res.status(201).json({
        message: "Contact created successfully",
        contact: newContact,
      });
    } catch (error) {
      console.error("Error in createContact:", error);
  
   
      return res.status(500).json(
        JSON.parse(JSON.stringify(ErrorResponse("Failed to create Contact", ["An internal server error occurred"])))
      );
    }
  };
  
  
  







exports.getContacts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { lang } = req.params;
    const offset = (page - 1) * limit;

    const cacheKey = `contacts:page:${page}:limit:${limit}:lang:${lang || 'all'}`;


    client.del(cacheKey);


    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const whereCondition = lang ? { lang } : {};

    const contacts = await Contacts.findAll({
      attributes: ["id", "title", "action", "lang", "image"],
      where: whereCondition,
      order: [["id", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });


    await client.setEx(cacheKey, 3600, JSON.stringify(contacts));

    res.status(200).json(contacts);
  } catch (error) {
    console.error("Error in getContacts:", error.message);
    res.status(500).json(
      ErrorResponse("Failed to fetch Contacts", ["An internal server error occurred."])
    );
  }
};


exports.getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;

    const cacheKey = `contacts:${id}:lang:${lang || 'all'}`;


    client.del(cacheKey);


    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const whereCondition = lang ? { id, lang } : { id };

    const contact = await Contacts.findOne({
      attributes: ["id", "title", "action", "lang", "image"],
      where: whereCondition,
    });

    if (!contact) {
      return res.status(404).json(
        ErrorResponse("Contact not found", ["No contact found with the given ID and language."])
      );
    }


    await client.setEx(cacheKey, 3600, JSON.stringify(contact));

    return res.status(200).json(contact);
  } catch (error) {
    console.error("Error in getContactById:", error);
    return res.status(500).json(
      ErrorResponse("Failed to fetch Contact", ["An internal server error occurred. Please try again later."])
    );
  }
};


exports.updateContact = async (req, res) => {
    try {
      const { id } = req.params;
      const { title, action, lang } = req.body;
      const image = req.file?.filename || null;
  
      console.log("Request body:", req.body);  
  
     
      const validationErrors = validateInput({ title, action, lang });
      if (validationErrors.length > 0) {
        return res.status(400).json(
          ErrorResponse("Validation failed", validationErrors)
        );
      }
  
      
      const contact = await Contacts.findByPk(id);
      if (!contact) {
        return res.status(404).json(
          ErrorResponse("Contact not found", ["No contact found with the given ID."])
        );
      }
  
     
      const updatedFields = {};
  
     
      console.log(`Old Action: ${contact.action}, New Action: ${action}`);
  
      
      if (action && action !== contact.action) {
        updatedFields.action = action;
      }
  
      if (title && title !== contact.title) updatedFields.title = title;
      if (lang && lang !== contact.lang) updatedFields.lang = lang;
      if (image) updatedFields.image = image;
  
     
      if (Object.keys(updatedFields).length > 0) {
        await contact.update(updatedFields);
      }
  
      
      const updatedData = contact.toJSON();
  
     
      const cacheKey = `contacts:${id}`;
      await client.setEx(cacheKey, 3600, JSON.stringify(updatedData));
  
    
      return res.status(200).json({
        message: "Contact updated successfully",
        contact: updatedData,
      });
    } catch (error) {
      console.error("Error in updateContact:", error);
      return res.status(500).json(
        ErrorResponse("Failed to update Contact", ["An internal server error occurred. Please try again later."])
      );
    }
  };
  
  

exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;

    const whereCondition = lang ? { id, lang } : { id };

    const contact = await Contacts.findOne({ where: whereCondition });

    if (!contact) {
      return res.status(404).json(
        ErrorResponse("Contact not found", ["No contact found with the given ID and language."])
      );
    }

    
    const cacheKey = `contacts:${id}:lang:${lang || 'all'}`;
    await client.del(cacheKey);

    await contact.destroy();

    return res.status(200).json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Error in deleteContact:", error);
    return res.status(500).json(
      ErrorResponse("Failed to delete Contact", ["An internal server error occurred. Please try again later."])
    );
  }
};
