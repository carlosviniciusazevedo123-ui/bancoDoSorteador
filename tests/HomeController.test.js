import { beforeEach, expect, it, vi } from 'vitest';
import controller from '../src/App/Controllers/HomeController.js';
import Draw from '../src/App/Models/Draw.js';
import DrawPlayer from '../src/App/Models/DrawPlayer.js';
import MatchGames from '../src/App/Models/MatchGames.js';
import Matches from '../src/App/Models/Matches.js';
import MatchEvents from '../src/App/Models/MatchEvents.js';

let response, next;
beforeEach(() => {
    response = { json: vi.fn(), status: vi.fn() };
    response.status.mockReturnValue(response);
    next = vi.fn();
});
it('returns no draw when no execution has persisted participants', async () => {
    const find = vi.spyOn(DrawPlayer, 'findOne').mockResolvedValue(null);
    await controller.latestDraw({ userId: 'owner' }, response, next);
    expect(response.json).toHaveBeenCalledWith(null);
    expect(find.mock.calls[0][0].include[0].where).toEqual({ user_id: 'owner' });
});
it('selects the last draw execution from participation timestamps and scopes its data', async () => {
    const find = vi.spyOn(DrawPlayer, 'findOne').mockResolvedValue({ draw_id: 'd', createdAt: 'date' });
    const draw = { id: 'd', teams: [] };
    const details = vi.spyOn(Draw, 'findOne').mockResolvedValue(draw);
    vi.spyOn(DrawPlayer, 'findAll').mockResolvedValue([{ player_id: 'p' }]);
    await controller.latestDraw({ userId: 'owner' }, response, next);
    expect(find.mock.calls[0][0].order[0]).toEqual(['createdAt', 'DESC']);
    expect(details.mock.calls[0][0].where).toEqual({ id: 'd', user_id: 'owner' });
    expect(response.json).toHaveBeenCalledWith({ draw, participants: [{ player_id: 'p' }], drawn_at: 'date' });
});
it('selects a finished game by its actual completion timestamp, not match creation', async () => {
    const game = { id: 'g', match_id: 'm' };
    const find = vi.spyOn(MatchGames, 'findOne').mockResolvedValueOnce(null).mockResolvedValueOnce(game);
    const match = { id: 'm', teams: [] };
    const details = vi.spyOn(Matches, 'findOne').mockResolvedValue(match);
    const events = vi.spyOn(MatchEvents, 'findAll').mockResolvedValue([]);
    await controller.latestGame({ userId: 'owner' }, response, next);
    expect(find.mock.calls[1][0].where.status).toBe('finished');
    expect(find.mock.calls[1][0].order[0]).toEqual(['finished_at', 'DESC']);
    expect(find.mock.calls[1][0].include[0].where).toEqual({ user_id: 'owner' });
    expect(details.mock.calls[0][0].where).toEqual({ id: 'm', user_id: 'owner' });
    expect(events.mock.calls[0][0].where).toEqual({ match_id: 'm', game_id: 'g' });
    expect(response.json).toHaveBeenCalledWith({ match, game, events: [] });
});
it('does not guess chronology when a finished game has no completion date', async () => {
    vi.spyOn(MatchGames, 'findOne').mockResolvedValue({ id: 'missing' });
    await controller.latestGame({ userId: 'owner' }, response, next);
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({ error: 'Missing game completion date' });
});
it('returns null when there are no finished games', async () => {
    vi.spyOn(MatchGames, 'findOne').mockResolvedValue(null);
    await controller.latestGame({ userId: 'owner' }, response, next);
    expect(response.json).toHaveBeenCalledWith(null);
});
it('forwards database failures to the existing error handler', async () => {
    const error = new Error('database unavailable');
    vi.spyOn(DrawPlayer, 'findOne').mockRejectedValue(error);
    await controller.latestDraw({ userId: 'owner' }, response, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(response.json).not.toHaveBeenCalled();
});

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import auth from '../src/Config/auth.js';

it.each(['/draws/latest', '/matches/games/latest'])('requires authentication for %s', async (url) => {
    const result = await request(app).get(url);
    expect(result.status).toBe(401);
});
it.each(['/draws/latest', '/matches/games/latest'])('routes %s to the authenticated summary', async (url) => {
    vi.spyOn(DrawPlayer, 'findOne').mockResolvedValue(null);
    vi.spyOn(MatchGames, 'findOne').mockResolvedValue(null);
    const result = await request(app).get(url).set('Authorization', `Bearer ${jwt.sign({ id: 'owner' }, auth.secret)}`);
    expect(result.status).toBe(200);
    expect(result.body).toBeNull();
});
