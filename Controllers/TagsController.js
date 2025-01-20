const Tags = require('../Models/TagsModel');
const { validateInput, ErrorResponse } = require('../Utils/validateInput');
const { client } = require('../Utils/redisClient');
const Chalets = require('../Models/ChaletsModel')


exports.createTag = async (req, res) => {
  try {
    const { TagName, lang } = req.body;


    const image = req.file?.filename || null;
    if (!TagName || !lang|| !image) {
      return res.status(400).json(
        ErrorResponse('Validation failed', ['TagName and lang and image are required'])
      );
    }

    const validationErrors = validateInput({ TagName, lang });
    if (validationErrors.length > 0) {
      return res.status(400).json(ErrorResponse('Validation failed', validationErrors));
    }

    const newTag = await Tags.create({ TagName, lang,image });
    await client.setEx(`tag:${newTag.id}`, 3600, JSON.stringify(newTag));

    res.status(201).json({
      message: 'Tag created successfully',
      tag: newTag,
    });
  } catch (error) {
    console.error('Error in createTag:', error);
    res.status(500).json(ErrorResponse('Failed to create tag', ['Internal server error']));
  }
};



exports.createTagAndProperty = async (req, res) => {
  try {
    const { Chalet_Id, title, lang } = req.body || {};

    if (!Chalet_Id || !title || !lang) {
      return res
        .status(400)
        .json(
          ErrorResponse("Validation failed", [
            "Chalet_Id, title, and lang are required",
          ])
        );
    }

    if (!["en", "ar"].includes(lang)) {
      return res
        .status(400)
        .json(
          ErrorResponse(
            'Invalid or missing language, it should be "en" or "ar"'
          )
        );
    }

    const chalet = await Chalets.findByPk(Chalet_Id);
    if (!chalet) {
      return res.status(404).json(ErrorResponse("Chalet not found"));
    }

    const image = req.file?.filename || null;

    const newChaletProp = await ChaletProps.create({
      Chalet_Id,
      title,
      lang,
      image,
    });

    const cacheDeletePromises = [
      client.del(`chaletProps:${Chalet_Id}:page:1:limit:20`),
    ];
    await Promise.all(cacheDeletePromises);

    await client.set(
      `chaletProp:${newChaletProp.id}`,
      JSON.stringify(newChaletProp),
      {
        EX: 3600,
      }
    );

    res.status(201).json(newChaletProp);
  } catch (error) {
    console.error("Error in createChaletProp:", error);
    res.status(500).json(ErrorResponse("Error creating property"));
  }
};



exports.getTags = async (req, res) => {
  try {
    const { page = 1, limit = 20, lang } = req.query;
    const offset = (page - 1) * limit;

    const cacheKey = `tags:page:${page}:limit:${limit}:lang:${lang || 'all'}`;
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const whereCondition = lang ? { lang } : {};
    const tags = await Tags.findAll({
      where: whereCondition,
      order: [['id', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    await client.setEx(cacheKey, 3600, JSON.stringify(tags));

    res.status(200).json(tags);
  } catch (error) {
    console.error('Error in getTags:', error);
    res.status(500).json(ErrorResponse('Failed to fetch tags', ['Internal server error']));
  }
};


exports.getTagById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `tag:${id}`;

    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const tag = await Tags.findByPk(id);
    if (!tag) {
      return res.status(404).json(
        ErrorResponse('Tag not found', ['No tag found with the given ID'])
      );
    }

    await client.setEx(cacheKey, 3600, JSON.stringify(tag));
    res.status(200).json(tag);
  } catch (error) {
    console.error('Error in getTagById:', error);
    res.status(500).json(ErrorResponse('Failed to fetch tag', ['Internal server error']));
  }
};


exports.updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { TagName, lang } = req.body;

    const tag = await Tags.findByPk(id);
    if (!tag) {
      return res.status(404).json(
        ErrorResponse('Tag not found', ['No tag found with the given ID'])
      );
    }

    const updatedFields = {};
    if (TagName && TagName !== tag.TagName) updatedFields.TagName = TagName;
    if (lang && lang !== tag.lang) updatedFields.lang = lang;

    if (Object.keys(updatedFields).length > 0) {
      await tag.update(updatedFields);
    }

    await client.setEx(`tag:${id}`, 3600, JSON.stringify(tag));
    res.status(200).json({
      message: 'Tag updated successfully',
      tag,
    });
  } catch (error) {
    console.error('Error in updateTag:', error);
    res.status(500).json(ErrorResponse('Failed to update tag', ['Internal server error']));
  }
};


exports.deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    const tag = await Tags.findByPk(id);
    if (!tag) {
      return res.status(404).json(
        ErrorResponse('Tag not found', ['No tag found with the given ID'])
      );
    }

    await tag.destroy();
    await client.del(`tag:${id}`);

    res.status(200).json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error in deleteTag:', error);
    res.status(500).json(ErrorResponse('Failed to delete tag', ['Internal server error']));
  }
};
