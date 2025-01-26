const request = require('supertest');
const app = require('../server');
const { client } = require('../Utils/redisClient');
const Footer = require('../Models/FooterModel');
const { ErrorResponse } = require('../Utils/validateInput');


jest.mock('../Models/FooterModel');
jest.mock('../Utils/redisClient', () => ({
  client: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
  },
}));

describe('Footer Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });



  describe('createFooter', () => {
    it('should create a footer successfully', async () => {
      const newFooterData = { title: 'Footer Title', lang: 'en' };
      const mockFooter = { id: 1, ...newFooterData };
      Footer.findOrCreate.mockResolvedValue([mockFooter, true]);

      const response = await request(app).post('/footers').send(newFooterData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockFooter);
      expect(Footer.findOrCreate).toHaveBeenCalledWith({
        where: { title: 'Footer Title', lang: 'en' },
        defaults: { title: 'Footer Title', lang: 'en' },
      });
    });

    it('should return 400 if title or lang is missing', async () => {
      const newFooterData = { title: 'Footer Title' }; 

      const response = await request(app).post('/footers').send(newFooterData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Title and language are required.');
    });

    it('should return 400 if footer already exists', async () => {
      const newFooterData = { title: 'Footer Title', lang: 'en' };
      Footer.findOrCreate.mockResolvedValue([null, false]);

      const response = await request(app).post('/footers').send(newFooterData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Footer with the same title and language already exists');
    });
  });



  describe('getAllFooters', () => {
    it('should return cached footers if available', async () => {
      const cachedData = JSON.stringify([{ id: 1, title: 'Footer Title', lang: 'en' }]);
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/footers/en?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch footers from database and cache if not cached', async () => {
      const footers = [{ id: 1, title: 'Footer Title', lang: 'en' }];
      client.get.mockResolvedValue(null);
      Footer.findAll.mockResolvedValue(footers);

      const response = await request(app).get('/footers/en?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(footers);
      expect(client.setEx).toHaveBeenCalledWith(
        'footers:lang:en:page:1:limit:20',
        3600,
        JSON.stringify(footers)
      );
    });

    it('should return 400 if lang is missing', async () => {
      const response = await request(app).get('/footers?page=1&limit=20');

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Language is required');
    });

    it('should return 404 if no footers are found for the specified language', async () => {
      Footer.findAll.mockResolvedValue([]);

      const response = await request(app).get('/footers/en?page=1&limit=20');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('No footers found for the specified language');
    });
  });



  describe('getFooterById', () => {
    it('should return a footer by ID from cache if available', async () => {
      const cachedData = JSON.stringify({ id: 1, title: 'Footer Title', lang: 'en' });
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/footers/1/en');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch a footer by ID from the database and cache if not cached', async () => {
      const footer = { id: 1, title: 'Footer Title', lang: 'en' };
      client.get.mockResolvedValue(null);
      Footer.findOne.mockResolvedValue(footer);

      const response = await request(app).get('/footers/1/en');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(footer);
      expect(client.setEx).toHaveBeenCalledWith(
        'footer:1:lang:en',
        3600,
        JSON.stringify(footer)
      );
    });

    it('should return 404 if footer not found', async () => {
      Footer.findOne.mockResolvedValue(null);

      const response = await request(app).get('/footers/999/en');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Footer not found');
    });
  });



  describe('updateFooter', () => {
    it('should update a footer successfully', async () => {
      const updatedFooterData = { title: 'Updated Footer', lang: 'en' };
      const existingFooter = { id: 1, title: 'Footer Title', lang: 'en', update: jest.fn() };
      Footer.findByPk.mockResolvedValue(existingFooter);

      const response = await request(app).put('/footers/1').send(updatedFooterData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Footer');
      expect(existingFooter.update).toHaveBeenCalledWith(updatedFooterData);
    });

    it('should return 404 if footer not found for update', async () => {
      Footer.findByPk.mockResolvedValue(null);

      const response = await request(app).put('/footers/999').send({ title: 'Updated Footer', lang: 'en' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Footer entry not found');
    });
  });



  describe('deleteFooter', () => {
    it('should delete a footer successfully', async () => {
      const footer = { id: 1, destroy: jest.fn() };
      Footer.findByPk.mockResolvedValue(footer);

      const response = await request(app).delete('/footers/1/en');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Footer deleted successfully');
      expect(footer.destroy).toHaveBeenCalled();
    });

    it('should return 404 if footer not found for deletion', async () => {
      Footer.findByPk.mockResolvedValue(null);

      const response = await request(app).delete('/footers/999/en');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Footer not found');
    });
  });
});
