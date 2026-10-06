import MatchGames from "../Models/MatchGames.js";
import MatchGameTimeService from "./MatchGameTimeService.js";
import MatchFinishService from "./MatchFinishService.js";
import Matches from "../Models/Matches.js";

class MatchGameExpirationService {
    async checkGames() {
        const games = await MatchGames.findAll({
            where: {
                status: "in_progress",
            },
        });

        for (const game of games) {
            const finished =
                await MatchGameTimeService.isFinished(game);

            if (!finished) {
                continue;
            }

            await game.update({
                status: "finished",
                finished_at: new Date(),
                winner_team_id: null,
            });

            const unfinishedGames =
                await MatchGames.count({
                    where: {
                        match_id: game.match_id,
                        status: [
                            "pending",
                            "in_progress",
                            "paused",
                        ],
                    },
                });

            if (unfinishedGames === 0) {
                const match = await Matches.findByPk(
                    game.match_id
                );

                if (
                    match &&
                    match.status === "in_progress"
                ) {
                    await MatchFinishService.finish(
                        match
                    );
                }
            }
        }
    }
}

export default new MatchGameExpirationService();