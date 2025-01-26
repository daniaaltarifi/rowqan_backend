const request = require('supertest');
const app = require('../server');
const Tags = require('../Models/TagsModel');
const Chalets = require('../Models/ChaletsModel');
const { client } = require('../Utils/redisClient');

jest.mock('../Models/TagsModel');
jest.mock('../Models/ChaletsModel');
jest.mock('../Utils/redisClient');


describe('POST /createTag', () => {
  it('should return 400 if required fields are missing', async () => {
    const response = await request(app).post('/createTag').send({
      lang: 'en',
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('TagName and lang and image are required');
  });

  it('should return 400 if validation fails', async () => {
    const response = await request(app).post('/createTag').send({
      TagName: 'Test Tag',
      lang: 'invalid-lang',
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Validation failed');
  });

  it('should return 201 and create tag successfully', async () => {
    Tags.create.mockResolvedValue({
      id: 1,
      TagName: 'Test Tag',
      lang: 'en',
      image: 'image.jpg',
    });
    client.setEx.mockResolvedValue(true);

    const response = await request(app).post('/createTag').send({
      TagName: 'Test Tag',
      lang: 'en',
      image: 'image.jpg',
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Tag created successfully');
  });

  it('should return 500 if internal server error occurs', async () => {
    Tags.create.mockRejectedValue(new Error('Database error'));

    const response = await request(app).post('/createTag').send({
      TagName: 'Test Tag',
      lang: 'en',
      image: 'image.jpg',
    });

    expect(response.status).toBe(500);
    expect(response.body.message).toContain('Failed to create tag');
  });
});




describe('POST /createTagAndProperty', () => {
  it('should return 400 if required fields are missing', async () => {
    const response = await request(app).post('/createTagAndProperty').send({
      lang: 'en',
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Chalet_Id, title, and lang are required');
  });

  it('should return 400 if invalid lang is provided', async () => {
    const response = await request(app).post('/createTagAndProperty').send({
      Chalet_Id: 1,
      title: 'Test Title',
      lang: 'invalid-lang',
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Invalid or missing language, it should be "en" or "ar"');
  });

  it('should return 404 if chalet not found', async () => {
    Chalets.findByPk.mockResolvedValue(null);

    const response = await request(app).post('/createTagAndProperty').send({
      Chalet_Id: 1,
      title: 'Test Title',
      lang: 'en',
    });

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('Chalet not found');
  });

  it('should return 201 and create tag and property successfully', async () => {
    Chalets.findByPk.mockResolvedValue({ id: 1 });
    client.del.mockResolvedValue(true);
    client.set.mockResolvedValue(true);

    const response = await request(app).post('/createTagAndProperty').send({
      Chalet_Id: 1,
      title: 'Test Title',
      lang: 'en',
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });

  it('should return 500 if internal server error occurs', async () => {
    Chalets.findByPk.mockRejectedValue(new Error('Database error'));

    const response = await request(app).post('/createTagAndProperty').send({
      Chalet_Id: 1,
      title: 'Test Title',
      lang: 'en',
    });

    expect(response.status).toBe(500);
    expect(response.body.message).toContain('Error creating property');
  });
});




describe('GET /getTags', () => {
  it('should return 200 and tags from cache if available', async () => {
    client.get.mockResolvedValue(JSON.stringify([{ id: 1, TagName: 'Test Tag', lang: 'en' }]));

    const response = await request(app).get('/getTags?lang=en');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, TagName: 'Test Tag', lang: 'en' }]);
  });

  it('should return 200 and fetch tags from database if cache is empty', async () => {
    client.get.mockResolvedValue(null);
    Tags.findAll.mockResolvedValue([{ id: 1, TagName: 'Test Tag', lang: 'en' }]);

    const response = await request(app).get('/getTags?lang=en');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, TagName: 'Test Tag', lang: 'en' }]);
  });

  it('should return 500 if database query fails', async () => {
    client.get.mockResolvedValue(null);
    Tags.findAll.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/getTags?lang=en');
    expect(response.status).toBe(500);
    expect(response.body.message).toContain('Failed to fetch tags');
  });
});





describe('GET /getTagById', () => {
  it('should return 200 and fetch tag from cache if available', async () => {
    client.get.mockResolvedValue(JSON.stringify({ id: 1, TagName: 'Test Tag', lang: 'en' }));

    const response = await request(app).get('/getTagById/1');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 1, TagName: 'Test Tag', lang: 'en' });
  });

  it('should return 200 and fetch tag from database if cache is empty', async () => {
    client.get.mockResolvedValue(null);
    Tags.findByPk.mockResolvedValue({ id: 1, TagName: 'Test Tag', lang: 'en' });

    const response = await request(app).get('/getTagById/1');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 1, TagName: 'Test Tag', lang: 'en' });
  });

  it('should return 404 if tag not found', async () => {
    client.get.mockResolvedValue(null);
    Tags.findByPk.mockResolvedValue(null);

    const response = await request(app).get('/getTagById/1');
    expect(response.status).toBe(404);
    expect(response.body.message).toContain('Tag not found');
  });

  it('should return 500 if internal server error occurs', async () => {
    Tags.findByPk.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/getTagById/1');
    expect(response.status).toBe(500);
    expect(response.body.message).toContain('Failed to fetch tag');
  });
});




describe('PUT /updateTag/:id', () => {
  it('should return 404 if tag not found', async () => {
    Tags.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .put('/updateTag/1')
      .send({ TagName: 'Updated Tag', lang: 'en' });
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Tag not found');
  });

  it('should return 200 and update tag successfully', async () => {
    Tags.findByPk.mockResolvedValue({ id: 1, TagName: 'Old Tag', lang: 'en', update: jest.fn() });

    const response = await request(app)
      .put('/updateTag/1')
      .send({ TagName: 'Updated Tag', lang: 'en' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Tag updated successfully');
  });

  it('should return 500 if internal server error occurs', async () => {
    Tags.findByPk.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .put('/updateTag/1')
      .send({ TagName: 'Updated Tag', lang: 'en' });

    expect(response.status).toBe(500);
    expect(response.body.message).toContain('Failed to update tag');
  });
});




describe('DELETE /deleteTag/:id', () => {
  it('should return 404 if tag not found', async () => {
    Tags.findByPk.mockResolvedValue(null);

    const response = await request(app).delete('/deleteTag/1');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Tag not found');
  });

  it('should return 200 and delete tag successfully', async () => {
    Tags.findByPk.mockResolvedValue({ id: 1, destroy: jest.fn() });

    const response = await request(app).delete('/deleteTag/1');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Tag deleted successfully');
  });

  it('should return 500 if internal server error occurs', async () => {
    Tags.findByPk.mockRejectedValue(new Error('Database error'));

    const response = await request(app).delete('/deleteTag/1');
    expect(response.status).toBe(500);
    expect(response.body.message).toContain('Failed to delete tag');
  });
});
