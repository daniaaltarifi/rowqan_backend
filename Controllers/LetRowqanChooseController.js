const LetRowqanChoose = require('../Models/LetRowqanChoose');
const Reservation = require('../Models/LetRowqanChoose');
const { validateInput, ErrorResponse } = require('../Utils/validateInput');



exports.createReservation = async (req, res) => {
    try {
      const { 
        reservation_type,
        Rating, 
        startDate, 
        Duration, 
        number_of_visitors, 
        Facilities, 
        number_of_rooms, 
        Preferred_Location, 
        Budget, 
        Additional_Notes, 
        Full_Name, 
        Phone_Number,
      } = req.body;

      console.log('Received Data:', req.body); 

      
      if (!reservation_type || !startDate || !number_of_visitors || !Full_Name || !Phone_Number) {
        return res.status(400).json(
          ErrorResponse("Validation failed", [
            "Required fields are missing"
          ])
        );
      }

      const validationErrors = validateInput({ 
        reservation_type, 
        startDate, 
        number_of_visitors, 
        Full_Name, 
        Phone_Number 
      });
      
      if (validationErrors.length > 0) {
        return res.status(400).json(
          ErrorResponse("Validation failed", validationErrors)
        );
      }

      
      const newReservation = await LetRowqanChoose.create({
        reservation_type,  
        Rating, 
        startDate, 
        Duration, 
        number_of_visitors, 
        Facilities: Facilities ? Facilities.join(', ') : null, 
        number_of_rooms, 
        Preferred_Location, 
        Budget, 
        Additional_Notes, 
        Full_Name, 
        Phone_Number,
      });

      res.status(201).json({
        message: "Reservation created successfully",
        reservation: newReservation
      });

    } catch (error) {
      console.error("Error in createReservation:", error);
      res.status(500).json(
        ErrorResponse("Failed to create Reservation", [
          error.message
        ])
      );
    }
};

exports.getAllReservations = async (req, res) => {
  try {
    const { page = 1, limit = 20, lang } = req.query;
    const offset = (page - 1) * limit;

    
    const whereCondition = lang ? { lang } : {};

    const reservations = await Reservation.findAll({
      where: whereCondition,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json(reservations);
  } catch (error) {
    console.error("Error in getAllReservations:", error.message);
    res.status(500).json(
      ErrorResponse("Failed to fetch Reservations", [
        "An internal server error occurred."
      ])
    );
  }
};


exports.getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;

    const whereCondition = lang ? { id, lang } : { id };

    const reservation = await Reservation.findOne({
      where: whereCondition
    });

    if (!reservation) {
      return res.status(404).json(
        ErrorResponse("Reservation not found", [
          "No Reservation found with the given ID and language."
        ])
      );
    }

    res.status(200).json(reservation);
  } catch (error) {
    console.error("Error in getReservationById:", error);
    res.status(500).json(
      ErrorResponse("Failed to fetch Reservation", [
        "An internal server error occurred."
      ])
    );
  }
};


exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      ReservationType, 
      Rating, 
      startDate, 
      Duration, 
      number_of_visitors, 
      Facilities, 
      number_of_rooms, 
      Preferred_Location, 
      Budget, 
      Additional_Notes, 
      Full_Name, 
      Phone_Number,
      lang
    } = req.body;

    
    const validationErrors = validateInput({ 
      ReservationType, 
      startDate, 
      number_of_visitors, 
      Full_Name, 
      Phone_Number 
    });
    
    if (validationErrors.length > 0) {
      return res.status(400).json(
        ErrorResponse("Validation failed", validationErrors)
      );
    }

    
    const reservation = await Reservation.findByPk(id);
    
    if (!reservation) {
      return res.status(404).json(
        ErrorResponse("Reservation not found", [
          "No Reservation found with the given ID."
        ])
      );
    }

    
    await reservation.update({
      ReservationType, 
      Rating, 
      startDate, 
      Duration, 
      number_of_visitors, 
      Facilities: Facilities ? Facilities.join(', ') : null, 
      number_of_rooms, 
      Preferred_Location, 
      Budget, 
      Additional_Notes, 
      Full_Name, 
      Phone_Number,
      lang: lang || reservation.lang
    });

    res.status(200).json({
      message: "Reservation updated successfully",
      reservation: reservation
    });
  } catch (error) {
    console.error("Error in updateReservation:", error);
    res.status(500).json(
      ErrorResponse("Failed to update Reservation", [
        "An internal server error occurred."
      ])
    );
  }
};


exports.deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;

    const whereCondition = lang ? { id, lang } : { id };

    
    const reservation = await Reservation.findOne({ where: whereCondition });

    if (!reservation) {
      return res.status(404).json(
        ErrorResponse("Reservation not found", [
          "No Reservation found with the given ID and language."
        ])
      );
    }

    
    await reservation.destroy();

    res.status(200).json({ 
      message: "Reservation deleted successfully" 
    });
  } catch (error) {
    console.error("Error in deleteReservation:", error);
    res.status(500).json(
      ErrorResponse("Failed to delete Reservation", [
        "An internal server error occurred."
      ])
    );
  }
};