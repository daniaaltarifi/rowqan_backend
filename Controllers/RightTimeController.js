const { validateInput, ErrorResponse } = require('../Utils/validateInput');
const RightTimeModel = require('../Models/RightTimeModel');
const Chalet = require('../Models/ChaletsModel');
const ReservationDate = require('../Models/ReservationDatesModel');
const {client} = require('../Utils/redisClient')

const Reservations_Chalets = require('../Models/Reservations_Chalets');

exports.createRightTime = async (req, res) => {

  try {
      
      const { 
          name, 
          type_of_time, 
          from_time, 
          to_time, 
          lang, 
          price, 
          After_Offer, 
          chalet_id 
      } = req.body || {};

      
      const image = req.file?.filename || null;

     
      if (!name || !type_of_time || !from_time || !to_time || !lang || !price || !chalet_id || !image) {
          return res.status(400).json(
              ErrorResponse("Validation failed", ["All Fields are required"])
          );
      }

    try {
        const { name, time, lang, chalet_id, price } = req.body;
        const image = req.file ? req.file.filename : null;

    
        const validationErrors = validateInput({ name, time, lang, chalet_id, price });
        if (validationErrors.length > 0) {
            return res.status(400).json(ErrorResponse('Validation failed', validationErrors));
        }

      
        if (!['en', 'ar'].includes(lang)) {
            return res.status(400).json(ErrorResponse('Invalid language'));
        }

     
        const chalet = await Chalet.findByPk(chalet_id);
        if (!chalet) {
            return res.status(404).json(ErrorResponse('Chalet not found'));
        }


     
      const validationErrors = validateInput({ 
          name, 
          type_of_time, 
          from_time, 
          to_time, 
          lang, 
          price, 
          After_Offer, 
          chalet_id 
      });

   
      if (validationErrors.length > 0) {
          return res.status(400).json(ErrorResponse("Validation failed", validationErrors));
      }

      
      if (!['en', 'ar'].includes(lang)) {
          return res.status(400).json(new ErrorResponse('Invalid language'));
      }

      
      const chalet = await Chalet.findByPk(chalet_id);
      if (!chalet) {
          return res.status(404).json(new ErrorResponse('Chalet not found'));
      }

      
      const newRightTime = await RightTimeModel.create({
          image, 
          name, 
          type_of_time, 
          from_time, 
          to_time, 
          lang, 
          price, 
          After_Offer, 
          chalet_id
      });

      
      const cacheDeletePromises = [client.del(`righttime:page:1:limit:20`)];
      
      const [newRightTimeResult] = await Promise.all([newRightTime, ...cacheDeletePromises]);

      
      await client.set(`righttime:${newRightTimeResult.id}`, JSON.stringify(newRightTimeResult), {
          EX: 3600,
      });

      
      return res.status(201).json({
          message: "RightTime created successfully",
          rightTime: newRightTimeResult,
      });
  } catch (error) {
      console.error("Error in createRightTime:", error.message);
      return res.status(500).json(
          ErrorResponse("Failed to create RightTime", [
              "An internal server error occurred.",
          ])
      );

  }

    } catch (error) {
        console.error(error);
        return res.status(500).json(ErrorResponse('Internal server error'));
    }

};


