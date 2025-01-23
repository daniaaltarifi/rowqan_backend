const { validateInput, ErrorResponse } = require('../Utils/validateInput');
const Reservations_Chalets = require('../Models/Reservations_Chalets');
const Chalet = require('../Models/ChaletsModel');
const User = require('../Models/UsersModel');
const RightTimeModel = require('../Models/RightTimeModel');
const Wallet = require('../Models/WalletModel')
const { Op } = require('sequelize');
const {client} = require('../Utils/redisClient');
const moment = require('moment');
const Status = require('../Models/StatusModel');



exports.createReservation = async (req, res) => {
  try {
    const {
      start_date,
      end_date = null, 
      lang,
      additional_visitors,
      number_of_days,
      Reservation_Type,
      user_id,
      chalet_id,
      right_time_id,
    } = req.body || {};

    if (!start_date || !lang || !chalet_id || !right_time_id) {
      return res.status(400).json(
        ErrorResponse("Validation failed", [
          lang === "en"
            ? "Start date, lang, chalet_id, and right_time_id are required"
            : "التاريخ المبدئي، اللغة، chalet_id و right_time_id مطلوبة",
        ])
      );
    }

    const formattedStartDate = new Date(start_date);
    let formattedEndDate = null;

    if (end_date) {
      formattedEndDate = new Date(end_date);
      if (isNaN(formattedEndDate.getTime())) {
        return res.status(400).json({
          error: lang === "en" ? "Invalid end date format" : "تنسيق التاريخ النهائي غير صالح",
        });
      }
    }

    if (isNaN(formattedStartDate.getTime())) {
      return res.status(400).json({
        error: lang === "en" ? "Invalid start date format" : "تنسيق التاريخ المبدئي غير صالح",
      });
    }

    if (!["ar", "en"].includes(lang)) {
      return res.status(400).json({
        error: lang === "en" ? "Invalid language" : "اللغة غير صالحة",
      });
    }

    const chalet = await Chalet.findByPk(chalet_id);
    if (!chalet) {
      return res.status(404).json({
        error: lang === "en" ? "Chalet not found" : "الشاليه غير موجود",
      });
    }

    const rightTime = await RightTimeModel.findByPk(right_time_id);
    if (!rightTime) {
      return res.status(404).json({
        error: lang === "en" ? "Right time not found" : "الوقت المناسب غير موجود",
      });
    }

    let finalPrice;
    if (rightTime.type_of_time === "Morning" || rightTime.type_of_time === "Evening" || rightTime.type_of_time === "Full day") {
      finalPrice = rightTime.price;
    } else {
      return res.status(400).json({ error: "Invalid time selection" });
    }

    let additional_fee = 0;
    if (additional_visitors > 0) {
      additional_fee = additional_visitors * 10;
    }

    let days_fee = 0;
    if (number_of_days > 0) {
      days_fee = number_of_days * 20;
    }

    const total_amount = finalPrice + additional_fee + days_fee;
    const cashback = total_amount * 0.05;



    
    const existingFullDayReservation = await Reservations_Chalets.findOne({
      where: {
        chalet_id,
        [Op.or]: [
          {
            
            [Op.and]: [
              { start_date: { [Op.lte]: formattedStartDate } },
              { end_date: { [Op.gte]: formattedStartDate } },
            ],
          },
          {
            
            [Op.and]: [
              { start_date: { [Op.lte]: formattedEndDate || formattedStartDate } },
              { end_date: { [Op.gte]: formattedEndDate || formattedStartDate } },
            ],
          },
        ],
        right_time_id: null, 
      },
    });
    
    if (existingFullDayReservation) {
      return res.status(400).json({
        error: lang === "en"
          ? "This chalet is fully booked during the selected period."
          : "هذا الشاليه محجوز بالكامل خلال الفترة المحددة.",
      });
    }
    
    
    const existingSpecificTimeReservation = await Reservations_Chalets.findOne({
      where: {
        chalet_id,
        start_date: formattedStartDate,
        right_time_id, 
      },
    });
    
    if (existingSpecificTimeReservation) {
      return res.status(400).json({
        error: lang === "en"
          ? "This chalet is already reserved for the selected time."
          : "هذا الشاليه محجوز بالفعل للفترة الزمنية المحددة.",
      });
    }
    

  
    const reservation = await Reservations_Chalets.create({
      price: rightTime.price,
      Total_Amount: total_amount,
      cashback,
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      Time: rightTime.type_of_time,
      starting_price: rightTime.price,
      additional_visitors,
      number_of_days,
      Reservation_Type,
      lang,
      user_id: user_id || null,
      chalet_id,
      right_time_id,
      Status: 'Pending',
    });

    let wallet = null;
    if (user_id) {
      wallet = await Wallet.findOne({ where: { user_id } });

      if (wallet) {
        wallet.total_balance += total_amount;
        wallet.cashback_balance += cashback;
        await wallet.save();
      } else {
        wallet = await Wallet.create({
          user_id,
          total_balance: total_amount,
          cashback_balance: cashback,
          lang,
        });
      }
    }

    res.status(201).json({
      message: lang === "en" ? "Reservation created successfully" : "تم إنشاء الحجز بنجاح",
      reservation: {
        id: reservation.id,
        total_amount,
        cashback,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        Time: reservation.type_of_time,
        additional_visitors,
        number_of_days,
        user_id,
        chalet_id,
        right_time_id,
      },
      wallet: user_id
        ? {
            total_balance: wallet?.total_balance || 0,
            cashback_balance: wallet?.cashback_balance || 0,
          }
        : null,
    });
  } catch (error) {
    console.error("Error creating reservation:", error);
    res.status(500).json(
      ErrorResponse("Failed to create reservation", [
        "An internal server error occurred.",
      ])
    );
  } 
};

















