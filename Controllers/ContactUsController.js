const ContactUs = require("../Models/ContactUs");
const { validateInput, ErrorResponse } = require("../Utils/validateInput");
const { client } = require("../Utils/redisClient");

exports.createContactUs = async (req, res) => {
  try {
    const {
      First_Name,
      Last_Name,
      EmailAddress,
      Phone_Number,
      Address,
      Messages,
      lang
    } = req.body || {};

    if (
      !First_Name ||
      !Last_Name ||
      !EmailAddress ||
      !Phone_Number ||
      !Address ||
      !Messages||
      !lang
    ) {
      return res
        .status(400)
        .json(
          ErrorResponse("Validation failed", [
            "All Fields Are Required Please Trya Again!!",
          ])
        );
    }

    if (!["en", "ar"].includes(lang)) {
      return res
        .status(400)
        .json(ErrorResponse('Invalid language, must be "en" or "ar"'));
    }

    const newContactUs = await ContactUs.create({
      First_Name,
      Last_Name,
      EmailAddress,
      Phone_Number,
      Address,
      Messages,
      lang,
    });

    const cacheKey = `contactUs:${newContactUs.id}`;
    client.del(cacheKey);
    client.setEx(cacheKey, 3600, JSON.stringify(newContactUs));

    res.status(201).json(newContactUs);
  } catch (error) {
    console.error("Error in createContactUs:", error.message);
    res
      .status(500)
      .json(
        ErrorResponse("Failed to create ContactUs", [
          "An internal server error occurred.",
        ])
      );
  }
};




exports.updateContactUs = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      First_Name,
      Last_Name,
      EmailAddress,
      Phone_Number,
      Address,
      Message,
      lang
    } = req.body;

    const validationErrors = validateInput({
      First_Name,
      Last_Name,
      EmailAddress,
      Phone_Number,
      Address,
      Message,
      lang
    });
    if (validationErrors.length > 0) {
      return res
        .status(400)
        .json(ErrorResponse("Validation failed", validationErrors));
    }

    if (!["en", "ar"].includes(lang)) {
      return res
        .status(400)
        .json(ErrorResponse('Invalid language, must be "en" or "ar"'));
    }

    const contactUs = await ContactUs.findByPk(id);
    if (!contactUs) {
      return res.status(404).json(ErrorResponse("ContactUs not found"));
    }

    const updatedFields = {};
    if (First_Name && First_Name !== contactUs.First_Name)
      updatedFields.First_Name = First_Name;
    if (Last_Name && Last_Name !== contactUs.Last_Name)
      updatedFields.Last_Name = Last_Name;
    if (EmailAddress && EmailAddress !== contactUs.EmailAddress)
      updatedFields.EmailAddress = EmailAddress;
    if (Phone_Number && Phone_Number !== contactUs.Phone_Number)
      updatedFields.Phone_Number = Phone_Number;
    if (Address && Address !== contactUs.Address)
      updatedFields.Address = Address;
    if (Message && Message !== contactUs.Message)
      updatedFields.Message = Message;

    if (Object.keys(updatedFields).length > 0) {
      await contactUs.update(updatedFields);
    }

    const updatedData = contactUs.toJSON();
    const cacheKey = `contactUs:${id}`;
    await client.setEx(cacheKey, 3600, JSON.stringify(updatedData));

    return res.status(200).json(updatedData);
  } catch (error) {
    console.error("Error in updateContactUs:", error);
    return res
      .status(500)
      .json(
        ErrorResponse("Failed to update ContactUs", [
          "An internal server error occurred. Please try again later.",
        ])
      );
  }
};

exports.getContactUsById = async (req, res) => {
  try {
    const { id } = req.params;

    const cacheKey = `contactUs:${id}`;

    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for contactUs:", id);
      return res.status(200).json(JSON.parse(cachedData));
    }
    console.log("Cache miss for contactUs:", id);

    const contactUs = await ContactUs.findOne({
      attributes: ["id", "title", "action", "lang", "image"],
      where: { id },
    });

    if (!contactUs) {
      return res.status(404).json(ErrorResponse("ContactUs entry not found"));
    }

    await client.setEx(cacheKey, 3600, JSON.stringify(contactUs));

    return res.status(200).json(contactUs);
  } catch (error) {
    console.error(error);
    res.status(500).json(ErrorResponse("Failed to retrieve ContactUs"));
  }
};

exports.getALLContactUs = async (req, res) => {
  try {
    const { lang } = req.params;

    if (!["en", "ar"].includes(lang)) {
      return res
        .status(400)
        .json(ErrorResponse('Invalid language, must be "en" or "ar"'));
    }
    client.del(`contactUs:lang:${lang}`);
    const cacheKey = `contactUs:lang:${lang}`;
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const contactUs = await ContactUs.findAll({
      where: { lang },
      attributes: ["id", "First_Name", "Last_name", "EmailAddress", "Phone_Number","Address","Messages"],
    });

    if (contactUs.length === 0) {
      return res
        .status(404)
        .json(ErrorResponse("No ContactUs found for the specified language"));
    }

    await client.setEx(cacheKey, 3600, JSON.stringify(contactUs));

    res.status(200).json(contactUs);
  } catch (error) {
    console.error(error);
    res.status(500).json(ErrorResponse("Failed to retrieve ContactUs"));
  }
};

exports.deleteContactUs = async (req, res) => {
  try {
    const { id, lang } = req.params;

    if (!["en", "ar"].includes(lang)) {
      return res
        .status(400)
        .json(ErrorResponse('Invalid language, must be "en" or "ar"'));
    }

    const [contactUs, _] = await Promise.all([
      ContactUs.findOne({
        where: {
          id,
          lang,
        },
      }),
      client.del(`contactUs:${id}`),
    ]);

    if (!contactUs) {
      return res
        .status(404)
        .json(
          ErrorResponse("ContactUs entry not found", [
            "No ContactUs entry found with the given ID and language.",
          ])
        );
    }

    await contactUs.destroy();

    return res
      .status(200)
      .json({ message: "ContactUs entry deleted successfully" });
  } catch (error) {
    console.error("Error in deleteContactUs:", error);

    return res
      .status(500)
      .json(
        ErrorResponse("Failed to delete ContactUs entry", [
          "An internal server error occurred. Please try again later.",
        ])
      );
  }
};
