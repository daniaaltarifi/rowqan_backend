const request = require('supertest');
const app = require('../app'); // Your Express app
const { About } = require('../Models/AboutModel');
const { client } = require('../Utils/redisClient');

jest.mock('../Utils/redisClient');
jest.mock('../Models/AboutModel');

describe('About Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  
  
  describe('POST /about (createAbout)', () => {
    it('should create an about entry successfully', async () => {
      const mockAbout = { id: 1, title: 'Test Title', description: 'Test Description', lang: 'en', image: 'image.png' };
      About.create.mockResolvedValue(mockAbout);

      const res = await request(app)
        .post('/about')
        .field('title', 'Test Title')
        .field('description', 'Test Description')
        .field('lang', 'en')
        .attach('image', './test_files/image.png'); 

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('About Us created successfully');
      expect(res.body.about).toEqual(mockAbout);
    });

    it('should return validation error for missing fields', async () => {
      const res = await request(app).post('/about').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toContain('All Fields are required');
    });

    it('should handle internal server errors', async () => {
      About.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/about')
        .field('title', 'Test Title')
        .field('description', 'Test Description')
        .field('lang', 'en')
        .attach('image', './test_files/image.png');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create Hero');
    });
  });

  
  
  describe('GET /about (getAbout)', () => {
    it('should return a paginated list of about entries', async () => {
      const mockAboutEntries = [
        { id: 1, title: 'Test Title', description: 'Test Description', lang: 'en', image: 'image.png' },
      ];
      About.findAll.mockResolvedValue(mockAboutEntries);

      const res = await request(app).get('/about?page=1&limit=20');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockAboutEntries);
    });

    it('should return cached data if available', async () => {
      const cachedData = JSON.stringify([{ id: 1, title: 'Cached Title', description: 'Cached Description' }]);
      client.get.mockResolvedValue(cachedData);

      const res = await request(app).get('/about?page=1&limit=20');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(JSON.parse(cachedData));
    });

    it('should handle internal server errors', async () => {
      About.findAll.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/about?page=1&limit=20');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch About entries');
    });
  });

  
  
  describe('GET /about/:id (getAboutById)', () => {
    it('should return a single about entry', async () => {
      const mockAboutEntry = { id: 1, title: 'Test Title', description: 'Test Description', lang: 'en', image: 'image.png' };
      About.findOne.mockResolvedValue(mockAboutEntry);

      const res = await request(app).get('/about/1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockAboutEntry);
    });

    it('should return 404 if entry is not found', async () => {
      About.findOne.mockResolvedValue(null);

      const res = await request(app).get('/about/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('About entry not found');
    });

    it('should handle internal server errors', async () => {
      About.findOne.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/about/1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch About entry');
    });
  });


  describe('PUT /about/:id (updateAbout)', () => {
    it('should update an about entry successfully', async () => {
      const mockAboutEntry = { id: 1, title: 'Old Title', description: 'Old Description', lang: 'en', image: 'old.png' };
      About.findByPk.mockResolvedValue(mockAboutEntry);
      mockAboutEntry.update = jest.fn().mockResolvedValue({ ...mockAboutEntry, title: 'New Title' });

      const res = await request(app).put('/about/1').send({ title: 'New Title', description: 'Old Description', lang: 'en' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('About entry updated successfully');
      expect(res.body.aboutEntry.title).toBe('New Title');
    });

    it('should return 404 if entry is not found', async () => {
      About.findByPk.mockResolvedValue(null);

      const res = await request(app).put('/about/999').send({ title: 'New Title' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('About entry not found');
    });

    it('should handle internal server errors', async () => {
      About.findByPk.mockRejectedValue(new Error('Database error'));

      const res = await request(app).put('/about/1').send({ title: 'New Title' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update About entry');
    });
  });


  describe('DELETE /about/:id (deleteAbout)', () => {
    it('should delete an about entry successfully', async () => {
      const mockAboutEntry = { id: 1, destroy: jest.fn().mockResolvedValue() };
      About.findOne.mockResolvedValue(mockAboutEntry);

      const res = await request(app).delete('/about/1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('About entry deleted successfully');
    });

    it('should return 404 if entry is not found', async () => {
      About.findOne.mockResolvedValue(null);

      const res = await request(app).delete('/about/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('About entry not found');
    });

    it('should handle internal server errors', async () => {
      About.findOne.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/about/1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete About entry');
    });
  });
});
