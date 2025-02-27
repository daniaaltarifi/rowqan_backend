const request = require('supertest');
const app = require('../app'); // Replace with your app's entry point
const { client } = require('../Utils/redisClient');
const AdditionalFeatures = require('../Models/AdditionalFeatures');

jest.mock('../Models/AdditionalFeatures');



jest.mock('../Utils/redisClient', () => ({
  client: {
    get: jest.fn(),
    setEx: jest.fn(),   
    del: jest.fn(),
  },
}));



describe('AdditionalFeatures Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFeature', () => {
    it('should create a feature successfully', async () => {
      const featureData = { id: 1, FeatureName: 'WiFi', lang: 'en' };
      AdditionalFeatures.create.mockResolvedValue(featureData);

      const response = await request(app)
        .post('/features')
        .send({ FeatureName: 'WiFi', lang: 'en' });

      expect(response.status).toBe(201);
      expect(response.body.feature).toEqual(featureData);
      expect(client.del).toHaveBeenCalledWith('addFeature:page:1:limit:20');
      expect(client.set).toHaveBeenCalledWith(
        `addFeature:${featureData.id}`,
        JSON.stringify(featureData),
        { EX: 3600 }
      );
    });

    it('should return validation errors if required fields are missing', async () => {
      const response = await request(app).post('/features').send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('All Fields are required');
    });
  });



  describe('getFeatures', () => {
    it('should return features from the cache if available', async () => {
      const cachedData = JSON.stringify([{ id: 1, FeatureName: 'WiFi', lang: 'en' }]);
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/features?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch features from the database and set cache if not cached', async () => {
      const featureEntries = [{ id: 1, FeatureName: 'WiFi', lang: 'en' }];
      AdditionalFeatures.findAll.mockResolvedValue(featureEntries);
      client.get.mockResolvedValue(null);

      const response = await request(app).get('/features?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(featureEntries);
      expect(client.setEx).toHaveBeenCalledWith(
        'addFeature:page:1:limit:20:lang:all',
        3600,
        JSON.stringify(featureEntries)
      );
    });
  });


  describe('getFeatureById', () => {
    it('should return a feature by ID from the cache if available', async () => {
      const cachedData = JSON.stringify({ id: 1, FeatureName: 'WiFi', lang: 'en' });
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/features/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch a feature by ID from the database if not cached', async () => {
      const feature = { id: 1, FeatureName: 'WiFi', lang: 'en' };
      AdditionalFeatures.findOne.mockResolvedValue(feature);
      client.get.mockResolvedValue(null);

      const response = await request(app).get('/features/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(feature);
      expect(client.setEx).toHaveBeenCalledWith(
        'addFeature:1:lang:all',
        3600,
        JSON.stringify(feature)
      );
    });

    it('should return 404 if feature not found', async () => {
      AdditionalFeatures.findOne.mockResolvedValue(null);

      const response = await request(app).get('/features/1');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('No feature found with the given ID.');
    });
  });


  describe('updateFeature', () => {
    it('should update a feature successfully', async () => {
      const feature = { id: 1, FeatureName: 'WiFi', lang: 'en', update: jest.fn() };
      feature.update.mockResolvedValue(feature);
      AdditionalFeatures.findByPk.mockResolvedValue(feature);

      const response = await request(app)
        .put('/features/1')
        .send({ FeatureName: 'Updated WiFi', lang: 'ar' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Feature updated successfully');
      expect(client.del).toHaveBeenCalledWith('addFeature:1');
    });

    it('should return 404 if feature not found', async () => {
      AdditionalFeatures.findByPk.mockResolvedValue(null);

      const response = await request(app).put('/features/1').send({ FeatureName: 'WiFi' });

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('No feature found with the given ID.');
    });
  });


  describe('deleteFeature', () => {
    it('should delete a feature successfully', async () => {
      const feature = { id: 1, destroy: jest.fn() };
      AdditionalFeatures.findByPk.mockResolvedValue(feature);

      const response = await request(app).delete('/features/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Feature deleted successfully');
      expect(client.del).toHaveBeenCalledWith('addFeature:1');
    });

    it('should return 404 if feature not found', async () => {
      AdditionalFeatures.findByPk.mockResolvedValue(null);

      const response = await request(app).delete('/features/1');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('No feature found with the given ID.');
    });
  });
});
