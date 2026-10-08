import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import service from '../src/App/Services/MatchGameTimeService.js';
import Pauses from '../src/App/Models/MatchPauses.js';
import updateRating from '../src/App/Services/RatingService.js';

describe('Effective game clock', () => {
    afterEach(() => vi.useRealTimers());
    beforeEach(() => {
        vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T12:10:00Z'));
        vi.spyOn(Pauses, 'findAll').mockResolvedValue([]);
    });
    it('returns zero before starting without querying pauses', async () => {
        expect(await service.getElapsedTime({})).toBe(0);
        expect(Pauses.findAll).not.toHaveBeenCalled();
    });
    it('subtracts completed and open pauses', async () => {
        Pauses.findAll.mockResolvedValue([
            { started_at: '2026-01-01T12:02:00Z', finished_at: '2026-01-01T12:03:00Z' },
            { started_at: '2026-01-01T12:08:00Z', finished_at: null },
        ]);
        expect(await service.getElapsedSeconds({ id: 'game', started_at: '2026-01-01T12:00:00Z' })).toBe(420);
    });
    it('freezes a finished game clock', async () => {
        expect(await service.getElapsedSeconds({ id: 'game', started_at: '2026-01-01T12:00:00Z', finished_at: '2026-01-01T12:05:00Z' })).toBe(300);
    });
    it.each([[9, true], [10, true], [11, false]])('tests the duration boundary at %i minutes', async (duration, expected) => {
        expect(await service.isFinished({ id: 'game', started_at: '2026-01-01T12:00:00Z', duration })).toBe(expected);
    });
});

describe('Rating calculation', () => {
    it.each([[0, 6], [0.5, 7], [1, 8]])('applies weight %s', async (weight, expected) => {
        const player = { overall_rating: '6.0', update: vi.fn() }, transaction = {};
        await updateRating(player, { attack: 10, defense: 6, speed: null }, weight, transaction);
        expect(player.update).toHaveBeenCalledWith({ overall_rating: expected }, { transaction });
    });
    it('does not change a player without any ratings', async () => {
        const player = { overall_rating: 6, update: vi.fn() };
        await updateRating(player, { attack: null, defense: null }, 1);
        expect(player.update).not.toHaveBeenCalled();
    });
});