exports.getAllReservations = async (req, res) => {
  try {
    const { lang } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    
    if (!["ar", "en"].includes(lang)) {
      return res.status(400).json({
        error: lang === "en" ? "Invalid language" : "اللغة غير صالحة",
      });
    }

    
    const cacheKey = `reservations:page:${page}:limit:${limit}:lang:${lang}`;

    
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for reservations:", lang);
      return res.status(200).json(JSON.parse(cachedData));
    }
    console.log("Cache miss for reservations:", lang);

    
    const reservations = await Reservations_Chalets.findAll({
      include: [
        {
          model: Chalet,
          attributes: [
            "id",
            "title",
            "description",
            "image",
            "Rating",
            "city",
            "area",
            "intial_Amount",
            "type",
          ],
        },
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
        {
          model: RightTimeModel,
          attributes: [
            "id",
            "type_of_time",
            "from_time",
            "to_time",
            "price",
            "After_Offer",
          ],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        "id",
        "cashback",
        "start_date",
        "end_date",
        "Time",
        "Status",
        "Reservation_Type",
        "starting_price",
        "Total_Amount",
        "additional_visitors",
        "number_of_days",
      ],
    });

    
    if (!reservations || reservations.length === 0) {
      return res.status(404).json({
        message: lang === "en" ? "No reservations found" : "لا توجد حجوزات",
      });
    }

    
    const formattedReservations = reservations.map((reservation) => ({
      id: reservation.id,
      cashback: reservation.cashback,
      start_date: reservation.start_date,
      end_date: reservation.end_date,
      time: reservation.Time,
      status: reservation.Status,
      reservation_type: reservation.Reservation_Type,
      starting_price: reservation.starting_price,
      total_amount: reservation.Total_Amount,
      additional_visitors: reservation.additional_visitors,
      number_of_days: reservation.number_of_days,
      chalet: reservation.Chalet, 
      user: reservation.User, 
      right_time: reservation.RightTimeModel, 
    }));

    
    await client.setEx(cacheKey, 3600, JSON.stringify(formattedReservations));

    
    return res.status(200).json(formattedReservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return res.status(500).json({
      error: lang === "en" ? "Failed to fetch reservations" : "فشل في جلب الحجوزات",
    });
  }
};






exports.getReservationById = async (req, res) => {
  try {
    const { lang, id } = req.params; 


    if (!['ar', 'en'].includes(lang)) {
      return res.status(400).json({
        error: lang === 'en' ? 'Invalid language' : 'اللغة غير صالحة',
      });
    }

    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        error: lang === 'en' ? 'Invalid reservation ID' : 'رقم الحجز غير صحيح',
      });
    }

    const cacheKey = `reservation:${id}:lang:${lang}`;

    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for reservation:", id);
      return res.status(200).json(
         JSON.parse(cachedData),
      );
    }
    console.log("Cache miss for reservation:", id);


    const reservation = await Reservations_Chalets.findOne({
      where: { id: id }, 
      include: [
        {
          model: Chalet,
          attributes: ['id', 'title', 'starting_price'], 
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'], 
        },
        {
          model: RightTimeModel,
          attributes: ['id', 'time'], 
        }
      ]
    });

    
    if (!reservation) {
      return res.status(404).json({
        message: lang === 'en' ? 'Reservation not found' : 'لم يتم العثور على الحجز',
      });
    }


    await client.setEx(cacheKey, 3600, JSON.stringify(reservation));

    return res.status(200).json(
      {
        id: reservation.id,
        starting_price: reservation.starting_price,
        total_amount: reservation.total_amount,
        cashback: reservation.cashback,
        date: reservation.date,
        lang: reservation.lang,
        status: reservation.status,
        additional_visitors: reservation.additional_visitors,
        number_of_days: reservation.number_of_days,
        user_id: reservation.user_id,
        chalet_id: reservation.chalet_id,
        right_time_id: reservation.right_time_id,
        chalet: reservation.chalet,
        user: reservation.user, 
        right_time: reservation.rightTime, 
      }
  );
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return res.status(500).json({
      error: lang === 'en' 
        ? 'Failed to fetch reservation' 
        : 'فشل في استرجاع الحجز',
    });
  }
};









