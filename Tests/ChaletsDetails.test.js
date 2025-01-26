const { createChaletDetail } = require('../Controllers/ChaletDetailsController');
const ChaletsDetails = require('../Models/ChaletsDetails');
const Chalet = require('../Models/ChaletsModel');
const { client } = require('../Utils/redisClient');
const { ErrorResponse } = require('../Utils/validateInput');

jest.mock('../Models/ChaletsDetails');
jest.mock('../Models/ChaletsModel');
jest.mock('../Utils/redisClient');

describe('createChaletDetail', () => {
  it('should return 400 if required fields are missing', async () => {
    const req = { body: { Detail_Type: 'type', lang: 'en' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createChaletDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      ErrorResponse('Validation failed', [
        'Detail_Type, lang, and chalet_id are required',
      ])
    );
  });

  it('should return 400 if language is invalid', async () => {
    const req = { body: { Detail_Type: 'type', lang: 'fr', chalet_id: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createChaletDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid language. Supported languages are "ar" and "en".',
    });
  });

  it('should return 404 if chalet not found', async () => {
    Chalet.findByPk.mockResolvedValue(null);
    const req = { body: { Detail_Type: 'type', lang: 'en', chalet_id: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createChaletDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(ErrorResponse('Chalet not found'));
  });

  it('should return 201 and create chalet detail if successful', async () => {
    Chalet.findByPk.mockResolvedValue({ id: 1 });
    ChaletsDetails.create.mockResolvedValue({ id: 1, Detail_Type: 'type', lang: 'en', chalet_id: 1 });
    client.del.mockResolvedValue();
    client.set.mockResolvedValue();

    const req = { body: { Detail_Type: 'type', lang: 'en', chalet_id: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createChaletDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, Detail_Type: 'type', lang: 'en', chalet_id: 1 });
  });
});







describe('getAllDetails', () => {
  it('should return 400 if language is invalid', async () => {
    const req = { query: {}, params: { lang: 'fr' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await getAllDetails(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(ErrorResponse('Language must be either "ar" or "en"'));
  });

  it('should return cached data if available', async () => {
    const req = { query: {}, params: { lang: 'en' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    client.get.mockResolvedValue(JSON.stringify([{ id: 1, Detail_Type: 'type', lang: 'en' }]));

    await getAllDetails(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: 1, Detail_Type: 'type', lang: 'en' }]);
  });

  it('should return 404 if no details are found', async () => {
    const req = { query: {}, params: { lang: 'en' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    ChaletsDetails.findAll.mockResolvedValue([]);

    await getAllDetails(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(ErrorResponse('No details found for this language'));
  });

  it('should return 200 and fetch chalet details if not cached', async () => {
    const req = { query: {}, params: { lang: 'en' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    client.get.mockResolvedValue(null);
    ChaletsDetails.findAll.mockResolvedValue([{ id: 1, Detail_Type: 'type', lang: 'en' }]);
    client.setEx.mockResolvedValue();

    await getAllDetails(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: 1, Detail_Type: 'type', lang: 'en' }]);
  });
});





describe('getChaletDetailsByChaletId', () => {
  it('should return 404 if chalet not found', async () => {
    const req = { params: { chalet_id: 1, lang: 'en' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    Chalet.findByPk.mockResolvedValue(null);

    await getChaletDetailsByChaletId(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(ErrorResponse('Chalet not found'));
  });

  it('should return cached data if available', async () => {
    const req = { params: { chalet_id: 1, lang: 'en' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    client.get.mockResolvedValue(JSON.stringify([{ id: 1, Detail_Type: 'type', lang: 'en' }]));

    await getChaletDetailsByChaletId(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: 1, Detail_Type: 'type', lang: 'en' }]);
  });

  it('should return 404 if no details found for the chalet', async () => {
    const req = { params: { chalet_id: 1, lang: 'en' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    client.get.mockResolvedValue(null);
    Chalet.findByPk.mockResolvedValue({ id: 1 });
    ChaletsDetails.findAll.mockResolvedValue([]);

    await getChaletDetailsByChaletId(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(ErrorResponse('No details found for this chalet with the given id'));
  });

  it('should return 200 and fetch chalet details if not cached', async () => {
    const req = { params: { chalet_id: 1, lang: 'en' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    client.get.mockResolvedValue(null);
    Chalet.findByPk.mockResolvedValue({ id: 1 });
    ChaletsDetails.findAll.mockResolvedValue([{ id: 1, Detail_Type: 'type', lang: 'en' }]);
    client.setEx.mockResolvedValue();

    await getChaletDetailsByChaletId(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: 1, Detail_Type: 'type', lang: 'en' }]);
  });
});





describe('deleteChaletDetail', () => {
  it('should return 404 if chalet detail not found', async () => {
    const req = { params: { id: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    ChaletsDetails.findByPk.mockResolvedValue(null);

    await deleteChaletDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(ErrorResponse('Chalet detail not found', ['No Chalet detail found with the given ID.']));
  });

  it('should return 200 if chalet detail is successfully deleted', async () => {
    const req = { params: { id: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const mockChaletDetail = { id: 1, chalet_id: 1, lang: 'en' };
    ChaletsDetails.findByPk.mockResolvedValue(mockChaletDetail);
    ChaletsDetails.prototype.destroy.mockResolvedValue();
    client.del.mockResolvedValue();
    ChaletsDetails.findAll.mockResolvedValue([{ id: 1, Detail_Type: 'type', lang: 'en' }]);
    client.setEx.mockResolvedValue();

    await deleteChaletDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Chalet detail deleted successfully' });
  });
});






describe('updateChaletDetail', () => {
  it('should return 404 if chalet detail not found', async () => {
    const req = { params: { id: 1 }, body: { Detail_Type: 'type', lang: 'en', chalet_id: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    ChaletsDetails.findByPk.mockResolvedValue(null);

    await updateChaletDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(ErrorResponse('Chalet detail not found'));
  });

  it('should return 400 if validation fails', async () => {
    const req = { params: { id: 1 }, body: { Detail_Type: 'type', lang: 'fr' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateChaletDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      ErrorResponse('Validation failed', expect.any(Array))
    );
  });

  it('should return 200 if chalet detail is successfully updated', async () => {
    const req = { params: { id: 1 }, body: { Detail_Type: 'type', lang: 'en', chalet_id: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    ChaletsDetails.findByPk.mockResolvedValue({ id: 1, Detail_Type: 'oldType', lang: 'ar', chalet_id: 1 });
    Chalet.findByPk.mockResolvedValue({ id: 1 });
    ChaletsDetails.prototype.update.mockResolvedValue([1]);
    const updatedChaletDetail = { id: 1, Detail_Type: 'type', lang: 'en', chalet_id: 1 };
    client.setEx.mockResolvedValue();

    await updateChaletDetail(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updatedChaletDetail);
  });
});
