const Payments = require("../Models/PaymentModel");
const Users = require("../Models/UsersModel");
const ReservationChalets = require("../Models/Reservations_Chalets");
const { client } = require("../Utils/redisClient");
const { validateInput, ErrorResponse } = require("../Utils/validateInput");
const stripe = require("stripe")(
  "sk_test_51Qdn2mR2zHb3l1vg8ng6R9o3lqoO6ZJw5X0qNoqUPr65tG7t1OhQ4KVqbj0G7hT2NdJwmtzXlEj9zY2DCVXSNIKE00NeWBobTi"
);
const dotenv = require("dotenv");

// const  {Client}  = require('../Config/PayPalClient');
// const paypal = require('@paypal/checkout-server-sdk');
exports.createPayPalPayment = async (req, res) => {
  try {
    const { amount, currency, reservation_id, name } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).send({ error: "Invalid amount provided." });
    }

    if (!name || name.trim() === "") {
      return res.status(400).send({ error: "Name is required." });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency || "USD",
            value: amount.toFixed(2)
          }
        }
      ]
    });

    const order = await Client.execute(request);

    if (order.result.status === "CREATED") {
      const reservation = await ReservationChalets.findOne({
        where: { id: reservation_id }
      });

      if (!reservation) {
        return res.status(404).send({ error: "Reservation not found." });
      }

      if (reservation.Status === "Confirmed") {
        return res
          .status(400)
          .send({ error: "Reservation is already confirmed." });
      }

      reservation.Status = "Confirmed";
      await reservation.save();

      reservation.name = name;
      await reservation.save();

      res.status(201).json({
        id: order.result.id,
        status: order.result.status,
        links: order.result.links,
        message: "Payment created and reservation confirmed.",
        name: name
      });
    } else {
      return res.status(400).send({ error: "Payment creation failed." });
    }
  } catch (error) {
    console.error("PayPal Error:", error.message);
    res.status(500).send({ error: "Failed to create PayPal payment." });
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

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const WhatsAppClient = require("../Services/WhatsappServices");

exports.capturePayPalPayment = async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).send({ error: "Order ID is required." });
    }

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const capture = await Client.execute(request);

    res.status(200).json({
      id: capture.result.id,
      status: capture.result.status,
      capture_details: capture.result.purchase_units[0].payments.captures
    });
  } catch (error) {
    console.error("PayPal Error:", error.message);
    res.status(500).send({ error: "Failed to capture PayPal payment." });
  }
};

const nodemailer = require("nodemailer");

// exports.createPayment = async (req, res) => {
//   try {
//     const { user_id, reservation_id, paymentMethod, UserName, Phone_Number, initialAmount } = req.body;

//     console.log(req.body);

//     if (!reservation_id || !paymentMethod || !UserName || !Phone_Number || !initialAmount) {
//       return res.status(400).json(
//         ErrorResponse('Validation failed', [
//           'Reservation ID, paymentMethod, UserName, Phone_Number, and initialAmount are required.',
//         ])
//       );
//     }

//     const validationErrors = validateInput({ paymentMethod, UserName, Phone_Number });
//     if (validationErrors.length > 0) {
//       return res.status(400).json(ErrorResponse('Validation failed', validationErrors));
//     }

//     let user = null;

//     const reservation = await ReservationChalets.findByPk(reservation_id, {
//       include: [
//         {
//           model: Chalet,
//           attributes: ['title', 'description', 'Rating', 'city', 'area', 'intial_Amount', 'type', 'features', 'Additional_features']
//         },
//       ],
//     });

//     if (!reservation) {
//       return res.status(404).json(ErrorResponse('Validation failed', ['Reservation not found.']));
//     }

//     if (reservation.Status === 'Confirmed') {
//       return res.status(400).json({ error: 'Reservation is already confirmed.' });
//     }

//     const totalAmount = reservation.Total_Amount;
//     if (initialAmount > totalAmount) {
//       return res.status(400).json(ErrorResponse('Validation failed', ['Initial amount cannot exceed total amount.']));
//     }

//     const remainingAmount = totalAmount - initialAmount;
//     const paymentMethodType = remainingAmount > 0 ? 'initial' : 'Total';

//     let paymentImage = null;
//     if (req.file) {
//       paymentImage = req.file.path;
//     }

//     reservation.Status = 'Pending';
//     await reservation.save();

//     const newPayment = await Payments.create({
//       user_id: user_id || null,
//       reservation_id,
//       status: "Pending",
//       paymentMethod,
//       UserName,
//       Phone_Number,
//       initialAmount,
//       RemainningAmount: remainingAmount,
//       Method: paymentMethodType,
//       image: paymentImage
//     });

//     if (user_id) {
//       user = await User.findByPk(user_id);
//       if (user) {
//         const email = user.email;
//         const insuranceValue = getInsuranceValue(reservation.Chalet.description);

//         const transporter = nodemailer.createTransport({
//           service: "gmail",
//           auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASS
//           },
//           tls: {
//             rejectUnauthorized: false
//           }
//         });

