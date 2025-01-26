const request = require('supertest');
const app = require('../server');
const Status = require('../Models/StatusModel');
const { client } = require('../Utils/redisClient');

jest.mock('../Models/StatusModel');
jest.mock('../Utils/redisClient');



describe('POST /createStatus', () => {
  it('should return 400 if required fields are missing', async () => {
    const response = await request(app).post('/createStatus').send({
      lang: 'en',
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Status and language are required');
  });

  it('should return 400 if validation fails', async () => {
    const response = await request(app).post('/createStatus').send({
      status: 'Test Status',
      lang: 'invalid-lang',
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Validation failed');
  });

  it('should return 400 if status with the same name and language already exists', async () => {
    Status.findOne.mockResolvedValue({ status: 'Test Status', lang: 'en' });

    const response = await request(app).post('/createStatus').send({
      status: 'Test Status',
      lang: 'en',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Status with the same name and language already exists');
  });

  it('should return 201 and create status successfully', async () => {
    Status.create.mockResolvedValue({
      id: 1,
      status: 'Test Status',
      lang: 'en',
    });
    client.del.mockResolvedValue(true);
    client.set.mockResolvedValue(true);

    const response = await request(app).post('/createStatus').send({
      status: 'Test Status',
      lang: 'en',
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Status created successfully');
  });

  it('should return 500 if internal server error occurs', async () => {
    Status.create.mockRejectedValue(new Error('Database error'));

    const response = await request(app).post('/createStatus').send({
      status: 'Test Status',
      lang: 'en',
    });

    expect(response.status).toBe(500);
    expect(response.body.message).toContain('An internal server error occurred');
  });
});






describe('GET /getAllStatuses', () => {
  it('should return 400 if invalid language is provided', async () => {
    const response = await request(app).get('/getAllStatuses/invalid-lang');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid language');
  });

  it('should return 200 and statuses from cache if available', async () => {
    client.get.mockResolvedValue(JSON.stringify([{ id: 1, status: 'Active', lang: 'en' }]));

    const response = await request(app).get('/getAllStatuses/en?page=1&limit=20');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, status: 'Active', lang: 'en' }]);
  });

  it('should return 200 and fetch statuses from the database if cache is empty', async () => {
    client.get.mockResolvedValue(null);
    Status.findAll.mockResolvedValue([{ id: 1, status: 'Active', lang: 'en' }]);

    const response = await request(app).get('/getAllStatuses/en?page=1&limit=20');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, status: 'Active', lang: 'en' }]);
  });

  it('should return 404 if no statuses found', async () => {
    client.get.mockResolvedValue(null);
    Status.findAll.mockResolvedValue([]);

    const response = await request(app).get('/getAllStatuses/en?page=1&limit=20');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('No statuses found for this language');
  });

  it('should return 500 if database query fails', async () => {
    client.get.mockResolvedValue(null);
    Status.findAll.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/getAllStatuses/en?page=1&limit=20');
    expect(response.status).toBe(500);
    expect(response.body.message).toContain('An internal server error occurred');
  });
});






describe('GET /getStatusById', () => {
  it('should return 400 if invalid language is provided', async () => {
    const response = await request(app).get('/getStatusById/1/invalid-lang');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid language');
  });

  it('should return 200 and fetch status from cache if available', async () => {
    client.get.mockResolvedValue(JSON.stringify({ id: 1, status: 'Active', lang: 'en' }));

    const response = await request(app).get('/getStatusById/1/en');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 1, status: 'Active', lang: 'en' });
  });

  it('should return 200 and fetch status from database if cache is empty', async () => {
    client.get.mockResolvedValue(null);
    Status.findOne.mockResolvedValue({ id: 1, status: 'Active', lang: 'en' });

    const response = await request(app).get('/getStatusById/1/en');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 1, status: 'Active', lang: 'en' });
  });

  it('should return 404 if status not found', async () => {
    client.get.mockResolvedValue(null);
    Status.findOne.mockResolvedValue(null);

    const response = await request(app).get('/getStatusById/1/en');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Status not found for the specified language');
  });

  it('should return 500 if database query fails', async () => {
    client.get.mockResolvedValue(null);
    Status.findOne.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/getStatusById/1/en');
    expect(response.status).toBe(500);
    expect(response.body.error).toContain('An internal server error occurred');
  });
});





describe('PUT /updateStatus/:id', () => {
  it('should return 404 if status is not found', async () => {
    Status.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .put('/updateStatus/1')
      .send({ status: 'Updated Status', lang: 'en' });
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Status not found');
  });

  it('should return 400 if validation fails', async () => {
    const response = await request(app)
      .put('/updateStatus/1')
      .send({ status: '', lang: 'en' });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Validation failed');
  });

  it('should return 200 and update status successfully', async () => {
    Status.findByPk.mockResolvedValue({ id: 1, status: 'Old Status', lang: 'en', update: jest.fn() });

    const response = await request(app)
      .put('/updateStatus/1')
      .send({ status: 'Updated Status', lang: 'en' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Status updated successfully');
  });

  it('should return 500 if internal server error occurs', async () => {
    Status.findByPk.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .put('/updateStatus/1')
      .send({ status: 'Updated Status', lang: 'en' });
    expect(response.status).toBe(500);
    expect(response.body.message).toContain('Failed to update Status');
  });
});





describe('DELETE /deleteStatus/:id', () => {
  it('should return 404 if status is not found', async () => {
    Status.findOne.mockResolvedValue(null);

    const response = await request(app).delete('/deleteStatus/1/en');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Status not found for the specified language');
  });

  it('should return 200 and delete status successfully', async () => {
    Status.findOne.mockResolvedValue({ id: 1, lang: 'en', destroy: jest.fn() });

    const response = await request(app).delete('/deleteStatus/1/en');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Status deleted successfully');
  });

  it('should return 500 if internal server error occurs', async () => {
    Status.findOne.mockRejectedValue(new Error('Database error'));

    const response = await request(app).delete('/deleteStatus/1/en');
    expect(response.status).toBe(500);
    expect(response.body.message).toContain('Failed to delete Status');
  });
});
