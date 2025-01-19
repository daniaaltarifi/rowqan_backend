const  Payments  = require('../Models/PaymentModel');
const  Users  = require('../Models/UsersModel');
const  ReservationChalets  = require('../Models/Reservations_Chalets');
const { client } = require('../Utils/redisClient');
const { validateInput, ErrorResponse } = require('../Utils/validateInput');
const stripe = require('stripe')('sk_test_51Qdn2mR2zHb3l1vg8ng6R9o3lqoO6ZJw5X0qNoqUPr65tG7t1OhQ4KVqbj0G7hT2NdJwmtzXlEj9zY2DCVXSNIKE00NeWBobTi');



const  {Client}  = require('../Config/PayPalClient');
const paypal = require('@paypal/checkout-server-sdk'); 

exports.createPayPalPayment = async (req, res) => {
  try {
    const { amount, currency, user_id, reservation_id } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).send({ error: 'Invalid amount provided.' });
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

  
    if (order.result.status === "COMPLETED") {
     
      const reservation = await ReservationChalets.update(
        { status: "confirmed", amount_paid: amount, currency: currency || "USD" },
        { where: { reservation_id }, returning: true, plain: true }
      );

      res.status(201).json({
        message: 'Payment and reservation confirmed successfully',
        reservation: reservation[1],  
      });
    } else {
     
      const reservation = await ReservationChalets.update(
        { Status: "rejected" },
        { where: { reservation_id }, returning: true, plain: true }
      );

      res.status(400).json({
        error: 'Payment was not successful, reservation status updated to rejected.',
        reservation: reservation[1],  
      });
    }
  } catch (error) {
    console.error('PayPal Error:', error.message);
    res.status(500).send({ error: 'Failed to create PayPal payment.' });
  }
};




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


exports.createPayment = async (req, res) => {
    try {
      const { user_id, reservation_id, status, paymentMethod,UserName,Phone_Number } = req.body;
 
      if (!reservation_id || !status || !paymentMethod || !UserName || !Phone_Number) {
        return res
          .status(400)
          .json(
            ErrorResponse('Validation failed', [
              ' reservation, status, and paymentMethod are required.',
            ])
          );
      }
 
      const validationErrors = validateInput({ status, paymentMethod,UserName,Phone_Number });
      if (validationErrors.length > 0) {
        return res
          .status(400)
          .json(ErrorResponse('Validation failed', validationErrors));
      }
 
      const user = await Users.findByPk(user_id);
      const reservation = await ReservationChalets.findByPk(reservation_id);
 
      if (!reservation) {
        return res
          .status(404)
          .json(
            ErrorResponse('Validation failed', [
              ' Reservation not found.',
            ])
          );
      }
 
      const newPayment = await Payments.create({
        user_id,
        reservation_id,
        status,
        paymentMethod,
        UserName,
        Phone_Number,
      });
 
      res.status(201).json({
        message: 'Payment created successfully',
        payment: newPayment,
      });
    } catch (error) {
      console.error('Error in createPayment:', error.message);
      res
        .status(500)
        .json(
          ErrorResponse('Failed to create payment', [
            'An internal server error occurred.',
          ])
        );
    }
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


  exports.createPaymentIntent = async (req, res) => {
    try {
      const { amount, currency, phone, reservation_id } = req.body;
  
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).send({ error: 'Invalid amount provided.' });
      }
  
      let convertedAmount = amount;
  
      if (currency === 'usd') {
        const response = await axios.get('https://v6.exchangerate-api.com/v6/48fb1b6e8b9bab92bb9abe37/latest/USD');
        const exchangeRate = response.data.conversion_rates.JOD;  
  
        convertedAmount = amount * exchangeRate;
      }
  
      
      const amountInCents = Math.round(convertedAmount * 100);
  
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency === 'jod' ? 'jod' : 'USD',
      });
  
      console.log('PaymentIntent:', paymentIntent);
  
      if (paymentIntent.status === "succeeded") {
        const reservation = await ReservationChalets.update(
          { status: "confirmed" },
          { where: { id: reservation_id } }
        );
  
        if (reservation[0] === 0) {
          return res.status(404).send({ error: 'Reservation not found.' });
        }
  
        res.send({
          message: 'Payment succeeded and reservation confirmed.',
          clientSecret: paymentIntent.client_secret,
          referenceId: paymentIntent.id,
          phone: phone,
        });
      } else {
        console.log('Payment failed:', paymentIntent);  
        return res.status(400).send({ error: 'Payment was not successful.' });
      }
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
              'reserve_price',
              'total_amount',
              'cashback',
              'date',
              'status',
              'additional_visitors',
              'number_of_days',
              'remaining_amount',
            ],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
  
      
      if (payments.length === 0) {
        return res.status(404).json(
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

    await payment.destroy();

    const cacheKey = `payment:${id}`;
    await client.del(cacheKey);

    res.status(200).json({ message: 'Payment deleted successfully' });
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
