const request = require('supertest');
const app = require('../server'); 
const { client } = require('../Utils/redisClient');
const Blog = require('../Models/BlogModel');

jest.mock('../Models/BlogModel');


jest.mock('../Utils/redisClient', () => ({
  client: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
  },
}));


describe('Blog Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });



  describe('createBlog', () => {
    it('should create a blog successfully', async () => {
      const blogData = { title: 'Test Blog', description: 'Test Description', lang: 'en', image: 'image.png' };
      Blog.create.mockResolvedValue(blogData);

      const response = await request(app).post('/blogs').send({
        title: 'Test Blog',
        description: 'Test Description',
        lang: 'en',
        file: { filename: 'image.png' },
      });

      expect(response.status).toBe(201);
      expect(response.body.blog).toEqual(blogData);
      expect(client.del).toHaveBeenCalledWith('blogs:lang:en:page:1:limit:20');
      expect(client.setEx).toHaveBeenCalledWith(
        `blogs:lang:${blogData.lang}:page:1:limit:20`,
        3600,
        JSON.stringify(blogData)
      );
    });

    it('should return validation errors if required fields are missing', async () => {
      const response = await request(app).post('/blogs').send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('All fields are required');
    });
  });

  
  
  describe('getAllBlogs', () => {
    it('should return blogs from the cache if available', async () => {
      const cachedData = JSON.stringify([{ id: 1, title: 'Test Blog', lang: 'en' }]);
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/blogs/en?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch blogs from the database and set cache if not cached', async () => {
      const blogEntries = [{ id: 1, title: 'Test Blog', lang: 'en' }];
      Blog.findAll.mockResolvedValue(blogEntries);
      client.get.mockResolvedValue(null);

      const response = await request(app).get('/blogs/en?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(blogEntries);
      expect(client.setEx).toHaveBeenCalledWith(
        'blogs:lang:en:page:1:limit:20',
        3600,
        JSON.stringify(blogEntries)
      );
    });

    it('should return 404 if no blogs found', async () => {
      Blog.findAll.mockResolvedValue([]);

      const response = await request(app).get('/blogs/en?page=1&limit=20');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('No Blogs found');
    });
  });



  describe('getBlogById', () => {
    it('should return a blog by ID from the cache if available', async () => {
      const cachedData = JSON.stringify({ id: 1, title: 'Test Blog', lang: 'en' });
      client.get.mockResolvedValue(cachedData);

      const response = await request(app).get('/blogs/1/en');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(cachedData));
    });

    it('should fetch a blog by ID from the database if not cached', async () => {
      const blog = { id: 1, title: 'Test Blog', lang: 'en' };
      Blog.findOne.mockResolvedValue(blog);
      client.get.mockResolvedValue(null);

      const response = await request(app).get('/blogs/1/en');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([blog]);
      expect(client.setEx).toHaveBeenCalledWith(
        'Blog:1:lang:en',
        3600,
        JSON.stringify(blog)
      );
    });

    it('should return 404 if blog not found', async () => {
      Blog.findOne.mockResolvedValue(null);

      const response = await request(app).get('/blogs/1/en');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('Blog entry not found');
    });
  });



  describe('updateBlog', () => {
    it('should update a blog successfully', async () => {
      const blog = { id: 1, title: 'Test Blog', lang: 'en', update: jest.fn() };
      blog.update.mockResolvedValue(blog);
      Blog.findByPk.mockResolvedValue(blog);

      const response = await request(app)
        .put('/blogs/1')
        .send({ title: 'Updated Blog', lang: 'ar' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Blog entry updated successfully');
      expect(client.del).toHaveBeenCalledWith('Blog:1:lang:en');
    });

    it('should return 404 if blog not found', async () => {
      Blog.findByPk.mockResolvedValue(null);

      const response = await request(app).put('/blogs/1').send({ title: 'Updated Blog' });

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('Blog entry not found');
    });
  });

  describe('deleteBlog', () => {
    it('should delete a blog successfully', async () => {
      const blog = { id: 1, destroy: jest.fn() };
      Blog.findByPk.mockResolvedValue(blog);

      const response = await request(app).delete('/blogs/1/en');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Blog entry deleted successfully');
      expect(client.del).toHaveBeenCalledWith('Blog:1:lang:en');
    });

    it('should return 404 if blog not found', async () => {
      Blog.findByPk.mockResolvedValue(null);

      const response = await request(app).delete('/blogs/1/en');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('Blog entry not found');
    });
  });
});
