import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import app from '../src/app.js';
import auth from '../src/Config/auth.js';
import User from '../src/App/Models/User.js';
import Player from '../src/App/Models/Player.js';
import Draw from '../src/App/Models/Draw.js';
import Session from '../src/App/Models/MatchEvaluatorSessions.js';
import MatchPlayers from '../src/App/Models/MatchPlayers.js';
import Evaluations from '../src/App/Models/PlayerEvaluations.js';
import Evaluator from '../src/App/Models/MatchEvaluator.js';
import Database from '../src/Database/index.js';

const id = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const authorization = `Bearer ${jwt.sign({ id: 'owner' }, auth.secret)}`;
describe('HTTP login and ownership', () => {
    it('logs in with a valid password and returns a verifiable JWT without the hash', async () => {
        vi.spyOn(User, 'findOne').mockResolvedValue({ id, name: 'User', email: 'user@example.com', password_hash: await bcrypt.hash('password123', 4) });
        const res = await request(app).post('/sessions').send({ email: 'user@example.com', password: 'password123' });
        expect(res.status).toBe(200);
        expect(jwt.verify(res.body.token, auth.secret).id).toBe(id);
        expect(res.body).not.toHaveProperty('password_hash');
    });
    it('rejects an incorrect password', async () => {
        vi.spyOn(User, 'findOne').mockResolvedValue({ password_hash: await bcrypt.hash('correct-password', 4) });
        expect((await request(app).post('/sessions').send({ email: 'user@example.com', password: 'wrong' })).status).toBe(400);
    });
    it('scopes player reads to the authenticated owner', async () => {
        vi.spyOn(Player, 'findAll').mockResolvedValue([]);
        expect((await request(app).get('/players').set('Authorization', authorization)).status).toBe(200);
        expect(Player.findAll).toHaveBeenCalledWith({ where: { user_id: 'owner' }, order: [['name', 'ASC']] });
    });
    it('blocks drawing another user roster', async () => {
        vi.spyOn(Draw, 'findByPk').mockResolvedValue({ id, user_id: 'someone-else' });
        expect((await request(app).post(`/draws/${id}/draw`).set('Authorization', authorization).send({ playerIds: [otherId] })).status).toBe(403);
    });
    it('rejects a numeric player name with 400', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await request(app).post('/players').set('Authorization', authorization).send({ name: 123, is_goalkeeper: false, overall_rating: 7 });
        expect(res.status).toBe(400);
    });
    it('rejects malformed JSON with 400', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await request(app).post('/sessions').set('Content-Type', 'application/json').send('{');
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'Malformed JSON body' });
    });
});

describe('Evaluation permissions', () => {
    let session, transaction;
    beforeEach(() => {
        transaction = { LOCK: { UPDATE: 'UPDATE' } };
        Database.connection.transaction.mockImplementation(async callback => callback(transaction));
        session = { match_evaluator_id: 'evaluator', player_id: id, expires_at: new Date(Date.now() + 600000), matchEvaluator: { match_id: 'match', used_at: null, expires_at: new Date(Date.now() + 600000) } };
        vi.spyOn(Session, 'findOne').mockImplementation(async () => session);
        vi.spyOn(Evaluator, 'findByPk').mockImplementation(async () => session.matchEvaluator);
        vi.spyOn(MatchPlayers, 'findOne').mockImplementation(async ({ where }) => ({ player_id: where.player_id, team_id: 'a' }));
        vi.spyOn(Evaluations, 'findOne').mockResolvedValue(null);
        vi.spyOn(Player, 'findOne').mockResolvedValue({ id: otherId });
        vi.spyOn(Evaluations, 'create').mockImplementation(async data => data);
    });
    const submit = (body = {}) => request(app).post('/evaluations/session').send({ evaluated_player_id: otherId, attack: 8, ...body });
    it('accepts a teammate evaluation', async () => {
        expect((await submit()).status).toBe(201);
        expect(Evaluations.create).toHaveBeenCalledWith(expect.objectContaining({ evaluator_id: id, evaluated_player_id: otherId, match_id: 'match' }), { transaction });
        expect(Evaluator.findByPk).toHaveBeenCalledWith('evaluator', { transaction, lock: transaction.LOCK.UPDATE });
    });
    it('rejects an expired session', async () => {
        session.expires_at = new Date(0);
        expect((await submit()).status).toBe(410);
        expect(Evaluations.create).not.toHaveBeenCalled();
    });
    it('rejects self evaluation', async () => {
        expect((await submit({ evaluated_player_id: id })).status).toBe(400);
        expect(Evaluations.create).not.toHaveBeenCalled();
    });
    it('rejects an opposing team player', async () => {
        MatchPlayers.findOne.mockResolvedValueOnce({ team_id: 'a' }).mockResolvedValueOnce({ team_id: 'b' });
        expect((await submit()).status).toBe(400);
        expect(Evaluations.create).not.toHaveBeenCalled();
    });
    it('rejects duplicate evaluations', async () => {
        Evaluations.findOne.mockResolvedValue({ id: 'existing' });
        expect((await submit()).status).toBe(400);
        expect(Evaluations.create).not.toHaveBeenCalled();
    });
    it.each([-1, 11, '8'])('rejects invalid score %s', async attack => {
        expect((await submit({ attack })).status).toBe(400);
        expect(Evaluations.create).not.toHaveBeenCalled();
    });
    it('rejects a finalized evaluation period', async () => {
        session.matchEvaluator.used_at = new Date();
        expect((await submit()).status).toBe(410);
        expect(Evaluations.create).not.toHaveBeenCalled();
    });
    it('rejects an expired parent period even when the session remains valid', async () => {
        session.matchEvaluator.expires_at = new Date(0);
        expect((await submit()).status).toBe(410);
        expect(Evaluations.create).not.toHaveBeenCalled();
    });
    it('rejects a missing parent period', async () => {
        session.matchEvaluator = null;
        expect((await submit()).status).toBe(404);
        expect(Evaluations.create).not.toHaveBeenCalled();
    });
    it('does not send success when transaction commit fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        Database.connection.transaction.mockImplementation(async callback => {
            await callback(transaction);
            throw new Error('commit failed');
        });
        expect((await submit()).status).toBe(500);
    });
});

