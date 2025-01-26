const request = require('supertest');
const app = require('../server');
const { client } = require('../Utils/redisClient');
const Chalet = require('../Models/ChaletsModel');
const Status = require('../Models/StatusModel');
const chaletsImages = require('../Models/ChaletsImagesModel');
const RightTimeModel = require('../Models/RightTimeModel');
const { ErrorResponse } = require('../Utils/validateInput');
const axios = require('axios');


jest.mock('../Models/ChaletsModel');
jest.mock('../Models/StatusModel');
jest.mock('../Models/ChaletsImagesModel');
jest.mock('../Models/RightTimeModel');

jest.mock('../Utils/redisClient', () => ({
  client: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
  },
}));
jest.mock('axios');




describe('Chalet Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });



  describe('createChalet', () => {
    it('should create a new chalet successfully', async () => {
      const newChaletData = {
        title: 'Test Chalet',
        description: 'A test chalet description',
        Rating: 4,
        city: 'Test City',
        area: 'Test Area',
        intial_Amount: 100,
        type: '{"type":"luxury"}',
        features: 'Pool, Sauna',
        Additional_features: 'Sea View',
        near_me: '{"latitude": "12.345", "longitude": "67.890"}',
        lang: 'en',
        status_id: 1,
      };

      
      axios.get.mockResolvedValue({
        data: [{ lat: 12.345, lon: 67.890 }],
      });
      Chalet.create.mockResolvedValue(newChaletData);
      RightTimeModel.create.mockResolvedValue({});

      const response = await request(app)
        .post('/chalets')
        .send(newChaletData)
        .attach('image', 'path_to_image'); 

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Chalet created successfully');
      expect(Chalet.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Chalet',
        description: 'A test chalet description',
      }));
    });


    it('should return 400 if image is missing', async () => {
      const newChaletData = {
        title: 'Test Chalet',
        description: 'A test chalet description',
        Rating: 4,
        city: 'Test City',
        area: 'Test Area',
        intial_Amount: 100,
        type: '{"type":"luxury"}',
        features: 'Pool, Sauna',
        Additional_features: 'Sea View',
        near_me: '{"latitude": "12.345", "longitude": "67.890"}',
        lang: 'en',
        status_id: 1,
      };

      const response = await request(app)
        .post('/chalets')
        .send(newChaletData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Image is required');
    });


    it('should return 400 if geolocation API fails', async () => {
      const newChaletData = {
        title: 'Test Chalet',
        description: 'A test chalet description',
        Rating: 4,
        city: 'Nonexistent City',
        area: 'Test Area',
        intial_Amount: 100,
        type: '{"type":"luxury"}',
        features: 'Pool, Sauna',
        Additional_features: 'Sea View',
        near_me: '{"latitude": "12.345", "longitude": "67.890"}',
        lang: 'en',
        status_id: 1,
      };

      
      axios.get.mockResolvedValue({ data: [] });

      const response = await request(app)
        .post('/chalets')
        .send(newChaletData)
        .attach('image', 'path_to_image');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Failed to fetch geolocation for the given city.');
    });
  });


  describe('getAllChalets', () => {
    it('should return chalets from cache if available', async () => {
      const cachedData = JSON.stringify([{ id: 1, title: 'Chalet 1' }]);
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/chalets/en?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch chalets from database and cache if not cached', async () => {
      const chalets = [{ id: 1, title: 'Chalet 1' }];
      client.get.mockResolvedValue(null); 
      Chalet.findAll.mockResolvedValue(chalets);

      const response = await request(app).get('/chalets/en?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(chalets);
      expect(client.setEx).toHaveBeenCalledWith(
        'chalets1:page:1:limit:20:lang:en',
        3600,
        JSON.stringify(chalets)
      );
    });
  });


  describe('getChaletsWithOffer', () => {
    it('should return chalets with offers', async () => {
      const chaletsWithOffer = [{ id: 1, type_of_time: 'morning', After_Offer: 50 }];
      RightTimeModel.findAll.mockResolvedValue(chaletsWithOffer);

      const response = await request(app).get('/chalets/offer');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(chaletsWithOffer);
    });

    it('should return 404 if no chalets with offer are found', async () => {
      RightTimeModel.findAll.mockResolvedValue([]);

      const response = await request(app).get('/chalets/offer');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No chalets found with an offer.');
    });
  });

  describe('getChaletsByTypeOfTimeAndOffer', () => {
    it('should return chalets filtered by type_of_time and offer', async () => {
      const chaletsWithOfferAndTime = [
        { type_of_time: 'morning', After_Offer: 50, Chalet: { id: 1, title: 'Chalet 1' } },
      ];
      RightTimeModel.findAll.mockResolvedValue(chaletsWithOfferAndTime);

      const response = await request(app).get('/chalets/time/morning/offer');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([
        {
          id: 1,
          title: 'Chalet 1',
          type_of_time: 'morning',
          after_offer: 50,
        },
      ]);
    });

    it('should return 404 if no chalets are found by the type_of_time and offer', async () => {
      RightTimeModel.findAll.mockResolvedValue([]);

      const response = await request(app).get('/chalets/time/morning/offer');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No chalets found with type_of_time "morning" and an offer.');
    });
  });
});
