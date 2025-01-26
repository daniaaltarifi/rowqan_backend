const request = require('supertest');
const app = require('../server'); 
const ContactUs = require('../Models/ContactUs');
const { client } = require('../Utils/redisClient');
const { ErrorResponse } = require('../Utils/validateInput');


jest.mock('../Models/ContactUs');
jest.mock('../Utils/redisClient');

describe('ContactUs Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /contactus (createContactUs)', () => {
    it('should create a new contact entry successfully', async () => {
      const mockContact = { 
        id: 1, 
        First_Name: 'Lorans', 
        Last_Name: 'Alkhateeb', 
        EmailAddress: 'Lorans@gmail.com', 
        Phone_Number: '123456789', 
        Address: '123 Main St', 
        Messages: 'Test message', 
        lang: 'en' 
      };
      ContactUs.create.mockResolvedValue(mockContact);

      const res = await request(app)
        .post('/contactus')
        .send({
          First_Name: 'Lorans',
          Last_Name: 'Alkhateeb',
          EmailAddress: 'Lorans@gmail.com',
          Phone_Number: '123456789',
          Address: '123 Main St',
          Messages: 'Test message',
          lang: 'en',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockContact);
    });

    it('should return validation error for missing fields', async () => {
      const res = await request(app)
        .post('/contactus')
        .send({});  

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toContain('All Fields Are Required');
    });

    it('should return validation error for invalid language', async () => {
      const res = await request(app)
        .post('/contactus')
        .send({
          First_Name: 'Lorans',
          Last_Name: 'Alkhateeb',
          EmailAddress: 'Lorans@gmail.com',
          Phone_Number: '123456789',
          Address: '123 Main St',
          Messages: 'Test message',
          lang: 'invalid_lang',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid language, must be "en" or "ar"');
    });

    it('should handle internal server errors', async () => {
      ContactUs.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/contactus')
        .send({
          First_Name: 'Lorans',
          Last_Name: 'Alkhateeb',
          EmailAddress: 'Lorans@gmail.com',
          Phone_Number: '123456789',
          Address: '123 Main St',
          Messages: 'Test message',
          lang: 'en',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create ContactUs');
    });
  });



  describe('GET /contactus/:id (getContactUsById)', () => {
    it('should return contact from cache if available', async () => {
      const cachedData = JSON.stringify({
        id: 1, 
        First_Name: 'Lorans', 
        Last_Name: 'Alkhateeb', 
        EmailAddress: 'Lorans@gmail.com', 
        Phone_Number: '123456789', 
        Address: '123 Main St', 
        Messages: 'Test message', 
        lang: 'en',
      });
      client.get.mockResolvedValue(cachedData);

      const res = await request(app).get('/contactus/1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(JSON.parse(cachedData));
    });

    it('should return contact from database if no cache', async () => {
      const mockContact = {
        id: 1, 
        First_Name: 'Lorans', 
        Last_Name: 'Alkhateeb', 
        EmailAddress: 'Lorans@gmail.com', 
        Phone_Number: '123456789', 
        Address: '123 Main St', 
        Messages: 'Test message', 
        lang: 'en'
      };
      ContactUs.findOne.mockResolvedValue(mockContact);

      const res = await request(app).get('/contactus/1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockContact);
    });

    it('should return 404 if contact not found', async () => {
      ContactUs.findOne.mockResolvedValue(null);

      const res = await request(app).get('/contactus/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ContactUs entry not found');
    });

    it('should handle internal server errors', async () => {
      ContactUs.findOne.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/contactus/1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to retrieve ContactUs');
    });
  });



  describe('PUT /contactus/:id (updateContactUs)', () => {
    it('should update a contact successfully', async () => {
      const mockContact = {
        id: 1,
        First_Name: 'Lorans',
        Last_Name: 'Alkhateeb',
        EmailAddress: 'Lorans@gmail.com',
        Phone_Number: '123456789',
        Address: '123 Main St',
        Messages: 'Test message',
        lang: 'en',
      };
      ContactUs.findByPk.mockResolvedValue(mockContact);
      mockContact.update = jest.fn().mockResolvedValue({
        ...mockContact,
        First_Name: 'Lorans Alkhateeb',
      });

      const res = await request(app)
        .put('/contactus/1')
        .send({
          First_Name: 'lorans',
          Last_Name: 'Alkhateeb',
          EmailAddress: 'Lorans@gmail.com',
          Phone_Number: '987654321',
          Address: '456 Secondary St',
          Messages: 'Updated message',
          lang: 'en',
        });

      expect(res.status).toBe(200);
      expect(res.body.First_Name).toBe('Jane');
    });

    it('should return 404 if contact not found', async () => {
      ContactUs.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .put('/contactus/999')
        .send({
          First_Name: 'Lorans',
          Last_Name: 'Alkhateeb',
          EmailAddress: 'lorans@gmail.com',
          Phone_Number: '987654321',
          Address: '456 Secondary St',
          Messages: 'Updated message',
          lang: 'en',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ContactUs entry not found');
    });

    it('should handle internal server errors', async () => {
      ContactUs.findByPk.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/contactus/1')
        .send({
          First_Name: 'Jane',
          Last_Name: 'Doe',
          EmailAddress: 'jane.doe@example.com',
          Phone_Number: '987654321',
          Address: '456 Secondary St',
          Messages: 'Updated message',
          lang: 'en',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update ContactUs');
    });
  });



  describe('DELETE /contactus/:id (deleteContactUs)', () => {
    it('should delete a contact successfully', async () => {
      const mockContact = { id: 1, destroy: jest.fn().mockResolvedValue() };
      ContactUs.findOne.mockResolvedValue(mockContact);

      const res = await request(app).delete('/contactus/1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('ContactUs entry deleted successfully');
    });

    it('should return 404 if contact not found', async () => {
      ContactUs.findOne.mockResolvedValue(null);

      const res = await request(app).delete('/contactus/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ContactUs entry not found');
    });

    it('should handle internal server errors', async () => {
      ContactUs.findOne.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/contactus/1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete ContactUs entry');
    });
  });
});
