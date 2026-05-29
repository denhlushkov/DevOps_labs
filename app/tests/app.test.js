const request = require('supertest');

jest.mock('pg', () => {
  const mPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  };
  return { Pool: jest.fn(() => mPool) };
});

const app = require('../app');

describe('API Endpoints Testing', () => {
  it('GET /health/alive має повертати 200 OK', async () => {
    const res = await request(app).get('/health/alive');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toBe('OK');
  });

  it('GET / має повертати 200 і HTML сторінку', async () => {
    const res = await request(app).get('/').set('Accept', 'text/html');
    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('GET / має повертати 406 для непідтримуваних заголовків', async () => {
    const res = await request(app).get('/').set('Accept', 'application/json');
    expect(res.statusCode).toEqual(406);
  });

  it('GET /tasks має повертати 200 і порожній масив JSON (замокано)', async () => {
    const res = await request(app).get('/tasks').set('Accept', 'application/json');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([]);
  });
});