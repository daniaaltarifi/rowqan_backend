const  Payments  = require('../Models/PaymentModel');
const  Users  = require('../Models/UsersModel');
const  ReservationChalets  = require('../Models/Reservations_Chalets');
const { client } = require('../Utils/redisClient');
const { validateInput, ErrorResponse } = require('../Utils/validateInput');
const stripe = require('stripe')('sk_test_51Qdn2mR2zHb3l1vg8ng6R9o3lqoO6ZJw5X0qNoqUPr65tG7t1OhQ4KVqbj0G7hT2NdJwmtzXlEj9zY2DCVXSNIKE00NeWBobTi');
const dotenv = require("dotenv");


const  {Client}  = require('../Config/PayPalClient');
const paypal = require('@paypal/checkout-server-sdk'); 
exports.createPayPalPayment = async (req, res) => {
  try {
    const { amount, currency, reservation_id, name } = req.body; 

    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).send({ error: 'Invalid amount provided.' });
    }

    if (!name || name.trim() === "") { 
      return res.status(400).send({ error: 'Name is required.' });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",  
      purchase_units: [
        {
          amount: {
            currency_code: currency || "USD", 
            value: amount.toFixed(2),  
          },
        },
      ],
    });

    const order = await Client.execute(request);

    if (order.result.status === 'CREATED') {
      const reservation = await ReservationChalets.findOne({ where: { id: reservation_id } });

      if (!reservation) {
        return res.status(404).send({ error: 'Reservation not found.' });
      }

      if (reservation.Status === 'Confirmed') {
        return res.status(400).send({ error: 'Reservation is already confirmed.' });
      }

      reservation.Status = 'Confirmed';
      await reservation.save();

      
      reservation.name = name;
      await reservation.save();

      res.status(201).json({
        id: order.result.id,
        status: order.result.status,
        links: order.result.links, 
        message: 'Payment created and reservation confirmed.',
        name: name,  
      });
    } else {
      return res.status(400).send({ error: 'Payment creation failed.' });
    }
  } catch (error) {
    console.error('PayPal Error:', error.message);
    res.status(500).send({ error: 'Failed to create PayPal payment.' });
  }
};
// exports.createPayPalPayment = async (req, res) => {
//   try {
//     const { amount, currency, reservation_id, name } = req.body; 

    
//     if (!amount || isNaN(amount) || amount <= 0) {
//       return res.status(400).send({ error: 'Invalid amount provided.' });
//     }

//     if (!name || name.trim() === "") { 
//       return res.status(400).send({ error: 'Name is required.' });
//     }

//     const request = new paypal.orders.OrdersCreateRequest();
//     request.prefer("return=representation");
//     request.requestBody({
//       intent: "CAPTURE",  
//       purchase_units: [
//         {
//           amount: {
//             currency_code: currency || "USD", 
//             value: amount.toFixed(2),  
//           },
//         },
//       ],
//     });

//     const order = await Client.execute(request);

//     if (order.result.status === 'CREATED') {
//       const reservation = await ReservationChalets.findOne({ where: { id: reservation_id } });

//       if (!reservation) {
//         return res.status(404).send({ error: 'Reservation not found.' });
//       }

//       if (reservation.Status === 'Confirmed') {
//         return res.status(400).send({ error: 'Reservation is already confirmed.' });
//       }

//       reservation.Status = 'Confirmed';
//       await reservation.save();

      
//       reservation.name = name;
//       await reservation.save();

//       res.status(201).json({
//         id: order.result.id,
//         status: order.result.status,
//         links: order.result.links, 
//         message: 'Payment created and reservation confirmed.',
//         name: name,  
//       });
//     } else {
//       return res.status(400).send({ error: 'Payment creation failed.' });
//     }
//   } catch (error) {
//     console.error('PayPal Error:', error.message);
//     res.status(500).send({ error: 'Failed to create PayPal payment.' });
//   }
// };






