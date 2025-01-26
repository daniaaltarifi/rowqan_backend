const request = require('supertest');
const app = require('../server');
const Services = require('../Models/ServicesModel');
const { client } = require('../Utils/redisClient');

jest.mock('../Models/ServicesModel');
jest.mock('../Utils/redisClient');

describe('POST /createService', () => {
  it('should return 400 if required fields are missing', async () => {
    const response = await request(app).post('/createService').send({
      title: 'Test Service',
      status_service: 'active',
      url: 'https://example.com',
      lang: 'en',
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('All Fields are required');
  });

  it('should return 400 if validation fails', async () => {
    const response = await request(app).post('/createService').send({
      title: 'Test Service',
      status_service: 'active',
      url: 'invalid-url',
      lang: 'en',
      image: 'image.jpg',
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Validation failed');
  });

  it('should return 201 and create service successfully', async () => {
    Services.create.mockResolvedValue({
      id: 1,
      title: 'Test Service',
      status_service: 'active',
      url: 'https://example.com',
      lang: 'en',
      image: 'image.jpg',
    });
    client.del.mockResolvedValue(true);
    client.set.mockResolvedValue(true);

    const response = await request(app).post('/createService').send({
      title: 'Test Service',
      status_service: 'active',
      url: 'https://example.com',
      lang: 'en',
      image: 'image.jpg',
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Service created successfully');
  });

  it('should return 500 if internal server error occurs', async () => {
    Services.create.mockRejectedValue(new Error('Database error'));
    const response = await request(app).post('/createService').send({
      title: 'Test Service',
      status_service: 'active',
      url: 'https://example.com',
      lang: 'en',
      image: 'image.jpg',
    });
    expect(response.status).toBe(500);
    expect(response.body.error).toContain('An internal server error occurred.');
  });
});






describe('GET /getAllServices', () => {
    it('should return 400 if invalid language is provided', async () => {
      const response = await request(app).get('/getAllServices/ar');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid language');
    });
  
    it('should return 200 and services from cache if available', async () => {
      client.get.mockResolvedValue(JSON.stringify([{ id: 1, title: 'Test Service' }]));
  
      const response = await request(app).get('/getAllServices/en?page=1&limit=20');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 1, title: 'Test Service' }]);
    });
  
    it('should return 200 and fetch services from the database if cache is empty', async () => {
      client.get.mockResolvedValue(null);
      Services.findAll.mockResolvedValue([{ id: 1, title: 'Test Service' }]);
  
      const response = await request(app).get('/getAllServices/en?page=1&limit=20');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 1, title: 'Test Service' }]);
    });
  
    it('should return 404 if no services found', async () => {
      client.get.mockResolvedValue(null);
      Services.findAll.mockResolvedValue([]);
  
      const response = await request(app).get('/getAllServices/en?page=1&limit=20');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No services found for this language');
    });
  
    it('should return 500 if database query fails', async () => {
      client.get.mockResolvedValue(null);
      Services.findAll.mockRejectedValue(new Error('Database error'));
  
      const response = await request(app).get('/getAllServices/en?page=1&limit=20');
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('An internal server error occurred.');
    });
  });

  







  describe('GET /getServiceByStatus', () => {
    it('should return 400 if required parameters are missing', async () => {
      const response = await request(app).get('/getServiceByStatus');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Both "status_service" and "lang" are required.');
    });
  
    it('should return 200 and fetch services from cache if available', async () => {
      client.get.mockResolvedValue(JSON.stringify([{ id: 1, title: 'Test Service' }]));
  
      const response = await request(app).get('/getServiceByStatus/active/en');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 1, title: 'Test Service' }]);
    });
  
    it('should return 200 and fetch services from the database if cache is empty', async () => {
      client.get.mockResolvedValue(null);
      Services.findAll.mockResolvedValue([{ id: 1, title: 'Test Service' }]);
  
      const response = await request(app).get('/getServiceByStatus/active/en');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 1, title: 'Test Service' }]);
    });
  
    it('should return 404 if no services found for given status', async () => {
      client.get.mockResolvedValue(null);
      Services.findAll.mockResolvedValue([]);
  
      const response = await request(app).get('/getServiceByStatus/active/en');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No services found for language: en and status: active.');
    });
  
    it('should return 500 if internal server error occurs', async () => {
      client.get.mockResolvedValue(null);
      Services.findAll.mockRejectedValue(new Error('Database error'));
  
      const response = await request(app).get('/getServiceByStatus/active/en');
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('An internal server error occurred.');
    });
  });

  


  describe('PUT /updateService/:id', () => {
    it('should return 404 if service is not found', async () => {
      Services.findOne.mockResolvedValue(null);
  
      const response = await request(app)
        .put('/updateService/1')
        .send({ title: 'Updated Service', status_service: 'active', url: 'https://example.com', lang: 'en' });
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Service not found');
    });
  
    it('should return 400 if validation fails', async () => {
      const response = await request(app)
        .put('/updateService/1')
        .send({ title: '', status_service: 'active', url: 'invalid-url', lang: 'en' });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });
  
    it('should return 200 and update service successfully', async () => {
      Services.findOne.mockResolvedValue({ id: 1, title: 'Old Service', status_service: 'inactive', url: 'https://old.com', lang: 'en', save: jest.fn() });
  
      const response = await request(app)
        .put('/updateService/1')
        .send({ title: 'Updated Service', status_service: 'active', url: 'https://example.com', lang: 'en' });
  
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Service updated successfully');
    });
  
    it('should return 500 if internal server error occurs', async () => {
      Services.findOne.mockRejectedValue(new Error('Database error'));
  
      const response = await request(app)
        .put('/updateService/1')
        .send({ title: 'Updated Service', status_service: 'active', url: 'https://example.com', lang: 'en' });
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to update service');
    });
  });

  



  describe('DELETE /deleteService/:id', () => {
    it('should return 404 if service is not found', async () => {
      Services.findByPk.mockResolvedValue(null);
  
      const response = await request(app).delete('/deleteService/1/en');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Service not found');
    });
  
    it('should return 200 and delete service successfully', async () => {
      Services.findByPk.mockResolvedValue({ id: 1, destroy: jest.fn() });
  
      const response = await request(app).delete('/deleteService/1/en');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Service deleted successfully');
    });
  
    it('should return 500 if internal server error occurs', async () => {
      Services.findByPk.mockRejectedValue(new Error('Database error'));
  
      const response = await request(app).delete('/deleteService/1/en');
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to delete service');
    });
  });
  