exports.getReservationsByChaletId = async (req, res) => {
  try {
    const { user_id, lang } = req.params;

    
    if (!['ar', 'en'].includes(lang)) {
      return res.status(400).json({
        error: lang === 'en' ? 'Invalid language' : 'اللغة غير صالحة',
      });
    }

    
    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({
        error: lang === 'en' ? 'Invalid chalet ID' : 'رقم الشاليه غير صحيح',
      });
    }

    const cacheKey = `reservations:${user_id}:lang:${lang}`;

   
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for reservations:", user_id);
      return res.status(200).json(
         JSON.parse(cachedData),
      );
    }
    console.log("Cache miss for reservations:", user_id);

  
    const reservations = await Reservations_Chalets.findAll({
      where: { user_id: user_id },
      include: [
        {
          model: Chalet,
          as: 'chalet', 
          attributes: ['id', 'title', 'starting_price'], 
        },
        {
          model: User,
          as: 'user', 
          attributes: ['id', 'name', 'email'], 
        },
        {
          model: RightTimeModel,
          as: 'rightTime', 
          attributes: ['id', 'time', 'name'], 
        }
      ]
    });

    
    if (!reservations || reservations.length === 0) {
      return res.status(404).json({
        message: lang === 'en' ? 'No reservations found for this chalet' : 'لا توجد حجوزات لهذا الشاليه',
      });
    }

  
    await client.setEx(cacheKey, 3600, JSON.stringify(reservations));

    return res.status(200).json(
       reservations.map(reservation => ({
        id: reservation.id,
        starting_price: reservation.starting_price,
        total_amount: reservation.total_amount,
        cashback: reservation.cashback,
        date: reservation.date,
        lang: reservation.lang,
        status: reservation.status,
        additional_visitors: reservation.additional_visitors,
        number_of_days: reservation.number_of_days,
        user_id: reservation.user_id,
        chalet_id: reservation.chalet_id,
        right_time_id: reservation.right_time_id,
        chalet: reservation.chalet,
        user: reservation.user,
        right_time: reservation.rightTime,
      })),
  );
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return res.status(500).json({
      error: lang === 'en' 
        ? 'Failed to fetch reservations' 
        : 'فشل في استرجاع الحجوزات',
    });
  }
};








