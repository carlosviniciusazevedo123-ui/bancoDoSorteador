import MatchGames from "../Models/MatchGames.js";
import Matches from "../Models/Matches.js";
import MatchTeams from "../Models/MatchTeams.js";
import MatchFinishService from "./MatchFinishService.js";

class MatchGameFinishService {
    async finish({
        matchId,
        gameId,
        userId,
        winnerTeamId,
    }) {
        const match = await Matches.findOne({
            where: {
                id: matchId,
                user_id: userId,
            },
        });

        if (!match) {
            throw new Error("Match not found.");
        }

        const game = await MatchGames.findOne({
            where: {
                id: gameId,
                match_id: match.id,
            },
        });

        if (!game) {
            throw new Error("Game not found.");
        }

        if (game.status !== "in_progress") {
            throw new Error("Game cannot be finished.");
        }

        if (
            winnerTeamId !== game.team_a_id &&
            winnerTeamId !== game.team_b_id
        ) {
            throw new Error(
                "Winner team does not belong to this game."
            );
        }

        const winnerTeam = await MatchTeams.findOne({
            where: {
                id: winnerTeamId,
                match_id: match.id,
            },
        });

        if (!winnerTeam) {
            throw new Error("Winner team not found.");
        }

        await game.update({
            status: "finished",
            finished_at: new Date(),
            winner_team_id: winnerTeamId,
        });

        const unfinishedGames = await MatchGames.count({
            where: {
                match_id: match.id,
                status: [
                    "pending",
                    "in_progress",
                    "paused",
                ],
            },
        });

        if (unfinishedGames === 0) {
            await MatchFinishService.finish(match);
        }

        return game;
    }
}

export default new MatchGameFinishService();