//         const mailOptions = {
//           from: process.env.EMAIL_USER,
//           to: email,
//           subject: 'Payment and Reservation Details',
//           html: `
//             <h3>Your Payment and Reservation Details</h3>
//             <p><strong>Reservation ID:</strong> ${reservation.id}</p>
//             <p><strong>Status:</strong> ${reservation.Status}</p>
//             <p><strong>CashBack:</strong> ${reservation.cashback}</p>
//             <p><strong>Start Date:</strong> ${reservation.start_date}</p>
//             <p><strong>End Date:</strong> ${reservation.end_date}</p>
//             <p><strong>Time:</strong> ${reservation.Time}</p>
//             <p><strong>Reservation Type:</strong> ${reservation.Reservation_Type}</p>
//             <p><strong>Additional Visitors:</strong> ${reservation.additional_visitors}</p>
//             <p><strong>Number of Days:</strong> ${reservation.number_of_days}</p>
//             <p><strong>Initial Payment:</strong> ${initialAmount}</p>
//             <p><strong>Remaining Amount:</strong> ${remainingAmount}</p>
//             <h4>Payment Method: ${paymentMethod}</h4>
//             <p><strong>User Name:</strong> ${UserName}</p>
//             <p><strong>Phone Number:</strong> ${Phone_Number}</p>
//             <h3>Chalet Details</h3>
//             <p><strong>Name:</strong> ${reservation.Chalet.title ?? 'Not available'}</p>
//             <p><strong>Description:</strong> ${reservation.Chalet.description ?? 'Not available'}</p>
//             <p><strong>Rating:</strong> ${reservation.Chalet.Rating ?? 'Not available'}</p>
//             <p><strong>City:</strong> ${reservation.Chalet.city ?? 'Not available'}</p>
//             <p><strong>Area:</strong> ${reservation.Chalet.area ?? 'Not available'}</p>
//             <p><strong>Initial Amount:</strong> ${reservation.Chalet.intial_Amount ?? 'Not available'}</p>
//             <p><strong>Features:</strong> ${reservation.Chalet.features ?? 'Not available'}</p>
//             ${insuranceValue ? `<p><strong>Insurance:</strong> ${insuranceValue} دينار</p>` : ''}
//           `,
//         };

//         await transporter.sendMail(mailOptions);
//       }
//     }

//     if (isClientReady && Phone_Number) {
//       try {
//         // تنسيق رقم الهاتف
//         let formattedNumber = Phone_Number.replace(/^0+/, '');
//         if (!formattedNumber.startsWith('962')) {
//           formattedNumber = `962${formattedNumber}`;
//         }

//         const chatId = `${formattedNumber}@c.us`;

//         // تجهيز نص الرسالة مع المعلومات الديناميكية
//         const message = `For booking confirmation, please pay ${initialAmount}JOD 💰 as a reservation fee and a refundable security deposit of 50 JOD to be paid upon arrival at the farm 💵. Booking details are as follows:
//   Date: ${reservation.start_date} to ${reservation.end_date} 📅
//   Time: From ${reservation.Time} 🕙 - 🕘
//   Chalet Name: ${reservation.Chalet.title} 🏡
//   CliQ account name: lorans mahmood mohammed alkhateeb
//   Name that will appear on CliQ: lorans mahmood mohammed alkhateeb
//   يرجى تأكيد الدفع للمتابعة. شكراً لاختياركم روقان🌿`;

//         // إرسال الرسالة
//         await client.sendMessage(chatId, message);
//         console.log(`تم إرسال رسالة WhatsApp إلى: ${Phone_Number}`);
//       } catch (whatsappError) {
//         console.error('خطأ في إرسال رسالة WhatsApp:', whatsappError);
//         // لا نريد أن يفشل كامل العملية إذا فشل إرسال WhatsApp، لذلك نسجل الخطأ فقط
//       }
//     } else if (!isClientReady) {
//       console.log('عميل WhatsApp غير جاهز، لم يتم إرسال الرسالة');
//     }

//     res.status(201).json({
//       message: 'Payment created successfully, and email sent if logged in!',
//       payment: newPayment,
//       reservation: reservation,
//     });

//   } catch (error) {
//     console.error('Error in createPayment:', error.message);
//     res.status(500).json(
//       ErrorResponse('Failed to create payment', [
//         'An internal server error occurred.',
//       ])
//     );
//   }
// };

