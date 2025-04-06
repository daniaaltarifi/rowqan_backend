const Chalet = require('../Models/ChaletsModel');
const Messages = require('../Models/MessageModel');
const User = require('../Models/UsersModel');
const Users = require('../Models/UsersModel');
const { Sequelize } = require('sequelize');
const emitSocketEvent = (socketIoInstance, event, data) => {
  if (socketIoInstance) {
    socketIoInstance.emit(event, data);
  } else {
    console.error('socketIoInstance is undefined');
  }
};








const nodemailer = require('nodemailer');


exports.createMessage = async (req, res) => {
  try {
    const { senderId, status, receiverId, message, lang, chaletId } = req.body;
    console.log('Creating message with receiverId:', receiverId);
  
    const newMessage = await Messages.create({
      senderId,
      status,
      receiverId,
      message,
      lang,
      chaletId, 
    });

    emitSocketEvent(req.socketIoInstance, 'receive_message', newMessage);

    try {
      const receiver = await User.findByPk(receiverId);
      console.log('Receiver found:', receiver ? 'yes' : 'no'); 
      console.log('Receiver email:', receiver?.email); 
      
      let hasExistingMessages = false;
      
      if (receiverId) {
        const query = {
          where: {
            receiverId
          },
          order: [['createdAt', 'DESC']],
          offset: 1
        };
        
        if (senderId) {
          query.where.senderId = senderId;
        }

        const previousMessage = await Messages.findOne(query);
        hasExistingMessages = !!previousMessage;
        console.log('Has existing messages:', hasExistingMessages); 
      }

      if (!hasExistingMessages) {
        console.log('Attempting to send first-time notification'); 
        let senderInfo = 'End User';
        if (senderId) {
          try {
            const sender = await User.findByPk(senderId);
            if (sender) {
              senderInfo = sender.name || sender.username || `User #${senderId}`;
            }
            console.log('Sender info:', senderInfo); 
          } catch (senderError) {
            console.error('Error fetching sender info:', senderError);
          }
        }

        if (receiver && receiver.email) {
          try {
            console.log('Email configuration:', {
              user: process.env.EMAIL_USER,
              service: "gmail"
            }); 

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
              to: receiver.email,
              subject: "New Message Notification",
              html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                  <h2 style="color: #6DA6BA;">لديك رسالة جديدة!</h2>
                  <p>لقد استلمت رسالة جديدة من ${senderInfo}:</p>
                  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p style="margin: 0;">${message}</p>
                  </div>
                  <p>سجل دخولك للرد على الرسالة.</p>
                </div>
              `
            };

            console.log('Attempting to send email to:', receiver.email); 
            await transporter.sendMail(mailOptions);
            console.log(`Email notification successfully sent to ${receiver.email}`);
          } catch (emailError) {
            console.error('Failed to send email - Detailed error:', emailError);
            console.error('Email error code:', emailError.code);
            console.error('Email error message:', emailError.message);
            if (emailError.response) {
              console.error('SMTP Response:', emailError.response);
            }
          }
        } else {
          console.log('No email to send to - Receiver or email missing');
        }
      } else {
        console.log('Skipping notification - Not first message');
      }
    } catch (notificationError) {
      console.error('Error handling notification - Full error:', notificationError);
    }

    res.status(201).json(newMessage);

    if (req.socketIoInstance) {
      req.socketIoInstance.emit('sent_messages', message);
      console.log(`The Message is created Successfully: ${message}`);
    } else {
      console.error('socketIoInstance is undefined');
    }
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};



exports.getMessagesBetweenUsers = async (req, res) => {
  try {
    const { senderId,receiverId } = req.params;
    
    if (!senderId) {
      return res.status(400).json({ message: 'All fields are required: senderId' });
    }

    const messages = await Messages.findAll({
      where: {
        senderId,
        receiverId,  
      },
      include: [
        { model: Users, as: 'Sender', attributes: ['id', 'name', 'email'] },
        { model: Users, as: 'Receiver', attributes: ['id', 'name', 'email']},
        { model: Chalet,as :'Chalet',attributes: ['id', 'title', 'description']},
      ],
      order: [['id', 'ASC']],
    });

    if (messages.length === 0) {
      return res.status(404).json({ message: 'No messages found for this sender and receiver' });
    }

    res.status(200).json(messages);

   
    if (req.socketIoInstance) {
      req.socketIoInstance.emit('received_messages', messages);
      console.log('Messages retrieved successfully and emitted via Socket.IO');
    } else {
      console.error('Socket.IO instance is undefined');
    }
  } catch (error) {
    console.error('Error retrieving messages:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};




exports.getMessagesBySenderIdRecieverIdChaletId = async (req, res) => {
  try {
    const { senderId,receiverId,chaletId } = req.params;
    
    if (!senderId) {
      return res.status(400).json({ message: 'All fields are required: senderId' });
    }

    const messages = await Messages.findAll({
      where: {
        senderId,
        receiverId,  
        chaletId
      },
      include: [
        { model: Users, as: 'Sender', attributes: ['id', 'name', 'email'] },
        { model: Users, as: 'Receiver', attributes: ['id', 'name', 'email']},
        { model: Chalet,as :'Chalet',attributes: ['id', 'title', 'description']},
      ],
      order: [['id', 'ASC']],
    });

    if (messages.length === 0) {
      return res.status(404).json({ message: 'No messages found for this sender and receiver' });
    }

    res.status(200).json(messages);

   
    if (req.socketIoInstance) {
      req.socketIoInstance.emit('received_messages', messages);
      console.log('Messages retrieved successfully and emitted via Socket.IO');
    } else {
      console.error('Socket.IO instance is undefined');
    }
  } catch (error) {
    console.error('Error retrieving messages:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};





exports.getMessagesByChalets = async (req, res) => {
  try {
    const { receiverId ,lang } = req.params;

    if (!lang) {
      return res.status(400).json({ message: 'lang is required' });
    }

    const messages = await Messages.findAll({
      where:{
        receiverId,
      },
      include: [
        {
          model: Chalet,
          as: 'Chalet',
          attributes: [
            'id',
            'title',
            'description',
            'image',
            'Rating',
            'city',
            'area',
            'intial_Amount',
            'type',
            'features',
            'Additional_features'
          ],
        },
      ],
      order: [['id', 'ASC']],
      group: ['Chalet.id'], 
    });

    if (messages.length === 0) {
      return res.status(404).json({ message: 'No messages found for this sender' });
    }

    res.status(200).json(messages);

    if (req.socketIoInstance) {
      req.socketIoInstance.emit('received_messages', messages);
      console.log('Messages retrieved successfully and emitted via Socket.IO');
    } else {
      console.error('Socket.IO instance is undefined');
    }
  } catch (error) {
    console.error('Error retrieving messages:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};





exports.getMessagesByReciever = async (req, res) => {
  try {
    const { receiverId } = req.params;
    
    const messages = await Messages.findAll({
      where: {
        receiverId,
      },
      include: [
        {
          model: Users,
          as: 'Sender', 
          attributes: ['id', 'name'], 
          required: false,
        }
      ],
      order: [['id', 'ASC']],
    });

    if (messages.length === 0) {
      return res.status(404).json({ message: 'No messages found for this receiver' });
    }
    
    res.status(200).json(messages);
    
    if (req.socketIoInstance) {
      req.socketIoInstance.emit('received_messages', messages);
      console.log('Messages retrieved successfully and emitted via Socket.IO');
    } else {
      console.error('Socket.IO instance is undefined');
    }
  } catch (error) {
    console.error('Error retrieving messages:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};








exports.getMessagesForRecieverId = async (req, res) => {
  try {
    const { receiverId,chaletId } = req.params;

  
    if (!receiverId) {
      return res.status(400).json({ message: 'The Receiver Id is required' });
    }

   
    const messages = await Messages.findAll({
      where: { receiverId,chaletId },
      include: [
        { model: Users, as: 'Sender', attributes: ['id', 'name', 'email'] },
      ],
      attributes: [
        'receiverId',
        [Sequelize.col('Messages.senderId'), 'senderId'],
        [Sequelize.fn('MAX', Sequelize.col('Messages.id')), 'messageId'], 
        [Sequelize.literal('(SELECT message FROM Messages AS M WHERE M.id = MAX(Messages.id))'), 'message'], 
            ],
      group: ['Messages.senderId', 'receiverId'], 
      order: [[Sequelize.fn('MAX', Sequelize.col('Messages.id')), 'DESC']], 
    });

    
    if (messages.length === 0) {
      return res.status(404).json({ message: 'No messages found for this receiver with the given criteria' });
    }

    
    res.status(200).json({ message: 'Messages retrieved successfully', data: messages });

    
    if (req.socketIoInstance) {
      req.socketIoInstance.emit('received_messages', messages);
      console.log('Messages retrieved successfully and emitted via Socket.IO');
    } else {
      console.error('Socket.IO instance is undefined');
    }
  } catch (error) {
    console.error('Error retrieving messages:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};







exports.getSentMessages = async (req, res) => {
  try {
    const { senderId } = req.params;

    if (!senderId) {
      return res.status(400).json({ message: 'senderId is required' });
    }

    const messages = await Messages.findAll({
      where: { senderId },
      include: [
        { model: Users, as: 'Receiver', attributes: ['id', 'name', 'email'] },
      ],
      order: [['id', 'ASC']],
    });

    res.status(200).json({ message: 'Sent messages retrieved successfully', data: messages });

    if (req.socketIoInstance) {
      req.socketIoInstance.emit('sent_messages', messages);
    } else {
      console.error('socketIoInstance is undefined');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getReceivedMessages = async (req, res) => {
  try {
    const { receiverId } = req.params;

    if (!receiverId) {
      return res.status(400).json({ message: 'receiverId is required' });
    }

    const messages = await Messages.findAll({
      where: { receiverId },
      include: [
        { model: Users, as: 'Sender', attributes: ['id', 'name', 'email'] },
      ],
      order: [['id', 'ASC']],
    });

    res.status(200).json({ message: 'Received messages retrieved successfully', data: messages });

    if (req.socketIoInstance) {
      req.socketIoInstance.emit('received_messages', messages);
    } else {
      console.error('socketIoInstance is undefined');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};




exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ message: 'messageId is required' });
    }

    const deleted = await Messages.destroy({ where: { id: messageId } });

    if (!deleted) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (req.socketIoInstance) {
      req.socketIoInstance.emit('message_deleted', messageId);
    } else {
      console.error('socketIoInstance is undefined');
    }

    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
