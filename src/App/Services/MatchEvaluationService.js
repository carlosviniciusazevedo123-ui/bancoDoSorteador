import MatchEvents from "../Models/MatchEvents.js"
import Player from "../Models/Player.js"

class MatchEvaluationService {
    async evaluate(match, transaction) {
        const events = await MatchEvents.findAll({
            where: {
                match_id: match.id
            },
            transaction: transaction,
            order: [["createdAt", "ASC"], ["id", "ASC"]]
        });

        // Acquire shared player locks in the same order in every rating process.
        const players = new Map();
        for (const id of [...new Set(events.map(event => event.player_id))].sort()) {
            players.set(id, await Player.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE }));
        }

        for (const event of events) {

            let points = 0;

            if (event.event_type === "goal") {
                points = 0.1;
            };
            if (event.event_type === "assist") {
                points = 0.1;
            };
            if (event.event_type === "yellow_card") {
                points = -0.2;
            };
            if (event.event_type === "red_card") {
                points = -0.5;
            };
            if (event.event_type === "own_goal") {
                points = -0.5;
            };
            if (event.event_type === "substitution") {
                points = 0
            };
            const player = players.get(event.player_id);
            if (!player) continue;
            await player.update({
                overall_rating: Math.min(
                    10,
                    Math.max(0, Number(
                         player.overall_rating)
                          + 
                          points
                        )
                )
            },
                {
                    transaction:
                        transaction
                });
        }
    }
}

export default new MatchEvaluationService();