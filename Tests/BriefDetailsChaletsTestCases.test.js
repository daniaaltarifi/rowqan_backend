const request = require('supertest');
const app = require('../server'); 
const { client } = require('../Utils/redisClient');
const BreifDetailsChalets = require('../Models/BreifDetailsChalets');
const Chalet = require('../Models/ChaletsModel');

jest.mock('../Models/BreifDetailsChalets');
jest.mock('../Models/ChaletsModel');
jest.mock('../Utils/redisClient', () => ({
  client: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
  },
}));

describe('BreifDetailsChalet Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBreifDetailsChalet', () => {
    it('should create a BreifDetailsChalet successfully', async () => {
      const chaletData = { id: 1, title: 'Test Chalet' };
      const briefData = { type: 'test', value: 'value', lang: 'en', chalet_id: 1 };
      
      Chalet.findByPk.mockResolvedValue(chaletData);
      BreifDetailsChalets.create.mockResolvedValue(briefData);
      
      const response = await request(app)
        .post('/brief-details-chalets')
        .send(briefData);

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('test');
      expect(response.body.lang).toBe('en');
      expect(client.del).toHaveBeenCalledWith('chalet:1:breifDetails');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app).post('/brief-details-chalets').send({});
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('type, value, lang, and chalet_id are required');
    });

    it('should return 404 if chalet is not found', async () => {
      const briefData = { type: 'test', value: 'value', lang: 'en', chalet_id: 1 };
      
      Chalet.findByPk.mockResolvedValue(null); 
      
      const response = await request(app)
        .post('/brief-details-chalets')
        .send(briefData);

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('Chalet not found');
    });

    it('should return 400 if brief details with the same type, lang, and chalet_id already exists', async () => {
      const briefData = { type: 'test', value: 'value', lang: 'en', chalet_id: 1 };
      BreifDetailsChalets.findOne.mockResolvedValue(briefData); 

      const response = await request(app)
        .post('/brief-details-chalets')
        .send(briefData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('BreifDetailsChalet with the same type, lang, and chalet_id already exists');
    });
  });

  describe('getAllBreifChalet', () => {
    it('should return brief details from cache if available', async () => {
      const cachedData = JSON.stringify([{ id: 1, type: 'test', value: 'value', lang: 'en' }]);
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/brief-details-chalets/en?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch brief details from the database and set cache if not cached', async () => {
      const briefData = [{ id: 1, type: 'test', value: 'value', lang: 'en' }];
      BreifDetailsChalets.findAll.mockResolvedValue(briefData);
      client.get.mockResolvedValue(null); 

      const response = await request(app).get('/brief-details-chalets/en?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(briefData);
      expect(client.setEx).toHaveBeenCalledWith(
        'chalet:1:breifDetails:en',
        3600,
        JSON.stringify(briefData)
      );
    });

    it('should return 404 if no brief details found', async () => {
      BreifDetailsChalets.findAll.mockResolvedValue([]);

      const response = await request(app).get('/brief-details-chalets/en?page=1&limit=20');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('No brief details found');
    });
  });

  describe('getBreifDetailsByChaletId', () => {
    it('should return brief details for a chalet from cache if available', async () => {
      const cachedData = JSON.stringify([{ id: 1, type: 'test', value: 'value' }]);
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/brief-details-chalets/1/en');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch brief details for a chalet and set cache if not cached', async () => {
      const chaletData = { id: 1, title: 'Test Chalet' };
      const briefData = [{ id: 1, type: 'test', value: 'value' }];
      Chalet.findOne.mockResolvedValue({ id: 1, title: 'Test Chalet', BreifDetailsChalets: briefData });
      client.get.mockResolvedValue(null);

      const response = await request(app).get('/brief-details-chalets/1/en');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(briefData);
      expect(client.setEx).toHaveBeenCalledWith(
        'chalet:1:breifDetails:en',
        3600,
        JSON.stringify(briefData)
      );
    });

    it('should return 404 if chalet not found', async () => {
      Chalet.findOne.mockResolvedValue(null); 

      const response = await request(app).get('/brief-details-chalets/1/en');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('Chalet not found');
    });
  });

  
});