exports.capturePayPalPayment = async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).send({ error: 'Order ID is required.' });
    }

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const capture = await Client.execute(request);

    res.status(200).json({
      id: capture.result.id,
      status: capture.result.status,
      capture_details: capture.result.purchase_units[0].payments.captures,
    });
  } catch (error) {
    console.error('PayPal Error:', error.message);
    res.status(500).send({ error: 'Failed to capture PayPal payment.' });
  }
};



const nodemailer = require('nodemailer');

exports.createPayment = async (req, res) => {
  try {
    const { user_id, reservation_id, paymentMethod, UserName, Phone_Number, initialAmount } = req.body;

    console.log(req.body)
  
    if (!reservation_id || !paymentMethod || !UserName || !Phone_Number || !initialAmount) {
      return res.status(400).json(
        ErrorResponse('Validation failed', [
          'Reservation ID, paymentMethod, UserName, Phone_Number, and initialAmount are required.',
        ])
      );
    }

   
    const validationErrors = validateInput({ paymentMethod, UserName, Phone_Number });
    if (validationErrors.length > 0) {
      return res.status(400).json(ErrorResponse('Validation failed', validationErrors));
    }

    let user = null;
  
    const reservation = await ReservationChalets.findByPk(reservation_id, {
      include: [
        {
          model: Chalet,
          attributes: ['title', 'description', 'Rating', 'city', 'area', 'intial_Amount', 'type', 'features', 'Additional_features']
        },
      ],
    });

    if (!reservation) {
      return res.status(404).json(ErrorResponse('Validation failed', ['Reservation not found.']));
    }

    if (reservation.Status === 'Confirmed') {
      return res.status(400).json({ error: 'Reservation is already confirmed.' });
    }

    const totalAmount = reservation.Total_Amount;
    if (initialAmount > totalAmount) {
      return res.status(400).json(ErrorResponse('Validation failed', ['Initial amount cannot exceed total amount.']));
    }

    const remainingAmount = totalAmount - initialAmount;
    const paymentMethodType = remainingAmount > 0 ? 'initial' : 'Total';

  
    let paymentImage = null;
    if (paymentMethod === "Cliq") {
      paymentImage = req.file ? req.file.path : null;
      if (!paymentImage) {
        return res.status(400).json(ErrorResponse('Validation failed', ['Payment image is required for Cliq payment.']));
      }
    }


    if (paymentMethod === "Cliq") {
      reservation.Status = 'Pending';
      await reservation.save();
    }

  
    const newPayment = await Payments.create({
      user_id: user_id || null, 
      reservation_id,
      status: "Pending", 
      paymentMethod,
      UserName,
      Phone_Number,
      initialAmount,
      RemainningAmount: remainingAmount,
      Method: paymentMethodType,
      image: paymentImage
    });

 
    if (user_id) {
      user = await User.findByPk(user_id); 
      if (user) {
        const email = user.email;
        const insuranceValue = getInsuranceValue(reservation.Chalet.description);

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Payment and Reservation Details',
          html: `
            <h3>Your Payment and Reservation Details</h3>
            <p><strong>Reservation ID:</strong> ${reservation.id}</p>
            <p><strong>Status:</strong> ${reservation.Status}</p>
            <p><strong>CashBack:</strong> ${reservation.cashback}</p>
            <p><strong>Start Date:</strong> ${reservation.start_date}</p>
            <p><strong>End Date:</strong> ${reservation.end_date}</p>
            <p><strong>Time:</strong> ${reservation.Time}</p>
            <p><strong>Reservation Type:</strong> ${reservation.Reservation_Type}</p>
            <p><strong>Additional Visitors:</strong> ${reservation.additional_visitors}</p>
            <p><strong>Number of Days:</strong> ${reservation.number_of_days}</p>
            <p><strong>Initial Payment:</strong> ${initialAmount}</p>
            <p><strong>Remaining Amount:</strong> ${remainingAmount}</p>
            <h4>Payment Method: ${paymentMethod}</h4>
            <p><strong>User Name:</strong> ${UserName}</p>
            <p><strong>Phone Number:</strong> ${Phone_Number}</p>
            <h3>Chalet Details</h3>
            <p><strong>Name:</strong> ${reservation.Chalet.title ?? 'Not available'}</p>
            <p><strong>Description:</strong> ${reservation.Chalet.description ?? 'Not available'}</p>
            <p><strong>Rating:</strong> ${reservation.Chalet.Rating ?? 'Not available'}</p>
            <p><strong>City:</strong> ${reservation.Chalet.city ?? 'Not available'}</p>
            <p><strong>Area:</strong> ${reservation.Chalet.area ?? 'Not available'}</p>
            <p><strong>Initial Amount:</strong> ${reservation.Chalet.intial_Amount ?? 'Not available'}</p>
            <p><strong>Features:</strong> ${reservation.Chalet.features ?? 'Not available'}</p>
            ${insuranceValue ? `<p><strong>Insurance:</strong> ${insuranceValue} دينار</p>` : ''}
          `,
        };

        await transporter.sendMail(mailOptions);
      }
    }

    res.status(201).json({
      message: 'Payment created successfully, and email sent if logged in!',
      payment: newPayment,
      reservation: reservation,
    });

  } catch (error) {
    console.error('Error in createPayment:', error.message);
    res.status(500).json(
      ErrorResponse('Failed to create payment', [
        'An internal server error occurred.',
      ])
    );
  }
};


