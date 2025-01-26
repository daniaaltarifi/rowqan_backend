const request = require('supertest');
const app = require('../server');
const Chalet = require('../Models/ChaletsModel');
const Messages = require('../Models/MessageModel');
const Users = require('../Models/UsersModel');
const { Sequelize } = require('sequelize');

jest.mock('../Models/ChaletsModel');
jest.mock('../Models/MessageModel');
jest.mock('../Models/UsersModel');

describe('Chalet Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });


  
  describe('createMessage', () => {
    it('should create a new message successfully', async () => {
      const newMessageData = {
        senderId: 1,
        status: 'sent',
        receiverId: 2,
        message: 'Hello!',
        lang: 'en',
        chaletId: 101
      };

      Messages.create.mockResolvedValue(newMessageData);

      const response = await request(app)
        .post('/messages')
        .send(newMessageData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newMessageData);
      expect(Messages.create).toHaveBeenCalledWith(expect.objectContaining(newMessageData));
    });

    it('should return 400 if fields are missing', async () => {
      const newMessageData = { senderId: 1, status: 'sent' };

      const response = await request(app)
        .post('/messages')
        .send(newMessageData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('All fields are required: senderId, message, lang, status, and chaletId');
    });
  });



  describe('getMessagesBetweenUsers', () => {
    it('should return messages between users', async () => {
      const mockMessages = [{
        id: 1,
        message: 'Hello!',
        senderId: 1,
        receiverId: 2,
        lang: 'en',
        chaletId: 101
      }];
      Messages.findAll.mockResolvedValue(mockMessages);

      const response = await request(app)
        .get('/messages/1/2')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMessages);
    });

    it('should return 404 if no messages found', async () => {
      Messages.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/messages/1/2')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No messages found for this sender and receiver');
    });
  });



  describe('getMessagesBySenderIdRecieverIdChaletId', () => {
    it('should return messages by sender, receiver, and chaletId', async () => {
      const mockMessages = [{
        id: 1,
        message: 'Hello!',
        senderId: 1,
        receiverId: 2,
        chaletId: 101
      }];
      Messages.findAll.mockResolvedValue(mockMessages);

      const response = await request(app)
        .get('/messages/1/2/101')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMessages);
    });

    it('should return 404 if no messages found for the specified criteria', async () => {
      Messages.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/messages/1/2/101')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No messages found for this sender and receiver');
    });
  });




  describe('getMessagesByChalets', () => {
    it('should return messages by chalet', async () => {
      const mockMessages = [{
        id: 1,
        message: 'Message related to chalet',
        lang: 'en',
        chaletId: 101
      }];
      Messages.findAll.mockResolvedValue(mockMessages);

      const response = await request(app)
        .get('/messages/chalet/en')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMessages);
    });

    it('should return 404 if no messages found for the chalet', async () => {
      Messages.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/messages/chalet/en')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No messages found for this sender');
    });
  });

  
  
  describe('getMessagesForRecieverId', () => {
    it('should return messages for the receiverId', async () => {
      const mockMessages = [{
        id: 1,
        message: 'New message for receiver',
        receiverId: 2,
        chaletId: 101
      }];
      Messages.findAll.mockResolvedValue(mockMessages);

      const response = await request(app)
        .get('/messages/receiver/2/101')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Messages retrieved successfully');
      expect(response.body.data).toEqual(mockMessages);
    });

    it('should return 404 if no messages found for receiverId', async () => {
      Messages.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/messages/receiver/2/101')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No messages found for this receiver with the given criteria');
    });
  });



  describe('deleteMessage', () => {
    it('should delete a message successfully', async () => {
      Messages.destroy.mockResolvedValue(1);

      const response = await request(app)
        .delete('/messages/1')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Message deleted successfully');
    });

    it('should return 404 if message not found', async () => {
      Messages.destroy.mockResolvedValue(0);

      const response = await request(app)
        .delete('/messages/999')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Message not found');
    });
  });
});
