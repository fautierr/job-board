import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

describe('createApp', () => {
  it('responde 404 con cuerpo JSON para rutas inexistentes', async () => {
    const response = await request(createApp()).get('/ruta-inexistente');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.any(String),
      },
    });
  });

  it('responde 400 JSON ante un cuerpo inválido', async () => {
    const response = await request(createApp())
      .post('/cualquiera')
      .set('Content-Type', 'application/json')
      .send('{ invalid');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });
});
