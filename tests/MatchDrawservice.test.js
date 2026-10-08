import { beforeEach, describe, expect, it, vi } from 'vitest';
import service from '../src/App/Services/MatchDrawService.js';
import Database from '../src/Database/index.js';
import Player from '../src/App/Models/Player.js';
import Draw from '../src/App/Models/Draw.js';
import DrawTeam from '../src/App/Models/DrawTeam.js';
import DrawPlayer from '../src/App/Models/DrawPlayer.js';
describe('Draw roster and transaction rules', () => {
    let transaction, config, players, roster, teams;
    beforeEach(() => {
        transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: vi.fn(), rollback: vi.fn() };
        Database.connection.transaction.mockResolvedValue(transaction);
        players = [9, 8, 7, 6].map((rating, i) => ({ id: `p${i}`, overall_rating: rating, is_goalkeeper: false }));
        roster = [];
        teams = ['a', 'b'].map(id => ({ id, update: vi.fn() }));
        config = { draw: { id: 'draw' }, playerIds: players.map(p => p.id), howManyTeams: 2, playersPerTeam: 2, hasReserve: false, considerGoalkeepers: false };
        vi.spyOn(Draw, 'findByPk').mockResolvedValue({ id: 'draw', user_id: 'owner' });
        vi.spyOn(Player, 'findAll').mockImplementation(async () => players);
        vi.spyOn(DrawTeam, 'findAll').mockResolvedValue(teams);
        vi.spyOn(DrawPlayer, 'findAll').mockImplementation(async () => [...roster]);
        vi.spyOn(DrawPlayer, 'create').mockImplementation(async row => { roster.push(row); return row; });
    });
    it.each([[[], 'At least one player must be selected.'], [['p0', 'p0'], 'Duplicate players were selected.'], [['missing'], 'One or more selected players were not found.']])('rejects invalid selection %j', async (ids, message) => {
        config.playerIds = ids;
        await expect(service.draw(config)).rejects.toThrow(message);
        expect(DrawPlayer.create).not.toHaveBeenCalled();
        expect(transaction.rollback).toHaveBeenCalledOnce();
        expect(transaction.commit).not.toHaveBeenCalled();
    });
    it('fills teams, balances ratings, and scopes players to the owner', async () => {
        const result = await service.draw(config);
        expect(result).toHaveLength(4);
        expect(new Set(result.map(p => p.player_id)).size).toBe(4);
        for (const team of teams) {
            expect(result.filter(p => p.team_id === team.id)).toHaveLength(2);
            expect(team.update).toHaveBeenCalledWith({ score: 7.5 }, { transaction });
        }
        expect(Player.findAll).toHaveBeenCalledWith({ where: { user_id: 'owner', id: config.playerIds }, transaction });
        expect(transaction.commit).toHaveBeenCalledOnce();
    });
    it('requires enough players', async () => {
        players = players.slice(0, 1); config.playerIds = ['p0'];
        await expect(service.draw(config)).rejects.toThrow("There aren't enough players.");
        expect(DrawPlayer.create).not.toHaveBeenCalled();
    });
    it('requires one goalkeeper per team', async () => {
        config.considerGoalkeepers = true;
        await expect(service.draw(config)).rejects.toThrow("There aren't enough goalkeepers.");
    });
    it('assigns goalkeepers separately from outfield slots', async () => {
        players.push(...['g1', 'g2'].map(id => ({ id, is_goalkeeper: true, overall_rating: 7 })));
        config.playerIds = players.map(p => p.id); config.considerGoalkeepers = true;
        const result = await service.draw(config);
        for (const team of teams) {
            const members = result.filter(p => p.team_id === team.id);
            expect(members).toHaveLength(3);
            expect(members.filter(p => p.is_goalkeeper)).toHaveLength(1);
            expect(members.find(p => p.is_goalkeeper).number).toBe(1);
        }
    });
    it('fills only reserve slots in a second draw', async () => {
        roster = teams.map((team, i) => ({ team_id: team.id, player_id: players[i].id, player: players[i], is_reserve: false }));
        config.playersPerTeam = 1; config.hasReserve = true; config.reservePerTeam = 1;
        const result = await service.draw(config);
        expect(result).toHaveLength(4);
        expect(result.filter(p => p.is_reserve)).toHaveLength(2);
        expect(new Set(result.map(p => p.player_id)).size).toBe(4);
    });
    it('rejects draws when all slots are filled', async () => {
        roster = players.map((p, i) => ({ player_id: p.id, team_id: teams[i % 2].id, player: p, is_reserve: false }));
        await expect(service.draw(config)).rejects.toThrow('There are no more roster spots');
        expect(DrawPlayer.create).not.toHaveBeenCalled();
    });
    it('rolls back a persistence failure', async () => {
        DrawPlayer.create.mockRejectedValue(new Error('write failed'));
        await expect(service.draw(config)).rejects.toThrow('write failed');
        expect(transaction.rollback).toHaveBeenCalledOnce();
        expect(transaction.commit).not.toHaveBeenCalled();
    });
});
