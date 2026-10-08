import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import auth from '../src/Config/auth.js';
describe('HTTP authentication', () => {
    it.each([undefined, 'Basic abc', 'Bearer', 'Bearer invalid',
        `Bearer ${jwt.sign({ id: 'owner' }, auth.secret, { expiresIn: -1 })}`,
        `Bearer ${jwt.sign({ other: 'owner' }, auth.secret)}`,
        `Bearer ${jwt.sign({ id: 'owner' }, 'wrong-secret')}`,
    ])('rejects invalid credentials (%s)', async header => {
        const call = request(app).get('/players');
        if (header) call.set('Authorization', header);
        expect((await call).status).toBe(401);
    });
    it('returns 404 for an authenticated unknown route', async () => {
        const response = await request(app).get('/unknown')
            .set('Authorization', `Bearer ${jwt.sign({ id: 'owner' }, auth.secret)}`);
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Route not found' });
    });
});
