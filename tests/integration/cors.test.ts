import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

const allowedOrigin = 'http://localhost:5173';
const disallowedOrigin = 'https://otro-origen.example';

describe('CORS', () => {
  it('responde con headers CORS para un origen permitido', async () => {
    const response = await request(createApp())
      .get('/ruta-inexistente')
      .set('Origin', allowedOrigin);

    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['vary']).toBe('Origin');
    expect(response.headers['access-control-allow-methods']).toBe(
      'GET,POST,PATCH,OPTIONS',
    );
    expect(response.headers['access-control-allow-headers']).toBe(
      'Content-Type,Authorization',
    );
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('responde el preflight OPTIONS sin acceder a rutas ni a la base', async () => {
    const response = await request(createApp())
      .options('/api/offers')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,authorization');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-methods']).toBe(
      'GET,POST,PATCH,OPTIONS',
    );
    expect(response.headers['access-control-allow-headers']).toBe(
      'Content-Type,Authorization',
    );
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('no devuelve headers CORS para un origen no configurado', async () => {
    const response = await request(createApp())
      .get('/ruta-inexistente')
      .set('Origin', disallowedOrigin);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['access-control-allow-methods']).toBeUndefined();
  });

  it('no habilita credenciales de cookies', async () => {
    const response = await request(createApp())
      .options('/api/auth/login')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    expect(response.headers['set-cookie']).toBeUndefined();
  });
});
