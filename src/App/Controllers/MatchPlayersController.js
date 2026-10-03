import * as Yup from "yup";
import Matches from "../Models/Matches.js";
import MatchPlayers from "../Models/MatchPlayers.js";
import MatchTeams from "../Models/MatchTeams.js";
import Player from "../Models/Player.js";

class MatchPlayersController {
    async store(request, response) {
        const paramsSchema = Yup.object({
            match_id: Yup.string().uuid().required(),
        });

        const bodySchema = Yup.object({
            team_id: Yup.string().uuid().required(),
            player_id: Yup.string().uuid().required(),
            number: Yup.number().integer().positive().required(),
            is_reserve: Yup.boolean(),
            is_goalkeeper: Yup.boolean(),
            minutes_player: Yup.number().integer().min(0),
        });

        try {
            paramsSchema.validateSync(request.params, { abortEarly: false, strict: true });
            bodySchema.validateSync(request.body, { abortEarly: false, strict: true });
        } catch (error) {
            return response.status(400).json({ error: error.errors });
        }

        const { match_id } = request.params;
        const { team_id, player_id, number, is_reserve, is_goalkeeper, minutes_player } = request.body;

        const match = await Matches.findByPk(match_id);

        if (!match) {
            return response.status(404).json({ error: "Match not found" });
        }

        if (match.user_id !== request.userId) {
            return response.status(403).json({ error: "You do not have permission to modify this match" });
        }

        if(match.status !== "pending"){
            return response.status(403).json({error:"Players cannot be modified at this time"})
        }

        const team = await MatchTeams.findOne({
            where: { id: team_id, match_id },
        });

        if (!team) {
            return response.status(404).json({ error: "Team not found in this match" });
        }

        const player = await Player.findOne({
            where: { id: player_id, user_id: request.userId },
        });

        if (!player) {
            return response.status(404).json({ error: "Player not found" });
        }

        const existingMatchPlayer = await MatchPlayers.findOne({
            where: { match_id, player_id },
        });

        if (existingMatchPlayer) {
            return response.status(400).json({ error: "Player has already been added to this match" });
        }

        const matchPlayer = await MatchPlayers.create({
            match_id,
            team_id,
            player_id,
            number,
            is_reserve,
            is_goalkeeper,
            minutes_player,
        });

        return response.status(201).json(matchPlayer);
    }
}

export default new MatchPlayersController();
