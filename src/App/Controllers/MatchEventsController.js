import * as Yup from "yup";
import Matches from "../Models/Matches.js";
import MatchEvents from "../Models/MatchEvents.js";
import MatchPlayers from "../Models/MatchPlayers.js";
import MatchTeams from "../Models/MatchTeams.js";
import MatchTimeService from "../Services/MatchTimeService.js";

class MatchEventsController {
    async store(request, response) {
        const paramsSchema = Yup.object({
            match_id: Yup.string().uuid().required(),
        });

        const bodySchema = Yup.object({
            player_id: Yup.string().uuid().required(),
            team_id: Yup.string().uuid().required(),
            event_type: Yup.string()
                .oneOf(["goal", "assist", "yellow_card", "red_card", "substitution", "own_goal"])
                .required(),

        });

        try {
            paramsSchema.validateSync(request.params, {
                abortEarly: false,
                strict: true
            });
            bodySchema.validateSync(request.body, {
                abortEarly: false,
                strict: true
            });
        } catch (error) {
            return response.status(400).json({ error: error.errors });
        }

        const { match_id } = request.params;

        const { player_id, team_id, event_type } = request.body;

        const match = await Matches.findByPk(match_id);

        if (!match) {
            return response.status(404).json({ error: "Match not found" });
        }

        if (match.user_id !== request.userId) {
            return response.status(403).json({
                error: "No permission to modify this match"
            });
        }
        if (match.status !== "in_progress") {
            return response.status(400).json({
                error: "The match is not underway.",
            });
        }

        const team = await MatchTeams.findOne({
            where: {
                id: team_id,
                match_id
            },
        });

        if (!team) {
            return response.status(404).json({
                error: "Team not found in this match"
            });
        }

        const matchPlayer = await MatchPlayers.findOne({
            where: {
                match_id,
                team_id,
                player_id
            },
        });

        if (!matchPlayer) {
            return response.status(404).json({
                error: "Player not selected for this team"
            });
        }
        const effectiveSeconds =
            await MatchTimeService.getEffectiveSeconds(match);

        const minute = Math.floor(effectiveSeconds / 60);

        const expelled = await MatchEvents.findOne({
                where: {
                    player_id,
                    match_id,
                    event_type: "red_card"
            }
        });
        if(expelled){
            return response.status(400).json({
                message:"The player was sent off and can no longer participate in the match."})
        }

        const matchEvent = await MatchEvents.create({
            match_id,
            player_id,
            team_id,
            event_type,
            minute,
        });

        return response.status(201).json(matchEvent);
    }
}

export default new MatchEventsController();
