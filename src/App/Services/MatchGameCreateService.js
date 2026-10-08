import Database from "../../Database/index.js";
import Matches from "../Models/Matches.js";
import MatchTeams from "../Models/MatchTeams.js";
import MatchGames from "../Models/MatchGames.js";

class MatchGameCreateService {
    async create({
        matchId,
        userId,
        teamAId,
        teamBId,
        round,
        duration,
    }) {
        const transaction = await Database.connection.transaction();

        try {
            const match = await Matches.findOne({
                where: {
                    id: matchId,
                    user_id: userId,
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!match) {
                throw new Error("Match not found.");
            }

            if (match.status === "finished") {
                throw new Error("Match is already finished.");
            }

            const existingGame = await MatchGames.findOne({
                where: { match_id: match.id },
                transaction,
            });

            if (existingGame) {
                throw new Error("A match can contain only one game.");
            }

            if (teamAId === teamBId) {
                throw new Error("A team cannot play against itself.");
            }

            const teams = await MatchTeams.findAll({
                where: {
                    match_id: match.id,
                },
                order: [["team_number", "ASC"]],
                transaction,
            });

            if (teams.length !== 2) {
                throw new Error(
                    "A match must have exactly two teams before its game is created."
                );
            }

            const selectedTeams = teams.filter(
                (team) => team.id === teamAId || team.id === teamBId
            );

            if (selectedTeams.length !== 2) {
                throw new Error(
                    "Both teams must belong to this match."
                );
            }

            const game = await MatchGames.create(
                {
                    match_id: match.id,
                    team_a_id: teamAId,
                    team_b_id: teamBId,
                    round,
                    duration,
                },
                { transaction }
            );

            await transaction.commit();
            return game;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

export default new MatchGameCreateService();