exports.getRightTimeById = async (req, res) => {
 
  try {
    const { id } = req.params;
    const { lang } = req.query;

    client.del(`rightTime:${id}:${lang || "all"}`)
    const cacheKey = `rightTime:${id}:${lang || "all"}`;

    
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    
    const whereCondition = lang ? { id, lang } : { id };

    
    const rightTimeEntry = await RightTimeModel.findOne({
      attributes: ["id", "type_of_time", "from_time","to_time","price","After_Offer","image"],
      where: whereCondition,
      include: [
        { model: Chalet, attributes: ["id", "title","description","image","Rating","city","area","intial_Amount"] },
      ],
    });

   
    if (!rightTimeEntry) {
      return res
        .status(404)
        .json(
          ErrorResponse(
            lang === "ar"
              ? "لم يتم العثور على الوقت المناسب"
              : "RightTime not found",
            ["No RightTime entry found with the given ID and language."]
          )
        );
    }

    
    await client.setEx(cacheKey, 3600, JSON.stringify(rightTimeEntry));

    
    return res.status(200).json(rightTimeEntry);
  } catch (error) {
    console.error("Error in getRightTimeById:", error);

    return res
      .status(500)
      .json(
        ErrorResponse("Failed to fetch RightTime entry", [
          "An internal server error occurred. Please try again later.",
        ])
      );
  }
};




  exports.getAllRightTimesByChaletId = async (req, res) => {
    try {
      const { chalet_id, lang } = req.params;
      const cacheKey = `rightTimes:chalet:${chalet_id}:${lang}`;
  
      
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log("Cache hit for RightTimes by Chalet:", chalet_id);
        return res.status(200).json(
          JSON.parse(cachedData),
      );
      }
      console.log("Cache miss for RightTimes by Chalet:", chalet_id);
  
      
      const chalet = await Chalet.findByPk(chalet_id);
      if (!chalet) {
        return res.status(404).json({
          message: lang === 'en' ? 'Chalet not found' : 'الشاليه غير موجود'
        });
      }
  
      const rightTimes = await RightTimeModel.findAll({
        where: { chalet_id, lang },
        include: [
          { model: ReservationDate }
        ]
      });
  
      if (rightTimes.length === 0) {
        return res.status(404).json({
          message: lang === 'en' ? 'No RightTimes found for this chalet in the specified language' : 'لم يتم العثور على أوقات مناسبة لهذا الشاليه باللغة المحددة'
        });
      }
  
     
      await client.setEx(cacheKey, 3600, JSON.stringify(rightTimes));
  
      return res.status(200).json({ rightTimes });
    } catch (error) {
      console.error("Error in getAllRightTimesByChaletId:", error);
  
      return res.status(500).json({
        message: lang === 'en' ? 'Failed to fetch RightTimes' : 'فشل في جلب الأوقات المناسبة'
      });
    }
  };

  



  exports.updateRightTime = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            type_of_time, 
            from_time, 
            to_time, 
            lang, 
            price, 
            After_Offer, 
            chalet_id 
        } = req.body;
        const image = req.file ? req.file.filename : null;

        
        const validationErrors = validateInput({ 
            name, 
            type_of_time, 
            from_time, 
            to_time, 
            lang, 
            price, 
            After_Offer, 
            chalet_id 
        });
        if (validationErrors.length > 0) {
            return res.status(400).json( ErrorResponse('Validation failed', validationErrors));
        }

        
        const rightTime = await RightTimeModel.findByPk(id);
        if (!rightTime) {
            return res.status(404).json( ErrorResponse('RightTime not found'));
        }

       
        rightTime.name = name || rightTime.name;
        rightTime.type_of_time = type_of_time || rightTime.type_of_time;
        rightTime.from_time = from_time || rightTime.from_time;
        rightTime.to_time = to_time || rightTime.to_time;
        rightTime.lang = lang || rightTime.lang;
        rightTime.price = price || rightTime.price;
        rightTime.After_Offer = After_Offer || rightTime.After_Offer;
        rightTime.chalet_id = chalet_id !== undefined ? chalet_id : rightTime.chalet_id;
        rightTime.image = image || rightTime.image;

        
        await rightTime.save();

        return res.status(200).json(
            rightTime
        );
    } catch (error) {
        console.error(error);
        return res.status(500).json( ErrorResponse('Internal server error'));
    }
};



exports.deleteRightTime = async (req, res) => {
    try {
      const { id, lang } = req.params;
  
     
      const [rightTime, _] = await Promise.all([
        RightTimeModel.findByPk(id, { where: { lang } }),
        client.del(`rightTime:${id}:${lang}`), 
      ]);
  
      if (!rightTime) {
        return res.status(404).json(
          ErrorResponse("RightTime not found", [
            "No RightTime found with the given ID and language.",
          ])
        );
      }
  
    
      await rightTime.destroy();
  
      
      return res.status(200).json({ message: "RightTime deleted successfully" });
    } catch (error) {
      console.error("Error in deleteRightTime:", error);
  
      return res.status(500).json(
        ErrorResponse("Failed to delete RightTime", [
          "An internal server error occurred. Please try again later.",
        ])
      );
    }
  };
  

exports.get = async (req, res) => {
    try {
      const { lang } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
  
client.del(`rightTimes:lang:${lang}:page:${page}:limit:${limit}`)      
      const cacheKey = `rightTimes:lang:${lang}:page:${page}:limit:${limit}`;
      const cachedData = await client.get(cacheKey);
  
      if (cachedData) {
        console.log("Cache hit for RightTimes:", lang, page, limit);
        return res.status(200).json(
         JSON.parse(cachedData),
        );
      }
      console.log("Cache miss for RightTimes:", lang, page, limit);
  
     
      const rightTimes = await RightTimeModel.findAll({
        where: { lang },
        include: [
          { model: Chalet },
          { model: ReservationDate }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
  
      if (rightTimes.length === 0) {
        return res.status(404).json({
          message: lang === 'en' ? 'No RightTimes found for this language' : 'لم يتم العثور على الأوقات المناسبة لهذه اللغة'
        });
      }
  
    
      await client.setEx(cacheKey, 3600, JSON.stringify(rightTimes));
  
      return res.status(200).json(
        rightTimes,
      );
    } catch (error) {
      console.error("Error in getRightTimes:", error);
  
      return res.status(500).json({
        message: lang === 'en' ? 'Failed to fetch RightTimes' : 'فشل في جلب الأوقات المناسبة'
      });
    }
  };
  
