import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import auth from '../src/Config/auth.js';
import Matches from '../src/App/Models/Matches.js';
import Games from '../src/App/Models/MatchGames.js';
import Events from '../src/App/Models/MatchEvents.js';

const matchId = '11111111-1111-4111-8111-111111111111';
const gameId = '22222222-2222-4222-8222-222222222222';
const authorization = 'Bearer ' + jwt.sign({ id: 'owner' }, auth.secret);
const getEvents = (match = matchId, game = gameId) => request(app)
    .get('/matches/' + match + '/games/' + game + '/events')
    .set('Authorization', authorization);

describe('Persisted game events', () => {
    it('requires authentication', async () => {
        const events = vi.spyOn(Events, 'findAll');
        const result = await request(app).get('/matches/' + matchId + '/games/' + gameId + '/events');
        expect(result.status).toBe(401);
        expect(events).not.toHaveBeenCalled();
    });

    it('rejects invalid identifiers before querying the database', async () => {
        const matches = vi.spyOn(Matches, 'findOne');
        expect((await getEvents('invalid')).status).toBe(400);
        expect((await getEvents(matchId, 'invalid')).status).toBe(400);
        expect(matches).not.toHaveBeenCalled();
    });

    it('does not expose another owner match', async () => {
        vi.spyOn(Matches, 'findOne').mockResolvedValue(null);
        const events = vi.spyOn(Events, 'findAll');
        expect((await getEvents()).status).toBe(404);
        expect(Matches.findOne).toHaveBeenCalledWith({ where: { id: matchId, user_id: 'owner' } });
        expect(events).not.toHaveBeenCalled();
    });

    it('rejects a game that does not belong to the match', async () => {
        vi.spyOn(Matches, 'findOne').mockResolvedValue({ id: matchId });
        vi.spyOn(Games, 'findOne').mockResolvedValue(null);
        const events = vi.spyOn(Events, 'findAll');
        expect((await getEvents()).status).toBe(404);
        expect(Games.findOne).toHaveBeenCalledWith({ where: { id: gameId, match_id: matchId } });
        expect(events).not.toHaveBeenCalled();
    });

    it.each(['in_progress', 'finished'])('recovers persisted events of a %s game', async status => {
        vi.spyOn(Matches, 'findOne').mockResolvedValue({ id: matchId });
        vi.spyOn(Games, 'findOne').mockResolvedValue({ id: gameId, status });
        const persisted = [
            { id: 'goal', team_id: 'a', event_type: 'goal', player_id: 'player', minute: 1 },
            { id: 'own-goal', team_id: 'b', event_type: 'own_goal', player_id: 'other', minute: 2 },
        ];
        vi.spyOn(Events, 'findAll').mockResolvedValue(persisted);
        const result = await getEvents();
        expect(result.status).toBe(200);
        expect(result.body).toEqual(persisted);
        expect(Events.findAll).toHaveBeenCalledWith({
            where: { match_id: matchId, game_id: gameId },
            order: [['createdAt', 'ASC'], ['id', 'ASC']],
        });
    });

    it('returns an empty list for a game without events', async () => {
        vi.spyOn(Matches, 'findOne').mockResolvedValue({ id: matchId });
        vi.spyOn(Games, 'findOne').mockResolvedValue({ id: gameId });
        vi.spyOn(Events, 'findAll').mockResolvedValue([]);
        const result = await getEvents();
        expect(result.status).toBe(200);
        expect(result.body).toEqual([]);
    });
});
