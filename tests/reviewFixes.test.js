import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from '../src/Database/index.js';
import Events from '../src/App/Models/MatchEvents.js';
import Players from '../src/App/Models/Player.js';
import Games from '../src/App/Models/MatchGames.js';
import Matches from '../src/App/Models/Matches.js';
import MatchPlayers from '../src/App/Models/MatchPlayers.js';
import Evaluator from '../src/App/Models/MatchEvaluator.js';
import Sessions from '../src/App/Models/MatchEvaluatorSessions.js';
import Evaluations from '../src/App/Models/PlayerEvaluations.js';
import Draw from '../src/App/Models/Draw.js';
import DrawTeams from '../src/App/Models/DrawTeam.js';
import DrawPlayers from '../src/App/Models/DrawPlayer.js';
import Rating from '../src/App/Services/MatchEvaluationService.js';
import Expiration from '../src/App/Services/MatchGameExpirationService.js';
import EvaluationExpiration from '../src/App/Services/EvaluationExpirationService.js';
import Finish from '../src/App/Services/MatchFinishService.js';
import Time from '../src/App/Services/MatchGameTimeService.js';
import Create from '../src/App/Services/MatchCreateService.js';
import Identify from '../src/App/Controllers/MatchEvaluatorController.js';
import EventController from '../src/App/Controllers/MatchEventsController.js';
import { evaluationRateLimit, evaluationSubmissionRateLimit } from '../src/Middlewares/rateLimit.js';

let transaction;
beforeEach(() => {
    transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: vi.fn(), rollback: vi.fn() };
    Database.connection.transaction.mockResolvedValue(transaction);
});
function response() { return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }; }

describe('Shared rating locks', () => {
    it('serializes concurrent match bonuses without losing points', async () => {
        vi.spyOn(Events, 'findAll').mockResolvedValue([{ player_id: 'p', event_type: 'goal' }]);
        let stored = 5;
        let tail = Promise.resolve();
        vi.spyOn(Players, 'findByPk').mockImplementation(async (id, options) => {
            expect(options.lock).toBe('UPDATE');
            const previous = tail;
            tail = new Promise(resolve => { options.transaction.commit = resolve; });
            await previous;
            const snapshot = stored;
            return { overall_rating: snapshot, update: async data => { stored = data.overall_rating; } };
        });
        const run = async () => {
            const tx = { LOCK: { UPDATE: 'UPDATE' } };
            await Rating.evaluate({ id: 'match' }, tx);
            tx.commit();
        };
        await Promise.all([run(), run()]);
        expect(stored).toBeCloseTo(5.2);
    });
    it('locks players in deterministic order while retaining event order and caps', async () => {
        vi.spyOn(Events, 'findAll').mockResolvedValue([
            { player_id: 'z', event_type: 'goal' },
            { player_id: 'a', event_type: 'goal' },
            { player_id: 'z', event_type: 'own_goal' },
        ]);
        const player = { overall_rating: 10 };
        player.update = vi.fn(async data => Object.assign(player, data));
        vi.spyOn(Players, 'findByPk').mockResolvedValue(player);
        await Rating.evaluate({ id: 'm' }, transaction);
        expect(Players.findByPk.mock.calls.map(([id]) => id)).toEqual(['a', 'z']);
        expect(player.overall_rating).toBe(9.5);
    });
    it('also locks peer evaluation rating updates', async () => {
        vi.spyOn(Evaluator, 'findByPk').mockResolvedValue({ match_id: 'm', used_at: null, expires_at: new Date(0), update: vi.fn() });
        vi.spyOn(Matches, 'findByPk').mockResolvedValue({ id: 'm' });
        vi.spyOn(MatchPlayers, 'findAll').mockResolvedValue(['z', 'a'].map(player_id => ({ player_id, team_id: 't' })));
        vi.spyOn(Evaluations, 'findAll').mockResolvedValue([]);
        vi.spyOn(Players, 'findByPk').mockResolvedValue({ overall_rating: 5, update: vi.fn() });
        await EvaluationExpiration.processEvaluator('e');
        expect(Players.findByPk.mock.calls.map(([id]) => id)).toEqual(['a', 'z']);
        for (const [, options] of Players.findByPk.mock.calls) expect(options.lock).toBe('UPDATE');
    });
});

describe('Resume evaluations', () => {
    it.each([['b'], ['b', 'c']])('returns only pending teammates after %j', async (...ids) => {
        const submittedIds = ids.flat();
        vi.spyOn(Evaluator, 'findOne').mockResolvedValue({ id: 'e', match_id: 'm', used_at: null, expires_at: new Date(Date.now() + 60000) });
        vi.spyOn(Matches, 'findByPk').mockResolvedValue({ id: 'm', user_id: 'owner' });
        vi.spyOn(Players, 'findOne').mockResolvedValue({ id: 'a', name: 'Ana' });
        vi.spyOn(MatchPlayers, 'findOne').mockResolvedValue({ team_id: 't' });
        vi.spyOn(Sessions, 'findOne').mockResolvedValue({ token: 'session', expires_at: new Date(Date.now() + 60000) });
        vi.spyOn(MatchPlayers, 'findAll').mockResolvedValue(['a', 'b', 'c'].map(id => ({ player_id: id, player: { id, name: id } })));
        vi.spyOn(Evaluations, 'findAll').mockResolvedValue(submittedIds.map(evaluated_player_id => ({ evaluated_player_id })));
        const res = response();
        await Identify.identifyPlayer({ params: { token: 'link' }, body: { name: 'Ana' } }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json.mock.calls[0][0].players.map(p => p.id)).toEqual(['b', 'c'].filter(id => !submittedIds.includes(id)));
        expect(Evaluations.findAll).toHaveBeenCalledWith({ where: { match_id: 'm', evaluator_id: 'a' }, attributes: ['evaluated_player_id'] });
    });
});

