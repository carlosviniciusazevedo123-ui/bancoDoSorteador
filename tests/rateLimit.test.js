import { beforeEach, describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
describe('Rate limits', () => {
    beforeEach(() => vi.resetModules());
    it.each([['loginRateLimit', 10], ['registerRateLimit', 5], ['evaluationRateLimit', 20]])('%s blocks above %i and permits another client', async (name, limit) => {
        const middleware = (await import('../src/Middlewares/rateLimit.js'))[name];
        const app = express();
        app.set('trust proxy', 1);
        app.post('/', middleware, (req, res) => res.sendStatus(204));
        for (let i = 0; i < limit; i++) {
            expect((await request(app).post('/').set('X-Forwarded-For', '192.0.2.1')).status).toBe(204);
        }
        const blocked = await request(app).post('/').set('X-Forwarded-For', '192.0.2.1');
        expect(blocked.status).toBe(429);
        expect(blocked.body.error).toMatch(/Too many/);
        expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
        expect((await request(app).post('/').set('X-Forwarded-For', '192.0.2.2')).status).toBe(204);
    });
});