exports.createPayment = async (req, res) => {
  try {
    const {
      user_id,
      reservation_id,
      paymentMethod,
      UserName,
      Phone_Number,
      initialAmount
    } = req.body;

    console.log("Payment Request:", req.body);

    if (
      !reservation_id ||
      !paymentMethod ||
      !UserName ||
      !Phone_Number ||
      !initialAmount
    ) {
      return res
        .status(400)
        .json(
          ErrorResponse("Validation failed", [
            "Reservation ID, paymentMethod, UserName, Phone_Number, and initialAmount are required."
          ])
        );
    }

    const validationErrors = validateInput({
      paymentMethod,
      UserName,
      Phone_Number
    });
    if (validationErrors.length > 0) {
      return res
        .status(400)
        .json(ErrorResponse("Validation failed", validationErrors));
    }

    const reservation = await ReservationChalets.findByPk(reservation_id, {
      include: [
        {
          model: Chalet,
          attributes: [
            "title",
            "description",
            "Rating",
            "city",
            "area",
            "intial_Amount",
            "type",
            "features",
            "Additional_features"
          ]
        },
        {
          model: RightTimeModel,
          attributes: ["from_time", "to_time"]
        }
      ]
    });

    if (!reservation) {
      return res
        .status(404)
        .json(ErrorResponse("Error", ["Reservation not found"]));
    }

    if (reservation.Status === "Confirmed") {
      return res
        .status(400)
        .json(ErrorResponse("Error", ["Reservation is already confirmed"]));
    }

    const totalAmount = reservation.Total_Amount;
    if (initialAmount > totalAmount) {
      return res
        .status(400)
        .json(
          ErrorResponse("Validation failed", [
            "Initial amount cannot exceed total amount"
          ])
        );
    }

    const remainingAmount = totalAmount - initialAmount;
    const paymentMethodType = remainingAmount > 0 ? "initial" : "Total";

    let paymentImage = null;
    if (req.file) {
      paymentImage = req.file.path;
    }

    reservation.Status = "Pending";
    await reservation.save();

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


    setTimeout(async () => {
      try {
       
        const payment = await Payments.findByPk(newPayment.id);
        if (payment && payment.status !== 'Confirmed') {
          
          await payment.update({ status: 'Cancelled' });

          
          const reservation = await ReservationChalets.findByPk(payment.reservation_id);
          if (reservation) {
            await reservation.update({ Status: 'Cancelled' });
          }

         
          if (WhatsAppClient.isClientReady() && payment.Phone_Number) {
            try {
              let phoneNumber = payment.Phone_Number.replace(/\D/g, "");
              if (!phoneNumber.startsWith("962")) {
                phoneNumber = phoneNumber.startsWith("0") 
                  ? "962" + phoneNumber.substring(1) 
                  : "962" + phoneNumber;
              }

              const chatId = `${phoneNumber}@c.us`;
              const cancellationMessage = `عزيزي ${payment.UserName}،
تم إلغاء حجزك بسبب عدم إكمال إجراءات الدفع خلال المدة المحددة (ساعة ونصف).
يمكنك إعادة الحجز مرة أخرى من خلال التطبيق.
شكراً لك 🌿`;

              await WhatsAppClient.client.sendMessage(chatId, cancellationMessage);
              console.log(`Cancellation message sent to: ${chatId}`);
            } catch (error) {
              console.error("WhatsApp cancellation notification error:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error in payment cancellation timeout:", error);
      }
    },90 * 60 * 1000);


    let emailSent = false;
    if (user_id) {
      const user = await User.findByPk(user_id);
      if (user && user.email) {
        try {
          const insuranceValue = getInsuranceValue(
            reservation.Chalet.description
          );

          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            },
            tls: { rejectUnauthorized: false }
          });

          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Payment and Reservation Details",
            html: `
              <h3>Your Payment and Reservation Details</h3>
              <p><strong>Reservation ID:</strong> ${reservation.id}</p>
              <p><strong>Status:</strong> ${reservation.Status}</p>
              <p><strong>CashBack:</strong> ${reservation.cashback}</p>
              <p><strong>Start Date:</strong> ${reservation.start_date}</p>
              <p><strong>End Date:</strong> ${reservation.end_date}</p>
              <p><strong>Time:</strong> ${reservation.Time}</p>
              <p><strong>Reservation Type:</strong> ${
                reservation.Reservation_Type
              }</p>
              <p><strong>Additional Visitors:</strong> ${
                reservation.additional_visitors
              }</p>
              <p><strong>Number of Days:</strong> ${
                reservation.number_of_days
              }</p>
              <p><strong>Initial Payment:</strong> ${initialAmount}</p>
              <p><strong>Remaining Amount:</strong> ${remainingAmount}</p>
              <h4>Payment Method: ${paymentMethod}</h4>
              <p><strong>User Name:</strong> ${UserName}</p>
              <p><strong>Phone Number:</strong> ${Phone_Number}</p>
              <h3>Chalet Details</h3>
              <p><strong>Name:</strong> ${
                reservation.Chalet.title ?? "Not available"
              }</p>
              <p><strong>Description:</strong> ${
                reservation.Chalet.description ?? "Not available"
              }</p>
              <p><strong>Rating:</strong> ${
                reservation.Chalet.Rating ?? "Not available"
              }</p>
              <p><strong>City:</strong> ${
                reservation.Chalet.city ?? "Not available"
              }</p>
              <p><strong>Area:</strong> ${
                reservation.Chalet.area ?? "Not available"
              }</p>
              <p><strong>Initial Amount:</strong> ${
                reservation.Chalet.intial_Amount ?? "Not available"
              }</p>
              <p><strong>Features:</strong> ${
                reservation.Chalet.features ?? "Not available"
              }</p>
              ${
                insuranceValue
                  ? `<p><strong>Insurance:</strong> ${insuranceValue} دينار</p>`
                  : ""
              }
            `
          };

          await transporter.sendMail(mailOptions);
          emailSent = true;
        } catch (error) {
          console.error("Email error:", error);
        }
      }
    }

    const timeDetails = {
      from: reservation.RightTimeModel
        ? reservation.RightTimeModel.from_time
        : null,
      to: reservation.RightTimeModel ? reservation.RightTimeModel.to_time : null
    };

    let whatsappSent = false;
    if (WhatsAppClient.isClientReady() && Phone_Number) {
      try {
        let formattedNumber = Phone_Number.replace(/\D/g, "");
        if (formattedNumber.startsWith("962")) {
          formattedNumber = formattedNumber;
        } else if (formattedNumber.startsWith("0")) {
          formattedNumber = "962" + formattedNumber.substring(1);
        } else {
          formattedNumber = "962" + formattedNumber;
        }

        if (formattedNumber.length !== 12) {
          throw new Error("Invalid phone number length");
        }

        const chatId = `${formattedNumber}@c.us`;
        const startDate = new Date(reservation.start_date).toLocaleDateString(
          "ar-JO"
        );
        const endDate = new Date(reservation.end_date).toLocaleDateString(
          "ar-JO"
        );

        const message = `For booking confirmation, please pay ${initialAmount}JOD 💰 as a reservation fee and a refundable security deposit of 50 JOD to be paid upon arrival at the farm 💵. Booking details are as follows:
Date: ${startDate} to ${endDate} 📅
Time: From ${reservation.RightTimeModel?.from_time || ""} 🕙 to ${
          reservation.RightTimeModel?.to_time || ""
        } 🕘
Chalet Name: ${reservation.Chalet.title} 🏡
CliQ account name ${UserName}
Name that will appear on CliQ: ${UserName}
يرجى تأكيد الدفع للمتابعة. شكراً لاختياركم روقان🌿`;

        await WhatsAppClient.client.sendMessage(chatId, message);
        whatsappSent = true;
        console.log(`WhatsApp message sent to: ${Phone_Number}`);
      } catch (error) {
        console.error("WhatsApp error:", error);
      }
    } else {
      console.log("WhatsApp client not ready or phone number missing");
    }

    res.status(201).json({
      message: "Payment created successfully",
      notifications: {
        whatsapp: whatsappSent ? "sent" : "failed",
        email: emailSent ? "sent" : "not applicable"
      },
      payment: newPayment,
      reservation: reservation,
      timeDetails: timeDetails
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    res
      .status(500)
      .json(
        ErrorResponse("Failed to create payment", [
          "An internal server error occurred"
        ])
      );
  }
};





const { Op } = require('sequelize');

const deleteUnconfirmedPayments = async () => {
  try {
     const oneAndHalfHourAgo = new Date(Date.now() - 90 * 60 * 1000);

    const unconfirmedPayments = await Payments.findAll({
      where: {
        status: {
          [Op.ne]: 'Confirmed'
        },
        createdAt: {
          [Op.lt]: oneAndHalfHourAgo
        },
      }
    });

    for (const payment of unconfirmedPayments) {
      const reservation = await ReservationChalets.findByPk(payment.reservation_id);
     
      if (WhatsAppClient.isClientReady() && payment.Phone_Number) {
        try {
          let phoneNumber = payment.Phone_Number;
          phoneNumber = "+962" + phoneNumber.replace(/^0/, "");
          
          console.log('Original Phone Number:', payment.Phone_Number);
          console.log('Formatted Phone Number:', phoneNumber);

          const chatId = `${phoneNumber.replace("+", "")}@c.us`;
          console.log('Chat ID:', chatId);

          const message = `عزيزي ${payment.UserName}،
تم إلغاء حجزك بسبب عدم إكمال إجراءات الدفع خلال المدة المحددة.
يمكنك إعادة الحجز مرة أخرى من خلال التطبيق.
شكراً لك 🌿`;

          await WhatsAppClient.client.sendMessage(chatId, message);
          console.log(`Cancellation WhatsApp message sent to: ${chatId}`);
        } catch (error) {
          console.error("WhatsApp error:", error);
        }
      }

      if (reservation) {
        await reservation.update({ 
          Status: 'Cancelled' 
        }, { 
          where: { id: reservation.id } 
        });
        console.log(`Updated reservation status to Cancelled: ${reservation.id}`);
      }

      await payment.update({ 
        status: 'Cancelled' 
      }, { 
        where: { id: payment.id } 
      });
      console.log(`Updated payment status to Cancelled: ${payment.id}, created at: ${payment.createdAt}`);
    }

    console.log('Status update completed successfully');
  } catch (error) {
    console.error('Error in update task:', error);
  }
};

setInterval(deleteUnconfirmedPayments, 2 * 60 * 1000);





// exports.createPayment = async (req, res) => {
//   try {
//     const {
//       user_id,
//       reservation_id,
//       paymentMethod,
//       UserName,
//       Phone_Number,
//       initialAmount
//     } = req.body;

//     console.log("Payment Request:", req.body);

//     if (
//       !reservation_id ||
//       !paymentMethod ||
//       !UserName ||
//       !Phone_Number ||
//       !initialAmount
//     ) {
//       return res.status(400).json(
//         ErrorResponse("Validation failed", [
//           "Reservation ID, paymentMethod, UserName, Phone_Number, and initialAmount are required."
//         ])
//       );
//     }

//     const validationErrors = validateInput({
//       paymentMethod,
//       UserName,
//       Phone_Number
//     });
//     if (validationErrors.length > 0) {
//       return res.status(400).json(ErrorResponse("Validation failed", validationErrors));
//     }

//     const reservation = await ReservationChalets.findByPk(reservation_id, {
//       include: [
//         {
//           model: Chalet,
//           attributes: [
//             "title",
//             "description",
//             "Rating",
//             "city",
//             "area",
//             "intial_Amount",
//             "type",
//             "features",
//             "Additional_features"
//           ]
//         },
//         {
//           model: RightTimeModel,
//           attributes: ["from_time", "to_time"]
//         }
//       ]
//     });

//     if (!reservation) {
//       return res.status(404).json(ErrorResponse("Error", ["Reservation not found"]));
//     }

//     if (reservation.Status === "Confirmed") {
//       return res.status(400).json(ErrorResponse("Error", ["Reservation is already confirmed"]));
//     }

//     const totalAmount = reservation.Total_Amount;
//     if (initialAmount > totalAmount) {
//       return res.status(400).json(
//         ErrorResponse("Validation failed", ["Initial amount cannot exceed total amount"])
//       );
//     }

//     const remainingAmount = totalAmount - initialAmount;
//     const paymentMethodType = remainingAmount > 0 ? "initial" : "Total";

//     let paymentImage = null;
//     if (req.file) {
//       paymentImage = req.file.path;
//     }

//     reservation.Status = "Pending";
//     await reservation.save();

//     const newPayment = await Payments.create({
//       user_id: user_id || null,
//       reservation_id,
//       status: "Pending",
//       paymentMethod,
//       UserName,
//       Phone_Number,
//       initialAmount,
//       RemainningAmount: remainingAmount,
//       Method: paymentMethodType,
//       image: paymentImage
//     });

//     // Schedule payment cancellation after 1.5 hours
//     setTimeout(async () => {
//       try {
//         const payment = await Payments.findByPk(newPayment.id);
//         if (payment && payment.status !== 'Confirmed') {
//           // Update payment status
//           await payment.update({ status: 'Cancelled' });

//           // Update reservation status
//           const reservation = await ReservationChalets.findByPk(payment.reservation_id);
//           if (reservation) {
//             await reservation.update({ Status: 'Cancelled' });
//           }

//           // Send WhatsApp notification
//           if (WhatsAppClient.isClientReady() && payment.Phone_Number) {
//             try {
//               let phoneNumber = payment.Phone_Number;
//               if (!phoneNumber.startsWith("+962")) {
//                 phoneNumber = phoneNumber.startsWith("0") 
//                   ? "+962" + phoneNumber.slice(1) 
//                   : "+962" + phoneNumber;
//               }

//               const chatId = `${phoneNumber.replace("+", "")}@c.us`;
              
//               const message = `عزيزي ${payment.UserName}،
// تم إلغاء حجزك بسبب عدم إكمال إجراءات الدفع خلال المدة المحددة.
// يمكنك إعادة الحجز مرة أخرى من خلال التطبيق.
// شكراً لك 🌿`;

//               await WhatsAppClient.client.sendMessage(chatId, message);
//               console.log(`Cancellation WhatsApp message sent to: ${chatId}`);
//             } catch (error) {
//               console.error("WhatsApp notification error:", error);
//             }
//           }
//         }
//       } catch (error) {
//         console.error("Error in payment cancellation timeout:", error);
//       }
//     }, 2 * 60 * 1000); // 2 minutes

//     let emailSent = false;
//     if (user_id) {
//       const user = await User.findByPk(user_id);
//       if (user && user.email) {
//         try {
//           const insuranceValue = getInsuranceValue(reservation.Chalet.description);

//           const transporter = nodemailer.createTransport({
//             service: "gmail",
//             auth: {
//               user: process.env.EMAIL_USER,
//               pass: process.env.EMAIL_PASS
//             },
//             tls: { rejectUnauthorized: false }
//           });

//           const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to: user.email,
//             subject: "Payment and Reservation Details",
//             html: `
//               <h3>Your Payment and Reservation Details</h3>
//               <p><strong>Reservation ID:</strong> ${reservation.id}</p>
//               <p><strong>Status:</strong> ${reservation.Status}</p>
//               <p><strong>CashBack:</strong> ${reservation.cashback}</p>
//               <p><strong>Start Date:</strong> ${reservation.start_date}</p>
//               <p><strong>End Date:</strong> ${reservation.end_date}</p>
//               <p><strong>Time:</strong> ${reservation.Time}</p>
//               <p><strong>Reservation Type:</strong> ${reservation.Reservation_Type}</p>
//               <p><strong>Additional Visitors:</strong> ${reservation.additional_visitors}</p>
//               <p><strong>Number of Days:</strong> ${reservation.number_of_days}</p>
//               <p><strong>Initial Payment:</strong> ${initialAmount}</p>
//               <p><strong>Remaining Amount:</strong> ${remainingAmount}</p>
//               <h4>Payment Method: ${paymentMethod}</h4>
//               <p><strong>User Name:</strong> ${UserName}</p>
//               <p><strong>Phone Number:</strong> ${Phone_Number}</p>
//               <h3>Chalet Details</h3>
//               <p><strong>Name:</strong> ${reservation.Chalet.title ?? "Not available"}</p>
//               <p><strong>Description:</strong> ${reservation.Chalet.description ?? "Not available"}</p>
//               <p><strong>Rating:</strong> ${reservation.Chalet.Rating ?? "Not available"}</p>
//               <p><strong>City:</strong> ${reservation.Chalet.city ?? "Not available"}</p>
//               <p><strong>Area:</strong> ${reservation.Chalet.area ?? "Not available"}</p>
//               <p><strong>Initial Amount:</strong> ${reservation.Chalet.intial_Amount ?? "Not available"}</p>
//               <p><strong>Features:</strong> ${reservation.Chalet.features ?? "Not available"}</p>
//               ${insuranceValue ? `<p><strong>Insurance:</strong> ${insuranceValue} دينار</p>` : ""}
//             `
//           };

//           await transporter.sendMail(mailOptions);
//           emailSent = true;
//         } catch (error) {
//           console.error("Email error:", error);
//         }
//       }
//     }

//     const timeDetails = {
//       from: reservation.RightTimeModel ? reservation.RightTimeModel.from_time : null,
//       to: reservation.RightTimeModel ? reservation.RightTimeModel.to_time : null
//     };

//     let whatsappSent = false;
//     if (WhatsAppClient.isClientReady() && Phone_Number) {
//       try {
//         let formattedNumber = Phone_Number.replace(/\D/g, "");
//         if (formattedNumber.startsWith("962")) {
//           formattedNumber = formattedNumber;
//         } else if (formattedNumber.startsWith("0")) {
//           formattedNumber = "962" + formattedNumber.substring(1);
//         } else {
//           formattedNumber = "962" + formattedNumber;
//         }

//         if (formattedNumber.length !== 12) {
//           throw new Error("Invalid phone number length");
//         }

//         const chatId = `${formattedNumber}@c.us`;
//         const startDate = new Date(reservation.start_date).toLocaleDateString("ar-JO");
//         const endDate = new Date(reservation.end_date).toLocaleDateString("ar-JO");

//         const message = `For booking confirmation, please pay ${initialAmount}JOD 💰 as a reservation fee and a refundable security deposit of 50 JOD to be paid upon arrival at the farm 💵. Booking details are as follows:
// Date: ${startDate} to ${endDate} 📅
// Time: From ${reservation.RightTimeModel?.from_time || ""} 🕙 to ${reservation.RightTimeModel?.to_time || ""} 🕘
// Chalet Name: ${reservation.Chalet.title} 🏡
// CliQ account name: ${UserName}
// Name that will appear on CliQ: ${UserName}
// يرجى تأكيد الدفع للمتابعة. شكراً لاختياركم روقان🌿`;

//         await WhatsAppClient.client.sendMessage(chatId, message);
//         whatsappSent = true;
//         console.log(`WhatsApp message sent to: ${Phone_Number}`);
//       } catch (error) {
//         console.error("WhatsApp error:", error);
//       }
//     } else {
//       console.log("WhatsApp client not ready or phone number missing");
//     }

//     res.status(201).json({
//       message: "Payment created successfully",
//       notifications: {
//         whatsapp: whatsappSent ? "sent" : "failed",
//         email: emailSent ? "sent" : "not applicable"
//       },
//       payment: newPayment,
//       reservation: reservation,
//       timeDetails: timeDetails,
//       expiresAt: new Date(Date.now() + 2 * 60 * 1000) // Add expiration time (2 minutes)
//     });

//   } catch (error) {
//     console.error("Payment creation error:", error);
//     res.status(500).json(
//       ErrorResponse("Failed to create payment", ["An internal server error occurred"])
//     );
//   }
// };

// Keep the interval as a backup system but run it less frequently
setInterval(deleteUnconfirmedPayments, 2 * 60 * 1000);



const getInsuranceValue = (description) => {
  const match = description.match(
    /(?:التامين|insurance)\s*[:\-]?\s*(\d+)\s*(دينار?)/i
  );
  return match ? parseInt(match[1]) : null;
};












exports.UpdatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      UserName, 
      Phone_Number, 
      RemainningAmount,
      initialAmount, 
      Method, 
      paymentMethod 
    } = req.body;
    const image = req.file?.filename || null;

    
    const payment = await Payments.findByPk(id);
    if (!payment) {
      return res
        .status(404)
        .json(
          ErrorResponse("Payment not found", [
            "No payment found with the given ID."
          ])
        );
    }

   
    const validationErrors = validateInput({ 
      UserName, 
      Phone_Number, 
      paymentMethod 
    });
    if (validationErrors.length > 0) {
      return res
        .status(400)
        .json(ErrorResponse("Validation failed", validationErrors));
    }

   
    if (initialAmount && isNaN(initialAmount)) {
      return res
        .status(400)
        .json(
          ErrorResponse("Validation failed", [
            "Initial amount must be a valid number."
          ])
        );
    }

    if (RemainningAmount && isNaN(RemainningAmount)) {
      return res
        .status(400)
        .json(
          ErrorResponse("Validation failed", [
            "Remaining amount must be a valid number."
          ])
        );
    }
 
    const updatedFields = {};
    if (UserName && UserName !== payment.UserName) 
      updatedFields.UserName = UserName;
    
    if (Phone_Number && Phone_Number !== payment.Phone_Number) 
      updatedFields.Phone_Number = Phone_Number;
    
    if (initialAmount && initialAmount !== payment.initialAmount)
      updatedFields.initialAmount = initialAmount;
    
    if (RemainningAmount && RemainningAmount !== payment.RemainningAmount) 
      updatedFields.RemainningAmount = RemainningAmount;
    
    if (Method && Method !== payment.Method) 
      updatedFields.Method = Method;
    
    if (paymentMethod && paymentMethod !== payment.paymentMethod) 
      updatedFields.paymentMethod = paymentMethod;
    
    if (image) 
      updatedFields.image = image;

    
    if (Object.keys(updatedFields).length > 0) {
      await payment.update(updatedFields);
    }

   
    const updatedPayment = await Payments.findOne({
      where: { id },
      include: [
        {
          model: Users,
          attributes: ["id", "name", "email"]
        },
        {
          model: ReservationChalets,
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
            "number_of_days"
          ]
        }
      ]
    });

    
    return res.status(200).json({
      message: "Payment updated successfully",
      payment: updatedPayment
    });

  } catch (error) {
    console.error("Error in UpdatePayment:", error);
    return res
      .status(500)
      .json(
        ErrorResponse("Failed to update payment", [
          "An internal server error occurred. Please try again later."
        ])
      );
  }
};;











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

