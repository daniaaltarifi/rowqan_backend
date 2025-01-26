const request = require('supertest');
const app = require('../server'); 
const { Chalet } = require('../Models/ChaletsModel');
const { ChaletsImages } = require('../Models/ChaletsImagesModel');
const { client } = require('../Utils/redisClient');


jest.mock('../Utils/redisClient');
jest.mock('../Models/ChaletsModel');
jest.mock('../Models/ChaletsImagesModel');

describe('Chalet Images Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });




  describe('POST /chalet/images (createChaletImages)', () => {
    it('should upload chalet images successfully', async () => {
      const mockChalet = { id: 1 };
      const mockFiles = [{ originalname: 'image.png', filename: 'image1' }];
      Chalet.findByPk.mockResolvedValue(mockChalet);
      ChaletsImages.bulkCreate.mockResolvedValue([{ image: 'https://res.cloudinary.com/dqimsdiht/image/upload/image1.png' }]);

      const res = await request(app)
        .post('/chalet/images')
        .field('chalet_id', 1)
        .attach('files', './test_files/image.png');

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Chalet files uploaded successfully');
      expect(res.body.files[0].image).toContain('https://res.cloudinary.com/dqimsdiht/image/upload/image1.png');
    });

    it('should return validation error for missing chalet_id', async () => {
      const res = await request(app)
        .post('/chalet/images')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toContain('Chalet ID is required');
    });

    it('should return validation error for missing files', async () => {
      const res = await request(app)
        .post('/chalet/images')
        .field('chalet_id', 1);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Files are required');
    });

    it('should return validation error for invalid file types', async () => {
      const mockChalet = { id: 1 };
      const mockFiles = [{ originalname: 'invalid.txt', filename: 'file1' }];
      Chalet.findByPk.mockResolvedValue(mockChalet);

      const res = await request(app)
        .post('/chalet/images')
        .field('chalet_id', 1)
        .attach('files', './test_files/invalid.txt');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid file types. Allowed: .png, .jpeg, .mp4');
    });

    it('should handle internal server errors', async () => {
      Chalet.findByPk.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/chalet/images')
        .field('chalet_id', 1)
        .attach('files', './test_files/image.png');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create chalet files');
    });
  });



  describe('GET /chalet/images/:chalet_id (getImagesByChaletId)', () => {
    it('should return images from cache if available', async () => {
      const cachedData = JSON.stringify(['https://res.cloudinary.com/dqimsdiht/image/upload/image1.png']);
      client.get.mockResolvedValue(cachedData);

      const res = await request(app).get('/chalet/images/1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(JSON.parse(cachedData));
    });


    it('should return chalet images from database', async () => {
      const mockChaletImages = [{ image: 'https://res.cloudinary.com/dqimsdiht/image/upload/image1.png' }];
      ChaletsImages.findAll.mockResolvedValue(mockChaletImages);

      const res = await request(app).get('/chalet/images/1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([mockChaletImages[0].image]);
    });

    it('should return 404 if no images found for chalet', async () => {
      ChaletsImages.findAll.mockResolvedValue([]);

      const res = await request(app).get('/chalet/images/1');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No images found for this chalet');
    });

    it('should handle internal server errors', async () => {
      ChaletsImages.findAll.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/chalet/images/1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to retrieve chalet images');
    });
  });



  describe('PUT /chalet/images/:id (updateChaletImage)', () => {
    it('should update a chalet image successfully', async () => {
      const mockChaletImage = { id: 1, image: 'old_image.png' };
      ChaletsImages.findByPk.mockResolvedValue(mockChaletImage);
      mockChaletImage.save = jest.fn().mockResolvedValue({ ...mockChaletImage, image: 'new_image.png' });

      const res = await request(app)
        .put('/chalet/images/1')
        .attach('image', './test_files/image.png');

      expect(res.status).toBe(200);
      expect(res.body.image).toBe('new_image.png');
    });

    it('should return 404 if chalet image not found', async () => {
      ChaletsImages.findByPk.mockResolvedValue(null);

      const res = await request(app).put('/chalet/images/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Chalet image not found');
    });

    it('should handle internal server errors', async () => {
      ChaletsImages.findByPk.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/chalet/images/1')
        .attach('image', './test_files/image.png');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update chalet image');
    });
  });




  describe('DELETE /chalet/images/:id (deleteChaletImage)', () => {
    it('should delete a chalet image successfully', async () => {
      const mockChaletImage = { id: 1, destroy: jest.fn().mockResolvedValue() };
      ChaletsImages.findByPk.mockResolvedValue(mockChaletImage);

      const res = await request(app).delete('/chalet/images/1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Chalet image deleted successfully');
    });

    it('should return 404 if chalet image not found', async () => {
      ChaletsImages.findByPk.mockResolvedValue(null);

      const res = await request(app).delete('/chalet/images/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Chalet image not found');
    });

    it('should handle internal server errors', async () => {
      ChaletsImages.findByPk.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/chalet/images/1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete Chalet image');
    });
  });
});
