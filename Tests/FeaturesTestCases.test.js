const request = require('supertest');
const app = require('../server');
const { client } = require('../Utils/redisClient');
const FeaturesChalet = require('../Models/FeaturesChalet');
const { ErrorResponse } = require('../Utils/validateInput');

jest.mock('../Models/FeaturesChalet');
jest.mock('../Utils/redisClient', () => ({
  client: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
  },
}));



describe('FeaturesChalet Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });





  describe('createFeature', () => {
    it('should create a new feature successfully', async () => {
      const newFeatureData = {
        FeatureName: 'Test Feature',
        lang: 'en',
      };

      FeaturesChalet.create.mockResolvedValue(newFeatureData);

      const response = await request(app)
        .post('/features')
        .send(newFeatureData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Feature  created successfully');
      expect(FeaturesChalet.create).toHaveBeenCalledWith(expect.objectContaining({
        FeatureName: 'Test Feature',
        lang: 'en',
      }));
    });

    it('should return 400 if FeatureName or lang is missing', async () => {
      const newFeatureData = { FeatureName: 'Test Feature' }; 

      const response = await request(app)
        .post('/features')
        .send(newFeatureData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('All Fields are required');
    });

    it('should return validation errors if input is invalid', async () => {
      const newFeatureData = {
        FeatureName: '', 
        lang: 'en',
      };

      const validationErrors = ['FeatureName is required'];

      FeaturesChalet.create.mockResolvedValue(null);

      const response = await request(app)
        .post('/features')
        .send(newFeatureData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(validationErrors);
    });
  });

  
  
  describe('getFeatures', () => {
    it('should return features from cache if available', async () => {
      const cachedData = JSON.stringify([{ id: 1, FeatureName: 'Test Feature', lang: 'en' }]);
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/features/en?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch features from database and cache if not cached', async () => {
      const features = [{ id: 1, FeatureName: 'Test Feature', lang: 'en' }];
      client.get.mockResolvedValue(null); 
      FeaturesChalet.findAll.mockResolvedValue(features);

      const response = await request(app).get('/features/en?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(features);
      expect(client.setEx).toHaveBeenCalledWith(
        'feature:page:1:limit:20:lang:en',
        3600,
        JSON.stringify(features)
      );
    });
  });


  describe('getFeatureById', () => {
    it('should return a feature by ID from cache if available', async () => {
      const cachedData = JSON.stringify({ id: 1, FeatureName: 'Test Feature', lang: 'en' });
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/features/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch a feature by ID from the database and cache if not cached', async () => {
      const feature = { id: 1, FeatureName: 'Test Feature', lang: 'en' };
      client.get.mockResolvedValue(null); 
      FeaturesChalet.findOne.mockResolvedValue(feature);

      const response = await request(app).get('/features/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(feature);
      expect(client.setEx).toHaveBeenCalledWith(
        'features:1',
        3600,
        JSON.stringify(feature)
      );
    });

    it('should return 404 if feature not found', async () => {
      FeaturesChalet.findOne.mockResolvedValue(null);

      const response = await request(app).get('/features/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Feature not found');
    });
  });



  describe('updateFeature', () => {
    it('should update a feature successfully', async () => {
      const updatedFeatureData = { FeatureName: 'Updated Feature', lang: 'en' };
      const existingFeature = { id: 1, FeatureName: 'Test Feature', lang: 'en', update: jest.fn() };
      FeaturesChalet.findByPk.mockResolvedValue(existingFeature);

      const response = await request(app)
        .put('/features/1')
        .send(updatedFeatureData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Feature updated successfully');
      expect(existingFeature.update).toHaveBeenCalledWith(updatedFeatureData);
    });

    it('should return 404 if feature not found for update', async () => {
      FeaturesChalet.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/features/999')
        .send({ FeatureName: 'Updated Feature', lang: 'en' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Feature not found');
    });
  });



  describe('deleteFeature', () => {
    it('should delete a feature successfully', async () => {
      const feature = { id: 1, destroy: jest.fn() };
      FeaturesChalet.findByPk.mockResolvedValue(feature);

      const response = await request(app).delete('/features/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Feature deleted successfully');
      expect(feature.destroy).toHaveBeenCalled();
    });

    it('should return 404 if feature not found for deletion', async () => {
      FeaturesChalet.findByPk.mockResolvedValue(null);

      const response = await request(app).delete('/features/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Feature not found');
    });
  });
});
