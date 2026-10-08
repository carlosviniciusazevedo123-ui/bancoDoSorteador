import Database from "../../Database/index.js";
import MatchGames from "../Models/MatchGames.js";
import Matches from "../Models/Matches.js";

class MatchGameStartService {
    async start({ matchId, gameId, userId }) {
        const transaction = await Database.connection.transaction();

        try {
            // Match first, then game: use the same lock order as finish/expiration.
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

            if (game.status !== "pending") {
                throw new Error("Game cannot be started.");
            }

            await game.update({
                status: "in_progress",
                started_at: new Date(),
            }, { transaction });

            if (match.status === "pending") {
                await match.update({ status: "in_progress" }, { transaction });
            }

            await transaction.commit();
            return game;
        } catch (error) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            throw error;
        }
    }
}

export default new MatchGameStartService();
