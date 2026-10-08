import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import auth from '../src/Config/auth.js';
import Player from '../src/App/Models/Player.js';

const id = '11111111-1111-4111-8111-111111111111';
const authorization = `Bearer ${jwt.sign({ id: 'owner' }, auth.secret)}`;

describe('Player name validation', () => {
    for (const method of ['post', 'put']) {
        it.each([123, null, {}, '   '])(`${method} rejects invalid name %j before querying the database`, async name => {
            vi.spyOn(Player, 'findOne');
            vi.spyOn(Player, 'create');
            const path = method === 'post' ? '/players' : `/players/${id}`;
            const res = await request(app)[method](path).set('Authorization', authorization)
                .send({ name, is_goalkeeper: false, overall_rating: 7 });
            expect(res.status).toBe(400);
            expect(Player.findOne).not.toHaveBeenCalled();
            expect(Player.create).not.toHaveBeenCalled();
        });
    }

    it('creates a player using a trimmed valid name', async () => {
        vi.spyOn(Player, 'findOne').mockResolvedValue(null);
        vi.spyOn(Player, 'create').mockImplementation(async data => ({ id, ...data }));
        const res = await request(app).post('/players').set('Authorization', authorization)
            .send({ name: '  Maria  ', is_goalkeeper: false, overall_rating: 7 });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Maria');
        expect(Player.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Maria' }));
    });

    it('updates a player using a trimmed valid name', async () => {
        const player = { id, update: vi.fn() };
        vi.spyOn(Player, 'findOne').mockResolvedValueOnce(player).mockResolvedValueOnce(null);
        const res = await request(app).put(`/players/${id}`).set('Authorization', authorization)
            .send({ name: '  Maria  ' });
        expect(res.status).toBe(200);
        expect(player.update).toHaveBeenCalledWith({ name: 'Maria' });
    });

    it('still returns 500 for an unexpected internal SyntaxError', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(Player, 'findAll').mockRejectedValue(new SyntaxError('internal details'));
        const res = await request(app).get('/players').set('Authorization', authorization);
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Internal server error' });
    });
});
