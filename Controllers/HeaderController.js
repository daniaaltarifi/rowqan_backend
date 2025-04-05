const Header = require('../Models/HeaderModel');
const { validateInput, ErrorResponse } = require('../Utils/validateInput');
const {client} = require('../Utils/redisClient')

exports.createHeader = async (req, res) => {
    try {
      const { header_name, lang, url } = req.body;
   
      if (!['ar', 'en'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid language' });
      }
  
      const newheader = await Header.create({
        header_name,
        lang,
        url
      });
  
      res.status(201).json( newheader );
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create Header' });
    }
  };
  

exports.getAllHeaders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const cacheKey = `headers:page:${page}:limit:${limit}`;
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const headers = await Header.findAll({
      attributes: ["id", "header_name"],
      order: [['id']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    if (headers.length === 0) {
      return res.status(404).json(ErrorResponse('No headers found'));
    }

  
    const plainHeaders = headers.map(header => ({
      id: header.id,
      header_name: header.header_name
    }));

    await client.setEx(cacheKey, 3600, JSON.stringify(plainHeaders));

    res.json(plainHeaders);
  } catch (error) {
    console.error('Error retrieving headers:', error);
    res.status(500).json(ErrorResponse('Failed to retrieve headers'));
  }
};
  


  exports.getHeaderById = async (req, res) => {
    try {
      const { id } = req.params;
  
  client.del(`header:${id}`)
      const cacheKey = `header:${id}`;
  
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log("Cache hit for header:", id);
        return res.status(200).json(
           JSON.parse(cachedData),
        );
      }
      console.log("Cache miss for header:", id);
  

      const header = await Header.findOne({
        where: { id },
      });
  
      if (!header) {
        return res.status(404).json(ErrorResponse('Header not found'));
      }
  
  
      await client.setEx(cacheKey, 3600, JSON.stringify(header));
  
      res.status(200).json(header);
    } catch (error) {
      console.error('Error retrieving header:', error);
      res.status(500).json(ErrorResponse('Failed to retrieve header'));
    }
  };
  

exports.updateHeader = async (req, res) => {
    try {
      const { id } = req.params;
      const { header_name, lang, url } = req.body;
  
      const header = await Header.findOne({
        where: { id }
      });
  
      if (!header) {
        return res.status(404).json({ error: 'Header not found' });
      }
  
   
      header.header_name = header_name || header.header_name;  
      header.lang = lang || header.lang; 
      header.url = url || header.url; 

    await header.save();

    res.status(200).json( header );
  } catch (error) {
    console.error('Error updating header:', error);
    res.status(500).json(ErrorResponse('Failed to update header'));
  }
};


exports.deleteHeader = async (req, res) => {
  try {
    const { id, lang } = req.params;

    if (!id || !lang) {
      return res.status(400).json(ErrorResponse('ID and language are required'));
    }

    const [header, _] = await Promise.all([
      Header.findOne({ where: { id, lang } }),
      client.del(`header:${id}:lang:${lang}`), 
    ]);

    if (!header) {
      return res.status(404).json(
        ErrorResponse('Header not found', ['No Header entry found with the given ID and language'])
      );
    }

    await header.destroy();

    return res.status(200).json({ message: 'Header deleted successfully' });
  } catch (error) {
    console.error('Error deleting header:', error);
    res.status(500).json(ErrorResponse('Failed to delete header'));
  }
};