exports.getAvailableTimesByDate = async (req, res) => {
  const { chalet_id, start_date } = req.params; 
  const formattedDate = moment(start_date).format('YYYY-MM-DD'); 

  try {
   
    const startOfDay = moment(formattedDate).startOf('day').toDate();  
    const endOfDay = moment(formattedDate).endOf('day').toDate();     

    
    const reservations = await Reservations_Chalets.findAll({
      where: {
        start_date: {
          [Op.gte]: startOfDay,  
          [Op.lt]: endOfDay,    
        },
        chalet_id: chalet_id,
      },
      include: [{
        model: RightTimeModel,  
      }],
    });

   
    const reservedTimes = reservations.map(reservation => reservation.rightTime.type_of_time);

    
    const allTimeSlots = await RightTimeModel.findAll({
      where: {
        chalet_id: chalet_id,
      }
    });

    
    let availableTimeSlots = allTimeSlots.filter(slot => !reservedTimes.includes(slot.type_of_time));

  
    if (reservedTimes.includes('Morning') || reservedTimes.includes('Evening')) {
      availableTimeSlots = availableTimeSlots.filter(slot => slot.type_of_time !== 'Full day');
    }

    
    res.json(availableTimeSlots);

  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};




exports.getReservationsByRightTimeName = async (req, res) => {
  const { chalet_id, name, lang } = req.params;

  console.log("Received chalet_id:", chalet_id);
  console.log("Received rightTime name:", name);

  try {
    const timePeriods = name.split(' ');

    const rightTimes = await RightTimeModel.findAll({
      where: {
        lang: lang,
        type_of_time: {
          [Op.in]: timePeriods,
        },
        chalet_id: chalet_id,
      },
    });

    if (!rightTimes || rightTimes.length === 0) {
      return res.status(404).json({ error: "No right time found for the provided periods" });
    }

    const whereClause = {
      lang: lang,
      chalet_id: chalet_id,
      right_time_id: { [Op.in]: rightTimes.map(rt => rt.id) },
    };

    const reservations = await Reservations_Chalets.findAll({
      where: whereClause,
    });

    if (!reservations || reservations.length === 0) {
      return res.status(404).json({ error: "No reservations found" });
    }

    const reservedDates = new Set();
    reservations.forEach(reservation => {
      const start = moment(reservation.start_date).startOf('day');
      let end = moment(reservation.end_date).startOf('day');

      
      if (reservation.Time === "Morning") {
        reservedDates.add(start.format('YYYY-MM-DD')); 
        reservedDates.add(start.add(1, 'day').format('YYYY-MM-DD')); 
      } else if (!end.isValid()) {
        reservedDates.add(start.format('YYYY-MM-DD'));
      } else {
        while (start.isSameOrBefore(end)) {
          reservedDates.add(start.format('YYYY-MM-DD'));
          start.add(1, 'day');
        }
      }
    });

    res.status(200).json({
      reserved_days: Array.from(reservedDates),
    });
  } catch (error) {
    console.error("Error in getReservationsByRightTimeName:", error);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
};







exports.getReservationsByRightTime = async (req, res) => {
  const { chalet_id, lang } = req.params;

  console.log("Received chalet_id:", chalet_id);

  try {
    const rightTimes = await RightTimeModel.findAll({
      where: {
        lang: lang,
        chalet_id: chalet_id,
      },
    });

    if (!rightTimes || rightTimes.length === 0) {
      return res.status(404).json({ error: "No right time found for the provided chalet_id and lang" });
    }

    const whereClause = {
      lang: lang,
      chalet_id: chalet_id,
      right_time_id: { [Op.in]: rightTimes.map(rt => rt.id) },
    };

    const reservations = await Reservations_Chalets.findAll({
      where: whereClause,
    });

    if (!reservations || reservations.length === 0) {
      return res.status(404).json({ error: "No reservations found" });
    }

    const reservedDates = new Set();
    reservations.forEach(reservation => {
      const start = moment(reservation.start_date).startOf('day');
      let end = moment(reservation.end_date).startOf('day');

      
      if (reservation.Time === "Morning") {
        reservedDates.add(start.format('YYYY-MM-DD'));
        reservedDates.add(start.add(1, 'day').format('YYYY-MM-DD')); 
      } else if (!end.isValid()) {
        reservedDates.add(start.format('YYYY-MM-DD'));
      } else {
        while (start.isSameOrBefore(end)) {
          reservedDates.add(start.format('YYYY-MM-DD'));
          start.add(1, 'day');
        }
      }
    });

    res.status(200).json({
      reserved_days: Array.from(reservedDates),
    });
  } catch (error) {
    console.error("Error in getReservationsByRightTimeName:", error);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
};










exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params; 
    const { status, lang } = req.body; 

    
    if (lang && !['ar', 'en'].includes(lang)) {
      return res.status(400).json({
        error: 'Invalid language',
      });
    }

    const reservation = await Reservations_Chalets.findByPk(id);
    if (!reservation) {
      return res.status(404).json({
        error: lang === 'en' ? 'Reservation not found' : 'الحجز غير موجود',
      });
    }

   
    if (status === undefined) {
      return res.status(400).json({
        error: lang === 'en' ? 'Status is required' : 'الحالة مطلوبة',
      });
    }

  
    reservation.status = status;
    await reservation.save();


    res.status(200).json({
      message: lang === 'en' ? 'Reservation status updated successfully' : 'تم تحديث حالة الحجز بنجاح',
      reservation,
    });
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({
      error: lang === 'en' ? 'Failed to update reservation status' : 'فشل في تحديث حالة الحجز',
    });
  }
};




exports.deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;

    if (!['ar', 'en'].includes(lang)) {
      return res.status(400).json({
        error: lang === 'en' ? 'Invalid language' : 'اللغة غير صالحة',
      });
    }

   
    const [reservation, _] = await Promise.all([
      Reservations_Chalets.findByPk(id),
      client.del(`reservation:${id}`), 
    ]);

    if (!reservation) {
      return res.status(404).json({
        error: lang === 'en' ? 'Reservation not found' : 'الحجز غير موجود',
      });
    }

    await reservation.destroy();

    return res.status(200).json({
      message: lang === 'en' ? 'Reservation deleted successfully' : 'تم حذف الحجز بنجاح',
    });
  } catch (error) {
    console.error('Error deleting reservation:', error);

    return res.status(500).json({
      error: lang === 'en' ? 'Failed to delete reservation' : 'فشل في حذف الحجز',
    });
  }
};