const axios = require("axios");
const Chalet = require("../Models/ChaletsModel");
const User = require("../Models/UsersModel");
const RightTimeModel = require("../Models/RightTimeModel");

exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency, phone, reservation_id } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).send({ error: "Invalid amount provided." });
    }

    let convertedAmount = amount;

    if (currency === "jod") {
      const response = await axios.get(
        "https://v6.exchangerate-api.com/v6/48fb1b6e8b9bab92bb9abe37/latest/USD"
      );
      const exchangeRate = response.data.conversion_rates.JOD;
      convertedAmount = amount * exchangeRate;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: convertedAmount * 100,
      currency: currency === "jod" ? "jod" : "usd"
    });

    const reservation = await ReservationChalets.findOne({
      where: { id: reservation_id }
    });

    if (!reservation) {
      return res.status(404).send({ error: "Reservation not found." });
    }

    reservation.Status = "Confirmed";
    await reservation.save();
    res.send({
      clientSecret: paymentIntent.client_secret,
      referenceId: paymentIntent.id,
      phone: phone
    });

    return res.status(400).send({ error: "Payment was not successful." });
  } catch (error) {
    console.error("Stripe Error:", error);
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
      return res
        .status(400)
        .json(ErrorResponse("Validation failed", ["User ID is required."]));
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
          attributes: ["id", "name", "email"],
          where: { id: userId }
        },
        {
          model: ReservationChalets,
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
            "number_of_days"
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (payments.length === 0) {
      return res
        .status(200)
        .json(
          ErrorResponse("No payments found", [
            "No payments found for the given user ID."
          ])
        );
    }

    await client.setEx(cacheKey, 3600, JSON.stringify(payments));

    res.status(200).json(payments);
  } catch (error) {
    console.error("Error in getPayments:", error.message);
    res
      .status(500)
      .json(
        ErrorResponse("Failed to fetch payments", [
          "An internal server error occurred."
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
          attributes: ["id", "name", "email"]
        },
        {
          model: ReservationChalets,
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
            "chalet_id"
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (!payments.length) {
      return res
        .status(200)
        .json(
          ErrorResponse("No payments found", [
            "No payments found for the given query."
          ])
        );
    }

    const chaletIds = payments
      .map((p) => p.Reservations_Chalet?.chalet_id)
      .filter(Boolean);

    const chalets = await Chalet.findAll({
      where: { id: chaletIds },
      attributes: ["id", "title", "description"]
    });

    const chaletMap = new Map(
      chalets.map((chalet) => {
        let insuranceValue = null;
        const match = chalet.description.match(
          /(?:التامين|insurance)\s*[:\-]?\s*(\d+)\s*دينار?/i
        );
        if (match) {
          insuranceValue = parseInt(match[1]);
        }
        return [chalet.id, { ...chalet.toJSON(), insurance: insuranceValue }];
      })
    );

    const paymentsWithChaletInfo = payments.map((payment) => ({
      ...payment.toJSON(),
      Chalet: chaletMap.get(payment.Reservations_Chalet?.chalet_id) || null
    }));

    res.status(200).json(paymentsWithChaletInfo);
  } catch (error) {
    console.error("Error in getAllPayments:", error.message);
    res
      .status(500)
      .json(
        ErrorResponse("Failed to fetch payments", [
          "An internal server error occurred."
        ])
      );
  }
};

// exports.updatePaymentStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, lang } = req.body;

//     if (lang && !["ar", "en"].includes(lang)) {
//       return res.status(400).json({
//         error: "Invalid language"
//       });
//     }

//     const payment = await Payments.findByPk(id);
//     if (!payment) {
//       return res.status(404).json({
//         error: lang === "en" ? "Payment not found" : "الدفع غير موجود"
//       });
//     }

//     if (status === undefined) {
//       return res.status(400).json({
//         error: lang === "en" ? "Status is required" : "الحالة مطلوبة"
//       });
//     }

//     payment.status = status;
//     await payment.save();

//     const reservation = await ReservationChalets.findByPk(
//       payment.reservation_id
//     );
//     if (!reservation) {
//       return res.status(404).json({
//         error: lang === "en" ? "Reservation not found" : "الحجز غير موجود"
//       });
//     }

//     reservation.Status = "Confirmed";
//     await reservation.save();

//     const cacheKey = `payment:page:*:limit:*`;
//     const keysToDelete = await client.keys(cacheKey);
//     if (keysToDelete.length > 0) {
//       await Promise.all(keysToDelete.map((key) => client.del(key)));
//     }

//     res.status(200).json({
//       message:
//         lang === "en"
//           ? "Payment and reservation status updated to Confirmed successfully"
//           : "تم تحديث حالة الدفع والحجز إلى مؤكدة بنجاح",
//       payment,
//       reservation
//     });
//   } catch (error) {
//     console.error("Error updating payment status:", error);
//     res.status(500).json({
//       error:
//         lang === "en"
//           ? "Failed to update payment and reservation status"
//           : "فشل في تحديث حالة الدفع والحجز"
//     });
//   }
// };

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, lang } = req.body;

    if (lang && !["ar", "en"].includes(lang)) {
      return res.status(400).json({
        error: "Invalid language"
      });
    }

    const payment = await Payments.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        error: lang === "en" ? "Payment not found" : "الدفع غير موجود"
      });
    }

    if (status === undefined) {
      return res.status(400).json({
        error: lang === "en" ? "Status is required" : "الحالة مطلوبة"
      });
    }

    payment.status = status;
    await payment.save();

    
    const reservation = await ReservationChalets.findByPk(
      payment.reservation_id,
      {
        include: [
          {
            model: Chalet,
            attributes: ["title"]
          },
          {
            model: RightTimeModel,
            attributes: ["from_time", "to_time","type_of_time"]
          }
        ]
      }
    );

    if (!reservation) {
      return res.status(404).json({
        error: lang === "en" ? "Reservation not found" : "الحجز غير موجود"
      });
    }

    reservation.status = "Confirmed";
    await reservation.save();

    if (WhatsAppClient.isClientReady() && payment.Phone_Number) {
      try {
        let phoneNumber = payment.Phone_Number;

    
    if (!phoneNumber.startsWith("+962")) {
      phoneNumber = phoneNumber.startsWith("0") 
        ? "+962" + phoneNumber.slice(1) 
        : "+962" + phoneNumber;
    }

    console.log("Original Phone Number:", payment.Phone_Number);
    console.log("Formatted Phone Number:", phoneNumber);

    const chatId = `${phoneNumber.replace("+", "")}@c.us`;
        console.log("Chat ID:", chatId);

        const paymentDate = new Date().toLocaleDateString("ar-JO");
        const reservationDate = new Date(
          reservation.start_date
        ).toLocaleDateString("ar-JO");

        const fromTime = reservation.RightTimeModel?.from_time || "";
        const toTime = reservation.RightTimeModel?.to_time || "";
        const type_of_time = reservation.RightTimeModel?.type_of_time || "";

        const message = `اسم المستأجر: ${payment.UserName}
تاريخ الدفع: ${paymentDate}
المبلغ المدفوع: ${payment.initialAmount} دينار 💰
المبلغ المتبقي: ${payment.RemainningAmount} دينار (تدفع عند الوصول للمزرعة) 💵
تفاصيل الحجز:
التاريخ: ${reservationDate} 📅
نوع الحجز: ${type_of_time}
الوقت: من الساعة ${fromTime} إلى الساعة ${toTime} 🕙 - 🕘
اسم الشاليه: ${reservation.Chalet.title} 🏡
شكراً لاختياركم "روقان" 🌿`;

        await WhatsAppClient.client.sendMessage(chatId, message);
        console.log(`Confirmation WhatsApp message sent to: ${chatId}`);
      } catch (error) {
        console.error("WhatsApp error:", error);
      }
    }

    const cacheKey = `payment:page:*:limit:*`;
    const keysToDelete = await client.keys(cacheKey);
    if (keysToDelete.length > 0) {
      await Promise.all(keysToDelete.map((key) => client.del(key)));
    }

    res.status(200).json({
      message:
        lang === "en"
          ? "Payment and reservation status updated to Confirmed successfully"
          : "تم تحديث حالة الدفع والحجز إلى مؤكدة بنجاح",
      payment,
      reservation,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      error:
        lang === "en"
          ? "Failed to update payment and reservation status"
          : "فشل في تحديث حالة الدفع والحجز"
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
        { model: Users, attributes: ["id", "name", "email"] },
        { model: ReservationChalets, attributes: ["id", "total_amount"] }
      ],
      where: { id }
    });

    if (!payment) {
      return res
        .status(404)
        .json(
          ErrorResponse("Payment not found", [
            "No payment found with the given ID."
          ])
        );
    }

    await client.setEx(cacheKey, 3600, JSON.stringify(payment));
    res.status(200).json(payment);
  } catch (error) {
    console.error("Error in getPaymentById:", error.message);
    res
      .status(500)
      .json(
        ErrorResponse("Failed to fetch payment", [
          "An internal server error occurred."
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
        .json(ErrorResponse("Validation failed", validationErrors));
    }

    const payment = await Payments.findByPk(id);
    if (!payment) {
      return res
        .status(404)
        .json(
          ErrorResponse("Payment not found", [
            "No payment found with the given ID."
          ])
        );
    }

    await payment.update({ status, paymentMethod });

    const updatedData = payment.toJSON();

    res.status(200).json({
      message: "Payment updated successfully",
      payment: updatedData
    });
  } catch (error) {
    console.error("Error in updatePayment:", error.message);
    res
      .status(500)
      .json(
        ErrorResponse("Failed to update payment", [
          "An internal server error occurred."
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
          ErrorResponse("Payment not found", [
            "No payment found with the given ID."
          ])
        );
    }

    const reservationId = payment.reservation_id;

    if (reservationId) {
      const reservation = await ReservationChalets.findOne({
        where: { id: reservationId }
      });

      if (reservation) {
        await reservation.destroy();
      }
    }

    await payment.destroy();

    const cacheKey = `payment:${id}`;
    await client.del(cacheKey);

    res.status(200).json({
      message: "Payment and related reservation deleted successfully"
    });
  } catch (error) {
    console.error("Error in deletePayment:", error.message);
    res
      .status(500)
      .json(
        ErrorResponse("Failed to delete payment", [
          "An internal server error occurred."
        ])
      );
  }
};