const getInsuranceValue = (description) => {
  const match = description.match(/(?:التامين|insurance)\s*[:\-]?\s*(\d+)\s*(دينار?)/i);
  return match ? parseInt(match[1]) : null;
};







 


  // exports.createPaymentIntent = async(req, res) => {
  //   try {
  //     const { amount } = req.body;
 
  //     if (!amount || isNaN(amount) || amount <= 0) {
  //       return res.status(400).send({ error: 'Invalid amount provided.' });
  //     }
 
     
  //     const paymentIntent = await stripe.paymentIntents.create({
  //       amount: amount * 100,  
  //       currency: 'usd',
  //       // payment_method_types: ['card'],  
  //     });
 
   
  //     res.send({
  //       clientSecret: paymentIntent.client_secret,
  //     });
  //   } catch (error) {
  //     console.error('Stripe Error:', error);
  //     res.status(400).send({ error: error.message });
  //   }
  // };


  const axios = require('axios');
const Chalet = require('../Models/ChaletsModel');
const User = require('../Models/UsersModel');

  exports.createPaymentIntent = async (req, res) => {
    try {
      const { amount, currency, phone, reservation_id } = req.body;
  
     
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).send({ error: 'Invalid amount provided.' });
      }
  
      let convertedAmount = amount;
  
      
      if (currency === 'jod') {
        const response = await axios.get('https://v6.exchangerate-api.com/v6/48fb1b6e8b9bab92bb9abe37/latest/USD');
        const exchangeRate = response.data.conversion_rates.JOD;
        convertedAmount = amount * exchangeRate;
      }
  
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: convertedAmount * 100,  
        currency: currency === 'jod' ? 'jod' : 'usd',
      });
  
      
      const reservation = await ReservationChalets.findOne({ where: { id: reservation_id } });
  
     
      if (!reservation) {
        return res.status(404).send({ error: 'Reservation not found.' });
      }
  
    
      reservation.Status = 'Confirmed';
      await reservation.save();  
        res.send({
          clientSecret: paymentIntent.client_secret,
          referenceId: paymentIntent.id,
          phone: phone,
        });
      
        return res.status(400).send({ error: 'Payment was not successful.' });
      
    } catch (error) {
      console.error('Stripe Error:', error);
      res.status(400).send({ error: error.message });
    }
  };
  
  
  
  
  
  

  // exports.createPaymentIntent = async (req, res) => {
  //   try {
  //     const { amount, currency, phone, payment_type } = req.body;
      
  //     if (!amount || isNaN(amount) || amount <= 0) {
  //       return res.status(400).send({ error: 'Invalid amount provided.' });
  //     }
  
  //     let convertedAmount = amount; 
  

  //     let paymentDescription = "";
  
  //     if (payment_type === "initial") {
  //       paymentDescription = "Initial Payment";
  //     } else if (payment_type === "total") {
  //       paymentDescription = "Full Payment";
  //     } else {
  //       return res.status(400).send({ error: "Invalid payment type. Please specify either 'initial' or 'total'." });
  //     }
  

  //     if (currency === 'jod') {
  //       const response = await axios.get('https://v6.exchangerate-api.com/v6/48fb1b6e8b9bab92bb9abe37/latest/USD');
  //       const exchangeRate = response.data.conversion_rates.JOD;  
  //       convertedAmount = amount * exchangeRate;
  //     }
  
     
  //     const paymentIntent = await stripe.paymentIntents.create({
  //       amount: convertedAmount * 100, 
  //       currency: currency === 'jod' ? 'jod' : 'usd',
  //       // payment_method_types: ['card'],
  //       description: paymentDescription, 
  //     });
  
  //     res.send({
  //       clientSecret: paymentIntent.client_secret,
  //       referenceId: paymentIntent.id,
  //       phone: phone, 
  //     });
  //   } catch (error) {
  //     console.error('Stripe Error:', error);
  //     res.status(400).send({ error: error.message });
  //   }
  // };



  exports.getPayments = async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const { userId } = req.params; 
      const offset = (page - 1) * limit;
  
      
      if (!userId) {
        return res.status(400).json(
          ErrorResponse("Validation failed", ["User ID is required."])
        );
      }
  
      const cacheKey = `payments:userId:${userId}:page:${page}:limit:${limit}`;
  
     
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }
  
    
      const payments = await Payments.findAll({
        include: [
          {
            model: Users,
            attributes: ['id', 'name', 'email'],
            where: { id: userId },
          },
          {
            model: ReservationChalets,
            attributes: [
              'id',
              'cashback',
              'start_date',
              'end_date',
              'Time',
              'Status',
              'Reservation_Type',
              'starting_price',
              'Total_Amount',
              'additional_visitors',
              'number_of_days'
            ],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
  
      
      if (payments.length === 0) {
        return res.status(200).json(
          ErrorResponse("No payments found", ["No payments found for the given user ID."])
        );
      }
  
      
      await client.setEx(cacheKey, 3600, JSON.stringify(payments));
  
      
      res.status(200).json(payments);
    } catch (error) {
      console.error('Error in getPayments:', error.message);
      res.status(500).json(
        ErrorResponse('Failed to fetch payments', [
          'An internal server error occurred.',
        ])
      );
    }
  };
  
  




 
  exports.getAllPayments = async (req, res) => {
    try {
      const { page = 1, limit = 100 } = req.query;
      const offset = (page - 1) * limit;
  
      const payments = await Payments.findAll({
        include: [
          {
            model: Users,
            attributes: ['id', 'name', 'email'],
          },
          {
            model: ReservationChalets,
            attributes: [
              'id', 'cashback', 'start_date', 'end_date', 'Time', 'Status',
              'Reservation_Type', 'starting_price', 'Total_Amount',
              'additional_visitors', 'number_of_days', 'chalet_id',
            ],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
  
      if (!payments.length) {
        return res.status(200).json(
          ErrorResponse("No payments found", ["No payments found for the given query."])
        );
      }
  
      const chaletIds = payments.map(p => p.Reservations_Chalet?.chalet_id).filter(Boolean);
  
      const chalets = await Chalet.findAll({
        where: { id: chaletIds },
        attributes: ['id', 'title', 'description'],
      });
  
      const chaletMap = new Map(chalets.map(chalet => {
        let insuranceValue = null;
        const match = chalet.description.match(/(?:التامين|insurance)\s*[:\-]?\s*(\d+)\s*دينار?/i);
        if (match) {
          insuranceValue = parseInt(match[1]);
        }
        return [chalet.id, { ...chalet.toJSON(), insurance: insuranceValue }];
      }));
  
      const paymentsWithChaletInfo = payments.map(payment => ({
        ...payment.toJSON(),
        Chalet: chaletMap.get(payment.Reservations_Chalet?.chalet_id) || null,
      }));
  
      res.status(200).json(paymentsWithChaletInfo);
    } catch (error) {
      console.error('Error in getAllPayments:', error.message);
      res.status(500).json(
        ErrorResponse('Failed to fetch payments', ['An internal server error occurred.'])
      );
    }
  };
  
  
  
  
  
  



  exports.updatePaymentStatus = async (req, res) => {
    try {
      const { id } = req.params; 
      const { status, lang } = req.body;
  
      if (lang && !['ar', 'en'].includes(lang)) {
        return res.status(400).json({
          error: 'Invalid language',
        });
      }
  
      const payment = await Payments.findByPk(id);
      if (!payment) {
        return res.status(404).json({
          error: lang === 'en' ? 'Payment not found' : 'الدفع غير موجود',
        });
      }
  
      if (status === undefined) {
        return res.status(400).json({
          error: lang === 'en' ? 'Status is required' : 'الحالة مطلوبة',
        });
      }
  
      payment.status = status;
      await payment.save();
  
    
      const cacheKey = `payment:page:*:limit:*`;
      const keysToDelete = await client.keys(cacheKey);
      if (keysToDelete.length > 0) {
        await Promise.all(keysToDelete.map((key) => client.del(key))); 
      }
  
      res.status(200).json({
        message: lang === 'en' ? 'Payment status updated successfully' : 'تم تحديث حالة الحجز بنجاح',
        payment,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({
        error: lang === 'en' ? 'Failed to update payment status' : 'فشل في تحديث حالة الحجز',
      });
    }
  };
  



exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `payment:${id}`;

    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const payment = await Payments.findOne({
      include: [
        { model: Users, attributes: ['id', 'name', 'email'] },
        { model: ReservationChalets, attributes: ['id', 'total_amount'] },
      ],
      where: { id },
    });

    if (!payment) {
      return res
        .status(404)
        .json(
          ErrorResponse('Payment not found', [
            'No payment found with the given ID.',
          ])
        );
    }

    await client.setEx(cacheKey, 3600, JSON.stringify(payment));
    res.status(200).json(payment);
  } catch (error) {
    console.error('Error in getPaymentById:', error.message);
    res
      .status(500)
      .json(
        ErrorResponse('Failed to fetch payment', [
          'An internal server error occurred.',
        ])
      );
  }
};


exports.updatePayment = async (req, res) => {
    try {
      const { id } = req.params;
      const { status, paymentMethod } = req.body;
 
      const validationErrors = validateInput({ status, paymentMethod });
      if (validationErrors.length > 0) {
        return res
          .status(400)
          .json(ErrorResponse('Validation failed', validationErrors));
      }
 
      const payment = await Payments.findByPk(id);
      if (!payment) {
        return res
          .status(404)
          .json(
            ErrorResponse('Payment not found', [
              'No payment found with the given ID.',
            ])
          );
      }
 
      await payment.update({ status, paymentMethod });
 
      const updatedData = payment.toJSON();
 
      res.status(200).json({
        message: 'Payment updated successfully',
        payment: updatedData,
      });
    } catch (error) {
      console.error('Error in updatePayment:', error.message);
      res
        .status(500)
        .json(
          ErrorResponse('Failed to update payment', [
            'An internal server error occurred.',
          ])
        );
    }
  };
 


  exports.deletePayment = async (req, res) => {
    try {
      const { id } = req.params;
  
     
      const payment = await Payments.findByPk(id);
      if (!payment) {
        return res
          .status(404)
          .json(
            ErrorResponse('Payment not found', [
              'No payment found with the given ID.',
            ])
          );
      }
  
      
      const reservationId = payment.reservation_id; 
  
      if (reservationId) {
        

        const reservation = await ReservationChalets.findOne({
          where: { id: reservationId },
        });
  
        if (reservation) {
          
          await reservation.destroy();
        }
      }
  

      await payment.destroy();
  
      const cacheKey = `payment:${id}`;
      await client.del(cacheKey);
  
      res.status(200).json({ message: 'Payment and related reservation deleted successfully' });
    } catch (error) {
      console.error('Error in deletePayment:', error.message);
      res
        .status(500)
        .json(
          ErrorResponse('Failed to delete payment', [
            'An internal server error occurred.',
          ])
        );
    }
  };
  
  
