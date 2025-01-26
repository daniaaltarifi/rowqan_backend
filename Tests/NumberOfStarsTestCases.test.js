const request = require('supertest');
const app = require('../server');
const number_stars = require('../Models/no_StartChalet');
const Chalet = require('../Models/ChaletsModel');
const { client } = require("../Utils/redisClient");

jest.mock('../Models/no_StartChalet');
jest.mock('../Models/ChaletsModel');
jest.mock('../Utils/redisClient');

describe('Number of Stars Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });


  
  describe('createNumberOfStars', () => {
    it('should create a new number of stars successfully', async () => {
      const newStarData = { chalet_id: 101, no_start: 5 };
      const mockChalet = { id: 101 };

      Chalet.findByPk.mockResolvedValue(mockChalet);
      number_stars.create.mockResolvedValue(newStarData);
      client.del.mockResolvedValue();

      const response = await request(app)
        .post('/stars')
        .send(newStarData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Number of Stars created successfully');
      expect(number_stars.create).toHaveBeenCalledWith(expect.objectContaining(newStarData));
      expect(client.del).toHaveBeenCalledWith('chalets:101:stars');
    });

    it('should return 400 if chalet_id or no_start is missing', async () => {
      const response = await request(app)
        .post('/stars')
        .send({ chalet_id: 101 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 404 if chalet not found', async () => {
      const newStarData = { chalet_id: 101, no_start: 5 };

      Chalet.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .post('/stars')
        .send(newStarData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Chalet not found');
    });
  });



  describe('getNumberOfStarsbyChaletId', () => {
    it('should return stars for a given chalet_id', async () => {
      const mockStars = [{ chalet_id: 101, no_start: 5 }];
      client.get.mockResolvedValue(null);  // No cache found
      number_stars.findAll.mockResolvedValue(mockStars);

      const response = await request(app)
        .get('/stars/101')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStars);
      expect(client.setEx).toHaveBeenCalledWith('chalets:101:stars', 3600, JSON.stringify(mockStars));
    });

    it('should return 404 if no stars found for chalet_id', async () => {
      number_stars.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/stars/101')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No stars found for the given chalet');
    });
  });


  describe('getNumberOfStars', () => {
    it('should return paginated stars', async () => {
      const mockStars = [{ chalet_id: 101, no_start: 5 }];
      client.get.mockResolvedValue(null);  
      number_stars.findAll.mockResolvedValue(mockStars);

      const response = await request(app)
        .get('/stars?page=1&limit=20')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStars);
      expect(client.setEx).toHaveBeenCalledWith('stars:page:1:limit:20', 3600, JSON.stringify(mockStars));
    });

    it('should return 404 if no stars found', async () => {
      number_stars.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/stars?page=1&limit=20')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No stars found');
    });
  });



  describe('getAverageStars', () => {
    it('should return the average stars for a given chalet', async () => {
      const mockStars = [
        { chalet_id: 101, no_start: 5 },
        { chalet_id: 101, no_start: 4 },
      ];
      number_stars.findAll.mockResolvedValue(mockStars);

      const response = await request(app)
        .get('/stars/101/average')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.averageStars).toBe('4.50');
    });

    it('should return 404 if no stars found for the chalet', async () => {
      number_stars.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/stars/101/average')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No ratings found for this chalet');
    });
  });




  describe('updateNumberOfStars', () => {
    it('should update the number of stars successfully', async () => {
      const updatedStarData = { no_start: 4 };
      const mockStarEntry = { id: 1, chalet_id: 101, no_start: 5, update: jest.fn().mockResolvedValue(updatedStarData) };

      number_stars.findByPk.mockResolvedValue(mockStarEntry);
      client.del.mockResolvedValue();

      const response = await request(app)
        .put('/stars/1')
        .send(updatedStarData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Number of Stars updated successfully');
      expect(mockStarEntry.update).toHaveBeenCalledWith(updatedStarData);
      expect(client.del).toHaveBeenCalledWith('chalets:101:stars');
    });

    it('should return 404 if star entry not found', async () => {
      number_stars.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/stars/1')
        .send({ no_start: 4 });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Star entry not found');
    });
  });




  describe('deleteNumberOfStars', () => {
    it('should delete the number of stars successfully', async () => {
      const mockStarEntry = { id: 1, chalet_id: 101, destroy: jest.fn().mockResolvedValue() };

      number_stars.findByPk.mockResolvedValue(mockStarEntry);
      client.del.mockResolvedValue();

      const response = await request(app)
        .delete('/stars/1')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Number of Stars deleted successfully');
      expect(mockStarEntry.destroy).toHaveBeenCalled();
      expect(client.del).toHaveBeenCalledWith('chalets:101:stars');
    });

    it('should return 404 if star entry not found', async () => {
      number_stars.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .delete('/stars/1')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Star entry not found');
    });
  });
});
