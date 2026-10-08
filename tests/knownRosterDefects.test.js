import { afterEach, describe, expect, it, vi } from 'vitest';
import Controller from '../src/App/Controllers/MatchPlayersController.js';
import EventsController from '../src/App/Controllers/MatchEventsController.js';
import Matches from '../src/App/Models/Matches.js';
import Players from '../src/App/Models/Player.js';
import Teams from '../src/App/Models/MatchTeams.js';
import Roster from '../src/App/Models/MatchPlayers.js';
import Games from '../src/App/Models/MatchGames.js';
import Events from '../src/App/Models/MatchEvents.js';
import Time from '../src/App/Services/MatchGameTimeService.js';

const id = '11111111-1111-4111-8111-111111111111';
const response = () => { const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res); return res; };
describe('Known roster defects', () => {
    afterEach(() => { delete Events.sequelize; });
    it('includes the mandatory player snapshot in a manual roster insert', async () => {
        vi.spyOn(Matches, 'findByPk').mockResolvedValue({ id, user_id: 'owner', status: 'pending' });
        vi.spyOn(Teams, 'findOne').mockResolvedValue({ id });
        vi.spyOn(Players, 'findOne').mockResolvedValue({ id, name: 'Player', overall_rating: 8 });
        vi.spyOn(Roster, 'findOne').mockResolvedValue(null);
        vi.spyOn(Roster, 'create').mockResolvedValue({});
        const res = response();
        await Controller.store({ userId: 'owner', params: { match_id: id }, body: { team_id: id, player_id: id, number: 2 } }, res);
        expect(Roster.create).toHaveBeenCalledWith(expect.objectContaining({ player_name: 'Player', overall_rating: 8 }));
        expect(res.status).toHaveBeenCalledWith(201);
    });
    it('rejects a goal by a reserve who has not entered the game', async () => {
        const tx = { LOCK: { UPDATE: 'UPDATE' }, commit: vi.fn(), rollback: vi.fn() };
        // The database module is mocked; this model is not initialized against PostgreSQL.
        Object.defineProperty(Events, 'sequelize', { configurable: true, value: { transaction: vi.fn().mockResolvedValue(tx) } });
        vi.spyOn(Matches, 'findOne').mockResolvedValue({ id, status: 'in_progress' });
        vi.spyOn(Games, 'findOne').mockResolvedValue({ id, status: 'in_progress' });
        vi.spyOn(Teams, 'findOne').mockResolvedValue({ id });
        vi.spyOn(Roster, 'findOne').mockResolvedValue({ player_id: id, is_reserve: true });
        vi.spyOn(Events, 'findOne').mockResolvedValue(null);
        vi.spyOn(Events, 'create').mockResolvedValue({});
        vi.spyOn(Time, 'getElapsedSeconds').mockResolvedValue(60);
        const res = response();
        await EventsController.store({ userId: 'owner', params: { match_id: id, game_id: id }, body: { team_id: id, player_id: id, event_type: 'goal' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(Events.create).not.toHaveBeenCalled();
        expect(tx.rollback).toHaveBeenCalledOnce();
        expect(tx.commit).not.toHaveBeenCalled();
    });
    it('preserves a goal after substitution and allows the incoming player to score', async () => {
        const incomingId = '22222222-2222-4222-8222-222222222222';
        const tx = { LOCK: { UPDATE: 'UPDATE' }, commit: vi.fn(), rollback: vi.fn() };
        Object.defineProperty(Events, 'sequelize', { configurable: true, value: { transaction: vi.fn().mockResolvedValue(tx) } });
        vi.spyOn(Matches, 'findOne').mockResolvedValue({ id, status: 'in_progress' });
        vi.spyOn(Games, 'findOne').mockResolvedValue({ id, status: 'in_progress' });
        vi.spyOn(Teams, 'findOne').mockResolvedValue({ id });
        const outgoing = { player_id: id, is_reserve: false };
        const incoming = { player_id: incomingId, is_reserve: true };
        for (const player of [outgoing, incoming]) {
            player.update = vi.fn(async data => Object.assign(player, data));
        }
        vi.spyOn(Roster, 'findOne').mockImplementation(async ({ where }) =>
            [outgoing, incoming].find(player => player.player_id === where.player_id));
        const history = [];
        vi.spyOn(Events, 'findOne').mockResolvedValue(null);
        vi.spyOn(Events, 'create').mockImplementation(async data => {
            const event = { ...data }; history.push(event); return event;
        });
        vi.spyOn(Events, 'destroy');
        vi.spyOn(Events, 'update');
        vi.spyOn(Time, 'getElapsedSeconds').mockResolvedValue(60);
        const submit = async body => {
            const res = response();
            await EventsController.store({ userId: 'owner', params: { match_id: id, game_id: id }, body: { team_id: id, ...body } }, res);
            return res;
        };
        expect((await submit({ event_type: 'goal', player_id: id })).status).toHaveBeenCalledWith(201);
        const originalGoal = { ...history[0] };
        expect((await submit({ event_type: 'substitution', player_out_id: id, player_in_id: incomingId })).status).toHaveBeenCalledWith(201);
        expect(outgoing.is_reserve).toBe(true);
        expect(incoming.is_reserve).toBe(false);
        expect((await submit({ event_type: 'goal', player_id: id })).status).toHaveBeenCalledWith(400);
        expect((await submit({ event_type: 'goal', player_id: incomingId })).status).toHaveBeenCalledWith(201);
        expect(history).toHaveLength(3);
        expect(history[0]).toEqual(originalGoal);
        expect(history.filter(event => event.event_type === 'goal').map(event => event.player_id)).toEqual([id, incomingId]);
        expect(Events.destroy).not.toHaveBeenCalled();
        expect(Events.update).not.toHaveBeenCalled();
    });
});



