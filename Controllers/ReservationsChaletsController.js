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
      additional_visitors = 0,
      number_of_days = null,
      Reservation_Type,
      user_id,
      chalet_id,
      right_time_id,
      total_amount,
    } = req.body || {};

    if (!start_date || !lang || !chalet_id || !right_time_id || !total_amount) {
      return res.status(400).json(
        ErrorResponse("Validation failed", [
          lang === "en"
            ? "Start date, lang, chalet_id, right_time_id, and total_amount are required"
            : "التاريخ المبدئي، اللغة، chalet_id، right_time_id و total_amount مطلوبة",
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

    let startingPrice = rightTime.After_Offer > 0 ? rightTime.After_Offer : rightTime.price;
    let finalPrice = 0;
    if (["Morning", "Evening", "FullDayMorning", "FullDayEvening"].includes(rightTime.type_of_time)) {
      finalPrice = startingPrice;
    } else {
      return res.status(400).json({ error: "Invalid time selection" });
    }

    let additional_fee = additional_visitors > 0 ? additional_visitors * 10 : 0;
    let days_fee = 0;
    if (formattedEndDate) {
      const totalDays = Math.ceil(
        (formattedEndDate.getTime() - formattedStartDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      days_fee = totalDays * 20;
    }

    const calculated_total_amount = finalPrice + additional_fee + days_fee;
    const cashback = calculated_total_amount * 0.05;

    
    if (rightTime.type_of_time === "FullDayMorning" || rightTime.type_of_time === "FullDayEvening") {
      const existingMorningReservation = await Reservations_Chalets.findOne({
        where: { chalet_id, start_date: formattedStartDate, Time: "Morning" },
      });
    
      const existingEveningReservation = await Reservations_Chalets.findOne({
        where: { chalet_id, start_date: formattedStartDate, Time: "Evening" },
      });
    
      if (existingMorningReservation || existingEveningReservation) {
        return res.status(400).json({
          error: lang === "en"
            ? "This chalet is already reserved for Morning or Evening. FullDay reservation is not possible."
            : "هذا الشاليه محجوز بالفعل لفترة الصباح أو المساء. لا يمكن حجزه ليوم كامل.",
        });
      }
    }
    


    if (rightTime.type_of_time === "Morning") {
      const existingMorningReservation = await Reservations_Chalets.findOne({
        where: { chalet_id, start_date: formattedStartDate, Time: "Morning" },
      });

  
      if (existingMorningReservation) {
        return res.status(400).json({
          error: lang === "en"
            ? "This chalet is already reserved for both Morning . Morning reservation is not possible."
            : "هذا الشاليه محجوز بالفعل لفترتي الصباح  لا يمكن حجزه لفترة الصباح.",
        });
      }
    }



    if (rightTime.type_of_time === "Evening") {
      const existingEveningReservation = await Reservations_Chalets.findOne({
        where: { chalet_id, start_date: formattedStartDate, Time: "Evening" },
      });

  
      if (existingEveningReservation) {
        return res.status(400).json({
          error: lang === "en"
            ? "This chalet is already reserved for  Evening . Evening reservation is not possible."
            : "هذا الشاليه محجوز بالفعل لفترتي المساء  لا يمكن حجزه لفترة المساء.",
        });
      }
    }



   
const existingReservation = await Reservations_Chalets.findOne({
  where: {
    chalet_id,
    [Op.or]: [
      { 
        start_date: { [Op.lte]: formattedStartDate },
        end_date: { [Op.gte]: formattedStartDate }
      },
      {
        start_date: { [Op.between]: [formattedStartDate, formattedEndDate] }
      },
      {
        end_date: { [Op.between]: [formattedStartDate, formattedEndDate] }
      }
    ]
  },
});

if (existingReservation) {
  
  const existingReservationEndTime = new Date(existingReservation.end_date);
  
  const newReservationStartTime = new Date(formattedStartDate);

  if (newReservationStartTime.getTime() > existingReservationEndTime.getTime()) {
    
  } else { 
    return res.status(400).json({
      error: lang === "en"
        ? `This chalet is already reserved until ${existingReservationEndTime.toLocaleTimeString()}. You can reserve it after this time.`
        : `هذا الشاليه محجوز حتى الساعة ${existingReservationEndTime.toLocaleTimeString()}. يمكنك حجزه بعد هذا الوقت.`,
    });
  }
}





  const existingReservationInPeriod = await Reservations_Chalets.findOne({
  where: {
    chalet_id,
    start_date: { [Op.lte]: formattedStartDate },
    end_date: { [Op.gte]: formattedStartDate }, 
  },
});

if (existingReservationInPeriod) {
  return res.status(400).json({
    error: lang === "en"
      ? "This chalet is already reserved for the selected period. Please choose a different date."
      : "هذا الشاليه محجوز بالفعل خلال الفترة المحددة. يرجى اختيار تاريخ آخر.",
  });
}





const existingFullDayMorningReservation = await Reservations_Chalets.findOne({
  where: {
    chalet_id,
    end_date: formattedStartDate,
    Time: "FullDayMorning",
  },
});

if (existingFullDayMorningReservation) {
  
  const existingReservationEndTime = new Date(existingFullDayMorningReservation.end_date);
  existingReservationEndTime.setHours(9, 0, 0, 0); 

  
  const newReservationStartTime = new Date(formattedStartDate);

  
  if (newReservationStartTime.getTime() < existingReservationEndTime.getTime()) {
    return res.status(400).json({
      error: lang === "en"
        ? "This chalet is already reserved for FullDayMorning and ends at 9:00 AM. You can only reserve it after 9:00 AM."
        : "هذا الشاليه محجوز بالفعل ليوم كامل في الصباح وينتهي في الساعة 9:00 صباحًا. يمكنك حجزه فقط بعد الساعة 9:00 صباحًا.",
    });
  }
}

    const reservation = await Reservations_Chalets.create({
      price: finalPrice,
      Total_Amount: calculated_total_amount,
      cashback,
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      Time: rightTime.type_of_time,
      starting_price: startingPrice,
      additional_visitors,
      number_of_days,
      Reservation_Type,
      lang,
      user_id: user_id || null,
      chalet_id,
      right_time_id,
      Status: "Pending",
    });

    let wallet = null;
    if (user_id) {
      wallet = await Wallet.findOne({ where: { user_id } });
      if (wallet) {
        wallet.total_balance += calculated_total_amount;
        wallet.cashback_balance += cashback;
        await wallet.save();
      } else {
        wallet = await Wallet.create({
          user_id,
          total_balance: calculated_total_amount,
          cashback_balance: cashback,
          lang,
        });
      }
    }

    res.status(201).json({
      message: lang === "en" ? "Reservation created successfully" : "تم إنشاء الحجز بنجاح",
      reservation: {
        id: reservation.id,
        total_amount: calculated_total_amount,
        cashback,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        Time: reservation.Time,
        additional_visitors,
        number_of_days,
        user_id,
        chalet_id,
        right_time_id,
      },
      wallet: user_id ? { total_balance: wallet?.total_balance || 0, cashback_balance: wallet?.cashback_balance || 0 } : null,
    });
  } catch (error) {
    console.error("Error creating reservation:", error);
    res.status(500).json(ErrorResponse("Failed to create reservation", ["An internal server error occurred."]));
  }
};
















exports.getAllReservations = async (req, res) => {
  try {
    const { lang } = req.params;
    const { page = 1, limit = 40 } = req.query;
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
            "date"
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
          attributes: ['id', 'title', 'description','Rating','city','area','intial_Amount','type'], 
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'], 
        },
        {
          model: RightTimeModel,
          attributes: ['id', 'type_of_time'], 
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
    return res.status(500).json(
         'Failed to fetch reservation' 
    );
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

    await client.del(`reservations:${user_id}:lang:${lang}`);

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




exports.getReservationsByUserId = async (req, res) => {
  try {
    const { user_id, lang } = req.params;

    
    if (!['ar', 'en'].includes(lang)) {
      return res.status(400).json({
        error: lang === 'en' ? 'Invalid language' : 'اللغة غير صالحة',
      });
    }

    
    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({
        error: lang === 'en' ? 'Invalid user ID' : 'رقم المستخدم غير صحيح',
      });
    }

    const cacheKey = `reservationsUser:${user_id}:lang:${lang}`;

    
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for reservations:", user_id);
      return res.status(200).json(JSON.parse(cachedData));
    }
    console.log("Cache miss for reservations:", user_id);

    
    const reservations = await Reservations_Chalets.findAll({
      where: {
        user_id: user_id,
        status: 'Confirmed', 
      },
      include: [
        {
          model: Chalet,
          attributes: ['id', 'title', 'description', 'Rating', 'city', 'area', 'intial_Amount', 'type', 'features', 'Additional_features'],
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    
    if (!reservations || reservations.length === 0) {
      return res.status(404).json({
        message: lang === 'en' ? 'No confirmed reservations found for this user' : 'لا توجد حجوزات مؤكدة لهذا المستخدم',
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
      }))
    );
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return res.status(500).json({
      error: lang === 'en' ? 'Failed to fetch reservations' : 'فشل في جلب الحجوزات',
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

  console.log("Chalet ID:", chalet_id);
  console.log("Time:", name);
  console.log("Lang:", lang);

  const cacheKey = `reservation:${chalet_id}:${name}:${lang}`;

  try {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit for reservations");
      return res.status(200).json(JSON.parse(cachedData));
    }
    console.log("Cache miss for reservations");

    
    const rightTimes = await RightTimeModel.findAll({
      where: { lang: lang, chalet_id: chalet_id },
      attributes: ['id', 'type_of_time'],
    });

    if (!rightTimes || rightTimes.length === 0) {
      return res.status(404).json({ error: "No right times found for the provided chalet" });
    }

    
    const rightTimeMap = new Map(rightTimes.map(rt => [rt.type_of_time, rt.id]));

    if (!rightTimeMap.has(name)) {
      return res.status(404).json({ error: `No right time found for the provided time: ${name}` });
    }

   
    const reservations = await Reservations_Chalets.findAll({
      where: {
        lang: lang,
        chalet_id: chalet_id,
        right_time_id: Object.values(rightTimeMap),
      },
      attributes: ['start_date', 'end_date', 'right_time_id'],
    });

   

    if (!reservations || reservations.length === 0) {
      return res.status(404).json({ error: "No reservations found" });
    }


    

    const reservedDates = new Set();
    const morningDates = new Set();
    const fullDayMorningDates = new Set();

    
    reservations.forEach(reservation => {
      const start = moment(reservation.start_date).startOf('day');
      const end = reservation.end_date ? moment(reservation.end_date).startOf('day') : start;
      const type = [...rightTimeMap].find(([key, val]) => val === reservation.right_time_id)?.[0];

      let current = start.clone();
      while (current.isSameOrBefore(end)) {
        const dateStr = current.format('YYYY-MM-DD');

        if (type === "Morning") {
          morningDates.add(dateStr);
        }
        if (type === "FullDayMorning") {
          fullDayMorningDates.add(dateStr);
        }

        reservedDates.add(dateStr);
        current.add(1, 'day');
      }
    });

    
    morningDates.forEach(date => reservedDates.add(date)); 
    fullDayMorningDates.forEach(date => reservedDates.add(date)); 

    const response = {
      reserved_days: Array.from(reservedDates).sort(),
    };

    await client.setEx(cacheKey, 300, JSON.stringify(response));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getReservationsByRightTime:", error);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
};













exports.getReservationsByRightTime = async (req, res) => {
  const { chalet_id, lang } = req.params;

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
      let end = reservation.end_date ? moment(reservation.end_date).startOf('day') : start;

      
      let current = start.clone();
      while (current.isSameOrBefore(end)) {
        reservedDates.add(current.format('YYYY-MM-DD'));
        current.add(1, 'day');
      }
      
      
      if (reservation.Time === "Morning" || reservation.Time === "Evening") {
        reservedDates.add(start.format('YYYY-MM-DD'));
      }
    });

    res.status(200).json({
      reserved_days: Array.from(reservedDates).sort(),
    });
  } catch (error) {
    console.error("Error in getReservationsByRightTime:", error);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
};





exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params; 
    const { Status, lang } = req.body; 

    
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

   
    if (Status === undefined) {
      return res.status(400).json({
        error: lang === 'en' ? 'Status is required' : 'الحالة مطلوبة',
      });
    }

  
    reservation.Status = Status;
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
