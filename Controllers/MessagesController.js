const Chalet = require('../Models/ChaletsModel');
const Messages = require('../Models/MessageModel');
const Users = require('../Models/UsersModel');
const { Sequelize } = require('sequelize');
const emitSocketEvent = (socketIoInstance, event, data) => {
  if (socketIoInstance) {
    socketIoInstance.emit(event, data);
  } else {
    console.error('socketIoInstance is undefined');
  }
};


exports.createMessage = async (req, res) => {
  try {
    const { senderId, message, lang } = req.body;

    
    if (!senderId || !message || !lang) {
      return res.status(400).json({ message: 'All fields are required: senderId, message, lang' });
    }

    
    const receiverId = 4;

    
    const newMessage = await Messages.create({
      senderId,
      receiverId,  
       message,
      lang,
    });

    
    emitSocketEvent(req.socketIoInstance, 'receive_message', newMessage);

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




exports.getMessagesForChalet = async (req, res) => {
  try {
    const { receiverId, senderId } = req.params;

    
    if ( !receiverId || !senderId) {
      return res.status(400).json({ message: 'All fields are required:receiverId, senderId' });
    }

    const messages = await Messages.findAll({
      where: {
        senderId,
        receiverId,
      },
      include: [
        { model: Users, as: 'Sender', attributes: ['id', 'name', 'email'] },
        { model: Users, as: 'Receiver', attributes: ['id', 'name', 'email']},
      ],

      
      order: [['id', 'ASC']],
    });

    if (messages.length === 0) {
      return res.status(404).json({ message: 'No messages found for this chalet with the given criteria' });
    }

    
    res.status(200).json( messages);

    
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
    const { receiverId } = req.params;

  
    if (!receiverId) {
      return res.status(400).json({ message: 'The Receiver Id is required' });
    }

   
    const messages = await Messages.findAll({
      where: { receiverId },
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
