import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import service from '../src/App/Services/MatchFinishService.js';
import Database from '../src/Database/index.js';
import Matches from '../src/App/Models/Matches.js';
import Evaluation from '../src/App/Services/MatchEvaluationService.js';
import Start from '../src/App/Services/MatchGameStartService.js';
import Games from '../src/App/Models/MatchGames.js';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import auth from '../src/Config/auth.js';

describe('Match completion', () => {
    let transaction, match;
    beforeEach(() => {
        transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: vi.fn(), rollback: vi.fn() };
        Database.connection.transaction.mockResolvedValue(transaction);
        match = { id: 'match', status: 'in_progress', update: vi.fn() };
        vi.spyOn(Matches, 'findByPk').mockImplementation(async () => match);
        vi.spyOn(Evaluation, 'evaluate').mockResolvedValue();
    });
    it('finishes and evaluates within one transaction', async () => {
        expect(await service.finish(match)).toBe(true);
        expect(match.update).toHaveBeenCalledWith({ status: 'finished', finished_at: expect.any(Date) }, { transaction });
        expect(Evaluation.evaluate).toHaveBeenCalledWith(match, transaction);
        expect(transaction.commit).toHaveBeenCalledOnce();
    });
    it('does not reapply ratings to a finished match', async () => {
        match.status = 'finished';
        expect(await service.finish(match)).toBe(false);
        expect(Evaluation.evaluate).not.toHaveBeenCalled();
        expect(transaction.rollback).toHaveBeenCalledOnce();
    });
    it('leaves commit ownership with the caller', async () => {
        expect(await service.finish(match, transaction)).toBe(true);
        expect(transaction.commit).not.toHaveBeenCalled();
        expect(transaction.rollback).not.toHaveBeenCalled();
    });
    it('rolls back if rating updates fail', async () => {
        Evaluation.evaluate.mockRejectedValue(new Error('rating failure'));
        await expect(service.finish(match)).rejects.toThrow('rating failure');
        expect(transaction.rollback).toHaveBeenCalledOnce();
        expect(transaction.commit).not.toHaveBeenCalled();
    });
});

describe('Game start', () => {
    let transaction;
    beforeEach(() => {
        transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: vi.fn(), rollback: vi.fn() };
        Database.connection.transaction.mockResolvedValue(transaction);
    });
    it('starts the game and pending match', async () => {
        const match = { id: 'match', status: 'pending', update: vi.fn() };
        const game = { status: 'pending', update: vi.fn() };
        vi.spyOn(Matches, 'findOne').mockResolvedValue(match);
        vi.spyOn(Games, 'findOne').mockResolvedValue(game);
        expect(await Start.start({ matchId: 'match', gameId: 'game', userId: 'owner' })).toBe(game);
        expect(game.update).toHaveBeenCalledWith({ status: 'in_progress', started_at: expect.any(Date) }, { transaction });
        expect(match.update).toHaveBeenCalledWith({ status: 'in_progress' }, { transaction });
        expect(Matches.findOne).toHaveBeenCalledWith({ where: { id: 'match', user_id: 'owner' }, transaction, lock: transaction.LOCK.UPDATE });
        expect(Games.findOne).toHaveBeenCalledWith({ where: { id: 'game', match_id: 'match' }, transaction, lock: transaction.LOCK.UPDATE });
        expect(Matches.findOne.mock.invocationCallOrder[0]).toBeLessThan(Games.findOne.mock.invocationCallOrder[0]);
        expect(transaction.commit).toHaveBeenCalledOnce();
        expect(transaction.rollback).not.toHaveBeenCalled();
    });
    it.each(['in_progress', 'paused', 'finished'])('rejects starting a %s game', async status => {
        vi.spyOn(Matches, 'findOne').mockResolvedValue({ id: 'match', status: 'in_progress' });
        const game = { status, update: vi.fn() };
        vi.spyOn(Games, 'findOne').mockResolvedValue(game);
        await expect(Start.start({ matchId: 'match', gameId: 'game', userId: 'owner' })).rejects.toThrow('Game cannot be started.');
        expect(game.update).not.toHaveBeenCalled();
        expect(transaction.rollback).toHaveBeenCalledOnce();
        expect(transaction.commit).not.toHaveBeenCalled();
    });
    it.each(['game', 'match'])('rolls back when the %s update fails', async failingUpdate => {
        const match = { id: 'match', status: 'pending', update: vi.fn() };
        const game = { status: 'pending', update: vi.fn() };
        vi.spyOn(Matches, 'findOne').mockResolvedValue(match);
        vi.spyOn(Games, 'findOne').mockResolvedValue(game);
        (failingUpdate === 'game' ? game : match).update.mockRejectedValue(new Error('write failed'));
        await expect(Start.start({ matchId: 'match', gameId: 'game', userId: 'owner' })).rejects.toThrow('write failed');
        expect(transaction.rollback).toHaveBeenCalledOnce();
        expect(transaction.commit).not.toHaveBeenCalled();
    });
    it('rejects a repeat start without overwriting the original timestamp', async () => {
        const match = { id: 'match', status: 'pending' };
        const game = { status: 'pending' };
        match.update = vi.fn(async data => Object.assign(match, data));
        game.update = vi.fn(async data => Object.assign(game, data));
        vi.spyOn(Matches, 'findOne').mockResolvedValue(match);
        vi.spyOn(Games, 'findOne').mockResolvedValue(game);
        await Start.start({ matchId: 'match', gameId: 'game', userId: 'owner' });
        const originalStart = game.started_at;
        await expect(Start.start({ matchId: 'match', gameId: 'game', userId: 'owner' })).rejects.toThrow('Game cannot be started.');
        expect(game.update).toHaveBeenCalledOnce();
        expect(game.started_at).toBe(originalStart);
    });
    it('does not return success before committing', async () => {
        vi.spyOn(Matches, 'findOne').mockResolvedValue({ id: 'match', status: 'pending', update: vi.fn() });
        vi.spyOn(Games, 'findOne').mockResolvedValue({ status: 'pending', update: vi.fn() });
        transaction.commit.mockRejectedValue(new Error('commit failed'));
        await expect(Start.start({ matchId: 'match', gameId: 'game', userId: 'owner' })).rejects.toThrow('commit failed');
        expect(transaction.rollback).toHaveBeenCalledOnce();
    });
    it.each([['pending', 200], ['in_progress', 400]])('preserves HTTP response for a %s game', async (status, expectedStatus) => {
        vi.spyOn(Matches, 'findOne').mockResolvedValue({ id: 'match', status: 'pending', update: vi.fn() });
        const game = { id: 'game', status, update: vi.fn(async data => Object.assign(game, data)) };
        vi.spyOn(Games, 'findOne').mockResolvedValue(game);
        const res = await request(app).patch('/matches/match/games/game/start')
            .set('Authorization', `Bearer ${jwt.sign({ id: 'owner' }, auth.secret)}`);
        expect(res.status).toBe(expectedStatus);
        if (expectedStatus === 200) {
            expect(res.body).toMatchObject({ id: 'game', status: 'in_progress' });
            expect(res.body.started_at).toBeDefined();
        } else {
            expect(res.body).toEqual({ error: 'Game cannot be started.' });
        }
    });
});
