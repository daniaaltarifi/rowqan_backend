const request = require('supertest');
const app = require('../server');
const { Client } = require('../Config/PayPalClient');
jest.mock('@paypal/checkout-server-sdk', () => ({
  orders: {
    OrdersCreateRequest: jest.fn().mockImplementation(() => ({
      prefer: jest.fn(),
      requestBody: jest.fn(),
    })),
  },
}));

describe('POST /createPayPalPayment', () => {
  it('should return 400 if amount is invalid', async () => {
    const response = await request(app)
      .post('/createPayPalPayment')
      .send({ amount: -10, currency: 'USD', reservation_id: 1, name: 'Test User' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid amount provided.');
  });

  it('should return 400 if name is missing', async () => {
    const response = await request(app)
      .post('/createPayPalPayment')
      .send({ amount: 100, currency: 'USD', reservation_id: 1 });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Name is required.');
  });

  it('should return 201 and create PayPal payment successfully', async () => {
    const response = await request(app)
      .post('/createPayPalPayment')
      .send({ amount: 100, currency: 'USD', reservation_id: 1, name: 'Test User' });
    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Payment created and reservation confirmed.');
  });

  it('should return 404 if reservation is not found', async () => {
    const response = await request(app)
      .post('/createPayPalPayment')
      .send({ amount: 100, currency: 'USD', reservation_id: 999, name: 'Test User' });
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Reservation not found.');
  });

  it('should return 400 if reservation is already confirmed', async () => {
   
    const response = await request(app)
      .post('/createPayPalPayment')
      .send({ amount: 100, currency: 'USD', reservation_id: 1, name: 'Test User' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Reservation is already confirmed.');
  });
});




describe('POST /capturePayPalPayment', () => {
    it('should return 400 if orderID is missing', async () => {
      const response = await request(app)
        .post('/capturePayPalPayment')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Order ID is required.');
    });
  
    it('should return 200 and capture PayPal payment successfully', async () => {
      const response = await request(app)
        .post('/capturePayPalPayment')
        .send({ orderID: 'order123' });
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('COMPLETED');
    });
  
    it('should return 500 if PayPal error occurs', async () => {
     
      jest.spyOn(Client, 'execute').mockRejectedValueOnce(new Error('PayPal API error'));
      const response = await request(app)
        .post('/capturePayPalPayment')
        .send({ orderID: 'order123' });
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to capture PayPal payment.');
    });
  });

  



  describe('POST /createPayment', () => {
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/createPayment')
        .send({ status: 'Pending', paymentMethod: 'PayPal' });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Reservation, status, paymentMethod, UserName, and Phone_Number are required.');
    });
  
    it('should return 400 if validation errors occur', async () => {
      const response = await request(app)
        .post('/createPayment')
        .send({ user_id: 1, reservation_id: 1, status: 'InvalidStatus', paymentMethod: 'PayPal', UserName: 'Test', Phone_Number: '123456789' });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });
  
    it('should return 404 if reservation is not found', async () => {
      const response = await request(app)
        .post('/createPayment')
        .send({ user_id: 1, reservation_id: 999, status: 'Pending', paymentMethod: 'PayPal', UserName: 'Test User', Phone_Number: '123456789' });
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Reservation not found.');
    });
  
    it('should return 201 and create payment successfully', async () => {
      const response = await request(app)
        .post('/createPayment')
        .send({ user_id: 1, reservation_id: 1, status: 'Pending', paymentMethod: 'PayPal', UserName: 'Test User', Phone_Number: '123456789' });
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Payment created successfully');
    });
  });
  





  describe('GET /getPayments', () => {
    it('should return 400 if userId is missing', async () => {
      const response = await request(app).get('/getPayments');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User ID is required.');
    });
  
    it('should return 200 and fetch payments successfully', async () => {
      const response = await request(app)
        .get('/getPayments')
        .query({ userId: 1, page: 1, limit: 20 });
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  
    it('should return 404 if no payments found for the user', async () => {
      const response = await request(app)
        .get('/getPayments')
        .query({ userId: 999, page: 1, limit: 20 });
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No payments found for the given user ID.');
    });
  });

  





  describe('PUT /updatePayment/:id', () => {
    it('should return 404 if payment not found', async () => {
      const response = await request(app)
        .put('/updatePayment/999')
        .send({ status: 'Completed', paymentMethod: 'PayPal' });
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Payment not found');
    });
  
    it('should return 200 and update payment successfully', async () => {
      const response = await request(app)
        .put('/updatePayment/1')
        .send({ status: 'Completed', paymentMethod: 'PayPal' });
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Payment updated successfully');
    });
  
    it('should return 400 if validation errors occur', async () => {
      const response = await request(app)
        .put('/updatePayment/1')
        .send({ status: '', paymentMethod: '' });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  


  describe('DELETE /deletePayment/:id', () => {
    it('should return 404 if payment not found', async () => {
      const response = await request(app).delete('/deletePayment/999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Payment not found');
    });
  
    it('should return 200 and delete payment successfully', async () => {
      const response = await request(app).delete('/deletePayment/1');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Payment deleted successfully');
    });
  });
  