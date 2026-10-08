import * as Yup from "yup";
import Matches from "../Models/Matches.js";
import MatchTeams from "../Models/MatchTeams.js";
import MatchGames from "../Models/MatchGames.js";

class MatchTeamsController {
    async store(request, response) {
        const paramsSchema = Yup.object({
            match_id: Yup.string().uuid().required(),
        });
        const bodySchema = Yup.object({
            name: Yup.string().required(),
            team_number: Yup.number().integer().positive().required(),
            score: Yup.number().integer().min(0),
        });

        try {
            paramsSchema.validateSync(request.params, { abortEarly: false, strict: true });
            bodySchema.validateSync(request.body, { abortEarly: false, strict: true });
        } catch (error) {
            return response.status(400).json({ error: error.errors });
        }

        const { match_id } = request.params;
        const { name, team_number, score } = request.body;
        const match = await Matches.findByPk(match_id);

        if (!match) {
            return response.status(404).json({ error: "Match not found" });
        }
        if(match.status !== "pending"){
            return response.status(403).json({error:"Teams cannot be modified at this time"})
        }

        if (match.user_id !== request.userId) {
            return response.status(403).json({ error: "You do not have permission to modify this match" });
        }

        const teamCount = await MatchTeams.count({
            where: { match_id },
        });

        if (teamCount >= 2) {
            return response.status(400).json({
                error: "A match can contain only two teams",
            });
        }

        const existingGame = await MatchGames.findOne({
            where: { match_id },
        });

        if (existingGame) {
            return response.status(400).json({
                error: "Teams cannot be added after the game is created",
            });
        }

        const existingTeam = await MatchTeams.findOne({
            where: { match_id, team_number },
        });

        if (existingTeam) {
            return response.status(400).json({ error: "This team number is already in use in this match" });
        }

        const team = await MatchTeams.create({ name, team_number, score, match_id });
        return response.status(201).json(team);
    }
}

export default new MatchTeamsController();
