const request = require('supertest');
const app = require('../server');
const RightTimeModel = require('../Models/RightTimeModel');
const Chalet = require('../Models/ChaletsModel');
const { client } = require('../Utils/redisClient');
const ReservationDate = require('../Models/ReservationDatesModel');
const Reservations_Chalets = require('../Models/Reservations_Chalets');

jest.mock('../Models/RightTimeModel');
jest.mock('../Models/ChaletsModel');
jest.mock('../Utils/redisClient');
jest.mock('../Models/ReservationDatesModel');
jest.mock('../Models/Reservations_Chalets');


describe('RightTime Controller', () => {

    
  describe('POST /createRightTime', () => {
    it('should return 400 if invalid language is provided', async () => {
      const response = await request(app).post('/createRightTime').send({
        name: 'Test RightTime',
        type_of_time: 'Type1',
        from_time: '2025-01-01',
        to_time: '2025-01-02',
        lang: 'fr',
        price: 100,
        After_Offer: 80,
        chalet_id: 1
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid language');
    });

    it('should return 404 if chalet not found', async () => {
      Chalet.findByPk.mockResolvedValue(null); 

      const response = await request(app).post('/createRightTime').send({
        name: 'Test RightTime',
        type_of_time: 'Type1',
        from_time: '2025-01-01',
        to_time: '2025-01-02',
        lang: 'en',
        price: 100,
        After_Offer: 80,
        chalet_id: 1
      });
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Chalet not found');
    });

    it('should return 201 and create RightTime successfully', async () => {
      Chalet.findByPk.mockResolvedValue({ id: 1, title: 'Chalet 1' });
      RightTimeModel.create.mockResolvedValue({
        id: 1,
        name: 'Test RightTime',
        type_of_time: 'Type1',
        from_time: '2025-01-01',
        to_time: '2025-01-02',
        lang: 'en',
        price: 100,
        After_Offer: 80,
        chalet_id: 1
      });
      client.del.mockResolvedValue(true);
      client.set.mockResolvedValue(true);

      const response = await request(app).post('/createRightTime').send({
        name: 'Test RightTime',
        type_of_time: 'Type1',
        from_time: '2025-01-01',
        to_time: '2025-01-02',
        lang: 'en',
        price: 100,
        After_Offer: 80,
        chalet_id: 1
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('RightTime created successfully');
    });

    it('should return 500 if internal server error occurs', async () => {
      RightTimeModel.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app).post('/createRightTime').send({
        name: 'Test RightTime',
        type_of_time: 'Type1',
        from_time: '2025-01-01',
        to_time: '2025-01-02',
        lang: 'en',
        price: 100,
        After_Offer: 80,
        chalet_id: 1
      });
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('An internal server error occurred.');
    });
  });

  

  describe('GET /getRightTimeById', () => {
    it('should return 404 if RightTime not found', async () => {
      RightTimeModel.findOne.mockResolvedValue(null); 

      const response = await request(app).get('/getRightTimeById/1');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('RightTime not found');
    });

    it('should return 200 and cached data if available', async () => {
      client.get.mockResolvedValue(JSON.stringify({ id: 1, name: 'Test RightTime' }));

      const response = await request(app).get('/getRightTimeById/1');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 1, name: 'Test RightTime' });
    });

    it('should return 200 and fetch RightTime from database if cache is empty', async () => {
      client.get.mockResolvedValue(null);
      RightTimeModel.findOne.mockResolvedValue({
        id: 1,
        name: 'Test RightTime',
        type_of_time: 'Type1',
        from_time: '2025-01-01',
        to_time: '2025-01-02',
        lang: 'en',
        price: 100,
        After_Offer: 80
      });

      const response = await request(app).get('/getRightTimeById/1');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        name: 'Test RightTime',
        type_of_time: 'Type1',
        from_time: '2025-01-01',
        to_time: '2025-01-02',
        lang: 'en',
        price: 100,
        After_Offer: 80
      });
    });
  });



  describe('PUT /updateRightTime', () => {
    it('should return 404 if RightTime not found', async () => {
      RightTimeModel.findByPk.mockResolvedValue(null); 

      const response = await request(app).put('/updateRightTime/1').send({
        name: 'Updated RightTime',
        type_of_time: 'Type2',
        from_time: '2025-01-02',
        to_time: '2025-01-03',
        lang: 'en',
        price: 120,
        After_Offer: 100,
        chalet_id: 1
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('RightTime not found');
    });

    it('should return 200 and update RightTime successfully', async () => {
      RightTimeModel.findByPk.mockResolvedValue({
        id: 1,
        name: 'Test RightTime',
        type_of_time: 'Type1',
        from_time: '2025-01-01',
        to_time: '2025-01-02',
        lang: 'en',
        price: 100,
        After_Offer: 80,
        chalet_id: 1,
        save: jest.fn().mockResolvedValue(true)
      });

      const response = await request(app).put('/updateRightTime/1').send({
        name: 'Updated RightTime',
        type_of_time: 'Type2',
        from_time: '2025-01-02',
        to_time: '2025-01-03',
        lang: 'en',
        price: 120,
        After_Offer: 100,
        chalet_id: 1
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated RightTime');
    });

    it('should return 500 if internal server error occurs', async () => {
      RightTimeModel.findByPk.mockResolvedValue({
        id: 1,
        name: 'Test RightTime',
        type_of_time: 'Type1',
        from_time: '2025-01-01',
        to_time: '2025-01-02',
        lang: 'en',
        price: 100,
        After_Offer: 80,
        chalet_id: 1,
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const response = await request(app).put('/updateRightTime/1').send({
        name: 'Updated RightTime',
        type_of_time: 'Type2',
        from_time: '2025-01-02',
        to_time: '2025-01-03',
        lang: 'en',
        price: 120,
        After_Offer: 100,
        chalet_id: 1
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('An internal server error occurred.');
    });
  });



  describe('DELETE /deleteRightTime', () => {
    it('should return 404 if RightTime not found', async () => {
      RightTimeModel.findByPk.mockResolvedValue(null); 

      const response = await request(app).delete('/deleteRightTime/1/ar');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('RightTime not found');
    });

    it('should return 200 and delete RightTime successfully', async () => {
      RightTimeModel.findByPk.mockResolvedValue({
        id: 1,
        name: 'Test RightTime',
        destroy: jest.fn().mockResolvedValue(true)
      });

      const response = await request(app).delete('/deleteRightTime/1/en');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('RightTime deleted successfully');
    });

    it('should return 500 if internal server error occurs', async () => {
      RightTimeModel.findByPk.mockResolvedValue({
        id: 1,
        name: 'Test RightTime',
        destroy: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const response = await request(app).delete('/deleteRightTime/1/en');
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('An internal server error occurred.');
    });
  });
});
