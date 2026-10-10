import MatchEvents from "../Models/MatchEvents.js";

class MatchGameScoreService {
    async getWinner(game, transaction) {
        const events = await MatchEvents.findAll({
            where: { match_id: game.match_id, game_id: game.id },
            transaction,
        });
        const scores = { [game.team_a_id]: 0, [game.team_b_id]: 0 };
        for (const event of events) {
            if (![game.team_a_id, game.team_b_id].includes(event.team_id)) continue;
            if (event.event_type === "goal") scores[event.team_id]++;
            if (event.event_type === "own_goal") {
                scores[event.team_id === game.team_a_id ? game.team_b_id : game.team_a_id]++;
            }
        }
        if (scores[game.team_a_id] === scores[game.team_b_id]) return null;
        return scores[game.team_a_id] > scores[game.team_b_id] ? game.team_a_id : game.team_b_id;
    }
}

export default new MatchGameScoreService();
