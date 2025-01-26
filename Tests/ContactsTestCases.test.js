const request = require('supertest');
const app = require('../server'); 
const { Contacts } = require('../Models/Conatcts');
const { client } = require('../Utils/redisClient');
const { validateInput, ErrorResponse } = require('../Utils/validateInput');


jest.mock('../Models/Conatcts');
jest.mock('../Utils/redisClient');
jest.mock('../Utils/validateInput');

describe('Contacts Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });



  describe('POST /contacts (createContact)', () => {
    it('should create a new contact successfully', async () => {
      const mockContact = { id: 1, title: 'Test Title', action: 'Test Action', lang: 'en', image: 'test_image.png' };
      Contacts.create.mockResolvedValue(mockContact);

      const res = await request(app)
        .post('/contacts')
        .field('title', 'Test Title')
        .field('action', 'Test Action')
        .field('lang', 'en')
        .attach('image', './test_files/image.png');

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Contact created successfully');
      expect(res.body.contact.title).toBe('Test Title');
    });

    it('should return validation error for missing fields', async () => {
      const res = await request(app)
        .post('/contacts')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toContain('All fields are required');
    });

    it('should return validation error for invalid language', async () => {
      const res = await request(app)
        .post('/contacts')
        .field('title', 'Test Title')
        .field('action', 'Test Action')
        .field('lang', 'invalid_lang')
        .attach('image', './test_files/image.png');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toContain('Invalid language. Supported: en, ar');
    });

    it('should handle internal server errors', async () => {
      Contacts.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/contacts')
        .field('title', 'Test Title')
        .field('action', 'Test Action')
        .field('lang', 'en')
        .attach('image', './test_files/image.png');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create Contact');
    });
  });



  describe('GET /contacts (getContacts)', () => {
    it('should return cached data if available', async () => {
      const cachedData = JSON.stringify([{ id: 1, title: 'Test Title', action: 'Test Action', lang: 'en', image: 'test_image.png' }]);
      client.get.mockResolvedValue(cachedData);

      const res = await request(app).get('/contacts?page=1&limit=20&lang=en');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(JSON.parse(cachedData));
    });

    it('should return contacts from database if no cache', async () => {
      const mockContacts = [{ id: 1, title: 'Test Title', action: 'Test Action', lang: 'en', image: 'test_image.png' }];
      Contacts.findAll.mockResolvedValue(mockContacts);

      const res = await request(app).get('/contacts?page=1&limit=20&lang=en');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockContacts);
    });

    it('should return 500 if failed to fetch contacts', async () => {
      Contacts.findAll.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/contacts?page=1&limit=20&lang=en');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch Contacts');
    });
  });



  describe('GET /contacts/:id (getContactById)', () => {
    it('should return contact from cache if available', async () => {
      const cachedData = JSON.stringify({ id: 1, title: 'Test Title', action: 'Test Action', lang: 'en', image: 'test_image.png' });
      client.get.mockResolvedValue(cachedData);

      const res = await request(app).get('/contacts/1?lang=en');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(JSON.parse(cachedData));
    });

    it('should return contact from database if no cache', async () => {
      const mockContact = { id: 1, title: 'Test Title', action: 'Test Action', lang: 'en', image: 'test_image.png' };
      Contacts.findOne.mockResolvedValue(mockContact);

      const res = await request(app).get('/contacts/1?lang=en');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockContact);
    });

    it('should return 404 if contact not found', async () => {
      Contacts.findOne.mockResolvedValue(null);

      const res = await request(app).get('/contacts/999?lang=en');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Contact not found');
    });

    it('should handle internal server errors', async () => {
      Contacts.findOne.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/contacts/1?lang=en');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch Contact');
    });
  });



  describe('PUT /contacts/:id (updateContact)', () => {
    it('should update a contact successfully', async () => {
      const mockContact = { id: 1, title: 'Old Title', action: 'Old Action', lang: 'en', image: 'old_image.png' };
      Contacts.findByPk.mockResolvedValue(mockContact);
      mockContact.update = jest.fn().mockResolvedValue({ ...mockContact, title: 'New Title' });

      const res = await request(app)
        .put('/contacts/1')
        .field('title', 'New Title')
        .field('action', 'New Action')
        .field('lang', 'en')
        .attach('image', './test_files/image.png');

      expect(res.status).toBe(200);
      expect(res.body.contact.title).toBe('New Title');
    });

    it('should return 404 if contact not found', async () => {
      Contacts.findByPk.mockResolvedValue(null);

      const res = await request(app).put('/contacts/999')
        .field('title', 'New Title')
        .field('action', 'New Action')
        .field('lang', 'en')
        .attach('image', './test_files/image.png');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Contact not found');
    });

    it('should handle internal server errors', async () => {
      Contacts.findByPk.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/contacts/1')
        .field('title', 'New Title')
        .field('action', 'New Action')
        .field('lang', 'en')
        .attach('image', './test_files/image.png');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update Contact');
    });
  });


  describe('DELETE /contacts/:id (deleteContact)', () => {
    it('should delete a contact successfully', async () => {
      const mockContact = { id: 1, destroy: jest.fn().mockResolvedValue() };
      Contacts.findOne.mockResolvedValue(mockContact);

      const res = await request(app).delete('/contacts/1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Contact deleted successfully');
    });

    it('should return 404 if contact not found', async () => {
      Contacts.findOne.mockResolvedValue(null);

      const res = await request(app).delete('/contacts/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Contact not found');
    });

    it('should handle internal server errors', async () => {
      Contacts.findOne.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/contacts/1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete Contact');
    });
  });
});