describe('Shared evaluation network', () => {
    it('permits team traffic and isolates submission budgets by session', async () => {
        const app = express();
        app.get('/link', evaluationRateLimit, (req, res) => res.sendStatus(204));
        app.post('/:session_token', evaluationSubmissionRateLimit, (req, res) => res.sendStatus(204));
        for (let i = 0; i < 30; i++) expect((await request(app).get('/link')).status).toBe(204);
        for (let i = 0; i < 100; i++) expect((await request(app).post('/one')).status).toBe(204);
        expect((await request(app).post('/one')).status).toBe(429);
        expect((await request(app).post('/two')).status).toBe(204);
    });
});

describe('Automatic final score', () => {
    it.each([
        [[['goal', 'a']], 'a'],
        [[['goal', 'b']], 'b'],
        [[['own_goal', 'a']], 'b'],
        [[['goal', 'a'], ['goal', 'b']], null],
        [[], null],
    ])('saves winner for %j', async (events, winner) => {
        const game = { id: 'g', match_id: 'm', status: 'in_progress', team_a_id: 'a', team_b_id: 'b', update: vi.fn() };
        vi.spyOn(Games, 'findByPk').mockResolvedValue(game);
        vi.spyOn(Matches, 'findByPk').mockResolvedValue({ id: 'm', status: 'in_progress' });
        vi.spyOn(Time, 'isFinished').mockResolvedValue(true);
        vi.spyOn(Events, 'findAll').mockResolvedValue(events.map(([event_type, team_id]) => ({ event_type, team_id })));
        vi.spyOn(Games, 'count').mockResolvedValue(1);
        vi.spyOn(Finish, 'finish').mockResolvedValue(true);
        await Expiration.processGame('g');
        expect(game.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'finished', winner_team_id: winner }), { transaction });
        expect(transaction.commit).toHaveBeenCalledOnce();
    });
});

describe('Incomplete draw', () => {
    it.each(['starter', 'reserve', 'goalkeeper', 'deleted', 'duplicate'])('rejects %s before creating match', async defect => {
        vi.spyOn(Draw, 'findOne').mockResolvedValue({ id: 'd', players_per_team: 1, has_reserve: true, reserve_per_team: 1, consider_goalkeepers: true });
        vi.spyOn(DrawTeams, 'findAll').mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
        let roster = ['a', 'b'].flatMap(team_id => [
            { team_id, player_id: team_id + 'p', player: {}, is_reserve: false, is_goalkeeper: false },
            { team_id, player_id: team_id + 'r', player: {}, is_reserve: true, is_goalkeeper: false },
            { team_id, player_id: team_id + 'g', player: {}, is_reserve: false, is_goalkeeper: true },
        ]);
        if (defect === 'deleted') roster[0].player = null;
        else if (defect === 'duplicate') roster[3].player_id = roster[0].player_id;
        else roster = roster.filter(row => row.player_id !== 'a' + ({ starter: 'p', reserve: 'r', goalkeeper: 'g' })[defect]);
        vi.spyOn(DrawPlayers, 'findAll').mockResolvedValue(roster);
        vi.spyOn(Matches, 'create').mockResolvedValue({});
        await expect(Create.create({ userId: 'u', drawId: 'd', drawTeamAId: 'a', drawTeamBId: 'b' })).rejects.toThrow(/roster/);
        expect(Matches.create).not.toHaveBeenCalled();
        expect(transaction.rollback).toHaveBeenCalledOnce();
    });
});

describe('Expired game events', () => {
    it.each(['goal', 'substitution'])('rejects %s before changing players', async event_type => {
        const id = '11111111-1111-4111-8111-111111111111';
        Events.sequelize = { transaction: vi.fn().mockResolvedValue(transaction) };
        vi.spyOn(Matches, 'findOne').mockResolvedValue({ id, status: 'in_progress' });
        vi.spyOn(Games, 'findOne').mockResolvedValue({ id, duration: 1, status: 'in_progress' });
        vi.spyOn(Time, 'getElapsedSeconds').mockResolvedValue(60);
        vi.spyOn(MatchPlayers, 'findOne').mockResolvedValue({ update: vi.fn() });
        vi.spyOn(Events, 'create').mockResolvedValue({});
        const res = response();
        await EventController.store({ userId: 'u', params: { match_id: id, game_id: id }, body: { team_id: id, event_type, player_id: id, player_out_id: id, player_in_id: id } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'The game time has expired.' });
        expect(MatchPlayers.findOne).not.toHaveBeenCalled();
        expect(Events.create).not.toHaveBeenCalled();
        expect(transaction.rollback).toHaveBeenCalledOnce();
    });
});
