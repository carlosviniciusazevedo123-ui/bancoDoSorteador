import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from '../src/Database/index.js';
import Matches from '../src/App/Models/Matches.js';
import Games from '../src/App/Models/MatchGames.js';
import Events from '../src/App/Models/MatchEvents.js';
import Pauses from '../src/App/Models/MatchPauses.js';
import Roster from '../src/App/Models/MatchPlayers.js';
import Teams from '../src/App/Models/MatchTeams.js';
import Finish from '../src/App/Services/MatchGameFinishService.js';
import FinishMatch from '../src/App/Services/MatchFinishService.js';
import Time from '../src/App/Services/MatchGameTimeService.js';
import PauseController from '../src/App/Controllers/MatchPausesController.js';
import FinishController from '../src/App/Controllers/MatchGameFinishController.js';
import EventController from '../src/App/Controllers/MatchEventsController.js';

const id = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });
let tx, game;
beforeEach(() => {
    tx = { LOCK: { UPDATE: 'UPDATE' }, commit: vi.fn(), rollback: vi.fn() };
    game = { id, match_id: id, team_a_id: id, team_b_id: otherId, status: 'in_progress', duration: 1, started_at: new Date(), update: vi.fn() };
    Database.connection.transaction.mockResolvedValue(tx);
    vi.spyOn(Matches, 'findOne').mockResolvedValue({ id, status: 'in_progress' });
    vi.spyOn(Games, 'findOne').mockResolvedValue(game);
});
afterEach(() => { delete Pauses.sequelize; delete Events.sequelize; });

describe('Manual result follows the persisted score', () => {
    beforeEach(() => {
        vi.spyOn(Events, 'findAll').mockResolvedValue([]);
        vi.spyOn(Games, 'count').mockResolvedValue(1);
        vi.spyOn(FinishMatch, 'finish').mockResolvedValue(true);
    });
    it.each([
        [[['goal', id]], id],
        [[['goal', otherId]], otherId],
        [[['own_goal', id]], otherId],
        [[['own_goal', otherId]], id],
        [[['goal', id], ['goal', otherId]], null],
        [[], null],
    ])('derives winner for %j', async (events, winner) => {
        Events.findAll.mockResolvedValue(events.map(([event_type, team_id]) => ({ event_type, team_id })));
        await Finish.finish({ matchId: id, gameId: id, userId: 'owner' });
        expect(game.update).toHaveBeenCalledWith(expect.objectContaining({ winner_team_id: winner }), { transaction: tx });
        expect(Events.findAll).toHaveBeenCalledWith({ where: { match_id: id, game_id: id }, transaction: tx });
        expect(tx.commit).toHaveBeenCalledOnce();
    });
    it('rejects an explicitly selected winner that contradicts the score', async () => {
        Events.findAll.mockResolvedValue([{ event_type: 'goal', team_id: id }]);
        await expect(Finish.finish({ matchId: id, gameId: id, userId: 'owner', winnerTeamId: otherId })).rejects.toThrow(/recorded score/);
        expect(game.update).not.toHaveBeenCalled();
        expect(tx.rollback).toHaveBeenCalledOnce();
        expect(tx.commit).not.toHaveBeenCalled();
    });
    it('accepts finishing a draw through the controller without selecting a winner', async () => {
        const res = response();
        await FinishController.update({ params: { match_id: id, game_id: id }, userId: 'owner', body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(game.update).toHaveBeenCalledWith(expect.objectContaining({ winner_team_id: null }), { transaction: tx });
    });
});

describe('Pause respects game duration', () => {
    it.each([[59, 201], [60, 400], [120, 400]])('at %i seconds returns %i', async (elapsed, status) => {
        Object.defineProperty(Pauses, 'sequelize', { configurable: true, value: { transaction: vi.fn().mockResolvedValue(tx) } });
        vi.spyOn(Time, 'getElapsedSeconds').mockResolvedValue(elapsed);
        vi.spyOn(Pauses, 'findOne').mockResolvedValue(null);
        vi.spyOn(Pauses, 'create').mockResolvedValue({});
        const res = response();
        await PauseController.pause({ params: { match_id: id, game_id: id }, userId: 'owner' }, res);
        expect(res.status).toHaveBeenCalledWith(status);
        if (status === 400) {
            expect(Pauses.create).not.toHaveBeenCalled();
            expect(game.update).not.toHaveBeenCalled();
            expect(tx.rollback).toHaveBeenCalledOnce();
        } else expect(tx.commit).toHaveBeenCalledOnce();
        expect(Games.findOne).toHaveBeenCalledWith(expect.objectContaining({ lock: 'UPDATE', transaction: tx }));
    });
});

describe('Only active players can score or assist', () => {
    it.each(['goal', 'own_goal', 'assist', 'yellow_card'])('handles a reserve %s', async event_type => {
        Object.defineProperty(Events, 'sequelize', { configurable: true, value: { transaction: vi.fn().mockResolvedValue(tx) } });
        vi.spyOn(Time, 'getElapsedSeconds').mockResolvedValue(10);
        vi.spyOn(Teams, 'findOne').mockResolvedValue({ id });
        vi.spyOn(Roster, 'findOne').mockResolvedValue({ is_reserve: true });
        vi.spyOn(Events, 'findOne').mockResolvedValue(null);
        vi.spyOn(Events, 'create').mockResolvedValue({});
        const res = response();
        await EventController.store({ params: { match_id: id, game_id: id }, userId: 'owner', body: { team_id: id, player_id: id, event_type } }, res);
        const allowed = event_type === 'yellow_card';
        expect(res.status).toHaveBeenCalledWith(allowed ? 201 : 400);
        if (!allowed) {
            expect(Events.create).not.toHaveBeenCalled();
            expect(tx.rollback).toHaveBeenCalledOnce();
        } else expect(Events.create).toHaveBeenCalledOnce();
    });
});
