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

        if (teamAId === teamBId) {
            throw new Error(
                "A team cannot play against itself."
            );
        }

        const teams = await MatchTeams.findAll({
            where: {
                match_id: match.id,
                id: [teamAId, teamBId],
            },
            order: [["team_number", "ASC"]],
        });

        if (teams.length !== 2) {
            throw new Error(
                "One or both teams do not belong to this match."
            );
        }

        const game = await MatchGames.create({
            match_id: match.id,
            team_a_id: teamAId,
            team_b_id: teamBId,
            round,
            duration,
        });

        return game;
    }
}

export default new MatchGameCreateService();