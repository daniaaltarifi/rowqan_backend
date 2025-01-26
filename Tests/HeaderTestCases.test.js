const request = require('supertest');
const app = require('../server');
const { client } = require('../Utils/redisClient');
const Header = require('../Models/HeaderModel');
const { ErrorResponse } = require('../Utils/validateInput');

jest.mock('../Models/HeaderModel');
jest.mock('../Utils/redisClient', () => ({
  client: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
  },
}));

describe('Header Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });


  
  describe('createHeader', () => {
    it('should create a new header successfully', async () => {
      const newHeaderData = {
        header_name: 'Test Header',
        lang: 'en',
        url: 'https://example.com',
      };

      Header.create.mockResolvedValue(newHeaderData);

      const response = await request(app)
        .post('/headers')
        .send(newHeaderData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newHeaderData);
      expect(Header.create).toHaveBeenCalledWith(expect.objectContaining(newHeaderData));
    });

    it('should return 400 if language is invalid', async () => {
      const newHeaderData = {
        header_name: 'Test Header',
        lang: 'invalidLang',
        url: 'https://example.com',
      };

      const response = await request(app)
        .post('/headers')
        .send(newHeaderData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid language');
    });
  });

  
  
  describe('getAllHeaders', () => {
    it('should return headers from cache if available', async () => {
      const cachedData = JSON.stringify([{ id: 1, header_name: 'Test Header', lang: 'en', url: 'https://example.com' }]);
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/headers/en?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch headers from database and cache if not cached', async () => {
      const headers = [{ id: 1, header_name: 'Test Header', lang: 'en', url: 'https://example.com' }];
      client.get.mockResolvedValue(null);
      Header.findAll.mockResolvedValue(headers);

      const response = await request(app).get('/headers/en?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(headers);
      expect(client.setEx).toHaveBeenCalledWith(
        'headers:lang:en:page:1:limit:20',
        3600,
        JSON.stringify(headers)
      );
    });

    it('should return 400 if language parameter is missing', async () => {
      const response = await request(app).get('/headers?page=1&limit=20');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Language parameter is required');
    });

    it('should return 404 if no headers found for the specified language', async () => {
      const lang = 'en';
      const headers = [];
      Header.findAll.mockResolvedValue(headers);

      const response = await request(app).get(`/headers/${lang}?page=1&limit=20`);
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No headers found for the specified language');
    });
  });



  describe('getHeaderById', () => {
    it('should return header by ID from cache if available', async () => {
      const cachedData = JSON.stringify({ id: 1, header_name: 'Test Header', lang: 'en', url: 'https://example.com' });
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/headers/1/en');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch header by ID from database and cache if not cached', async () => {
      const header = { id: 1, header_name: 'Test Header', lang: 'en', url: 'https://example.com' };
      client.get.mockResolvedValue(null);
      Header.findOne.mockResolvedValue(header);

      const response = await request(app).get('/headers/1/en');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(header);
      expect(client.setEx).toHaveBeenCalledWith(
        'header:1:lang:en',
        3600,
        JSON.stringify(header)
      );
    });

    it('should return 404 if header not found', async () => {
      Header.findOne.mockResolvedValue(null);

      const response = await request(app).get('/headers/999/en');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Header not found');
    });
  });





  describe('updateHeader', () => {
    it('should update a header successfully', async () => {
      const updatedHeaderData = { header_name: 'Updated Header', lang: 'en', url: 'https://updated.com' };
      const existingHeader = { id: 1, header_name: 'Test Header', lang: 'en', url: 'https://example.com', save: jest.fn() };
      Header.findOne.mockResolvedValue(existingHeader);

      const response = await request(app)
        .put('/headers/1')
        .send(updatedHeaderData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedHeaderData);
      expect(existingHeader.save).toHaveBeenCalled();
    });

    it('should return 404 if header not found for update', async () => {
      Header.findOne.mockResolvedValue(null);

      const response = await request(app)
        .put('/headers/999')
        .send({ header_name: 'Updated Header', lang: 'en', url: 'https://updated.com' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Header not found');
    });
  });




  describe('deleteHeader', () => {
    it('should delete a header successfully', async () => {
      const header = { id: 1, destroy: jest.fn() };
      Header.findOne.mockResolvedValue(header);

      const response = await request(app).delete('/headers/1/en');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Header deleted successfully');
      expect(header.destroy).toHaveBeenCalled();
    });

    it('should return 404 if header not found for deletion', async () => {
      Header.findOne.mockResolvedValue(null);

      const response = await request(app).delete('/headers/999/en');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Header not found');
    });
  });
});
