import Database from "../../Database/index.js";
import MatchGames from "../Models/MatchGames.js";
import Matches from "../Models/Matches.js";
import MatchTeams from "../Models/MatchTeams.js";
import MatchFinishService from "./MatchFinishService.js";

class MatchGameFinishService {
    async finish({ matchId, gameId, userId, winnerTeamId }) {
        const transaction = await Database.connection.transaction();

        try {
            // Lock the match first so concurrent game completions serialize
            // the final unfinished-games check for this match.
            const match = await Matches.findOne({
                where: { id: matchId, user_id: userId },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!match) {
                throw new Error("Match not found.");
            }

            if (match.status === "finished") {
                throw new Error("Match is already finished.");
            }

            const game = await MatchGames.findOne({
                where: { id: gameId, match_id: match.id },
                transaction,
                lock: transaction.LOCK.UPDATE,
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
                throw new Error("Winner team does not belong to this game.");
            }

            const winnerTeam = await MatchTeams.findOne({
                where: { id: winnerTeamId, match_id: match.id },
                transaction,
            });

            if (!winnerTeam) {
                throw new Error("Winner team not found.");
            }

            await game.update(
                {
                    status: "finished",
                    finished_at: new Date(),
                    winner_team_id: winnerTeamId,
                },
                { transaction }
            );

            const gameCount = await MatchGames.count({
                where: { match_id: match.id },
                transaction,
            });

            if (gameCount === 1) {
                await MatchFinishService.finish(match, transaction);
            } else {
                const unfinishedGames = await MatchGames.count({
                    where: {
                        match_id: match.id,
                        status: ["pending", "in_progress", "paused"],
                    },
                    transaction,
                });

                if (unfinishedGames === 0) {
                    await MatchFinishService.finish(match, transaction);
                }
            }

            await transaction.commit();
            return game;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

export default new MatchGameFinishService();
