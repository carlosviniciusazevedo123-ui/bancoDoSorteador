import MatchGames from "../Models/MatchGames.js";
import Matches from "../Models/Matches.js";

class MatchGameStartService {
    async start({ matchId, gameId, userId }) {
        const match = await Matches.findOne({
            where: {
                id: matchId,
                user_id: userId,
            },
        });

        if (!match) {
            throw new Error("Match not found.");
        }

        if (match.status === "finished") {
            throw new Error("Match is already finished.");
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

        if (game.status !== "pending") {
            throw new Error("Game cannot be started.");
        }

        await game.update({
            status: "in_progress",
            started_at: new Date(),
        });

        if (match.status === "pending") {
            await match.update({
                status: "in_progress",
            });
        }

        return game;
    }
}

export default new MatchGameStartService();