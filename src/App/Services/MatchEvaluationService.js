import MatchEvents from "../Models/MatchEvents.js"
import Player from "../Models/Player.js"

class MatchEvaluationService {
    async evaluate(match, transaction) {
        const events = await MatchEvents.findAll({
            where: {
                match_id: match.id
            },
            transaction: transaction
        });

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
            const player = await Player.findByPk(
                event.player_id,
                { transaction: transaction }
            );
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