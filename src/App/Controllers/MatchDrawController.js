import * as Yup from "yup"

import Matches from "../Models/Matches.js";
import MatchDrawService from "../Services/MatchDrawService.js";

class MatchDrawController {
    async draw(request, response) {
        const bodySchema = Yup.object({
            howManyTeams: Yup.number().integer().positive().required(),
            playersPerTeam: Yup.number().integer().positive().required(),
            hasReserve: Yup.boolean().required(),
            reservePerTeam: Yup.number().integer().min(0).when("hasReserve", {
                is: true,
                then: (schema) => schema.min(1).required(),
                otherwise: (schema) => schema.min(0)
            }),
            considerGoalkeepers: Yup.boolean().required(),
        })
        const paramsSchema = Yup.object({
            match_id: Yup.string().uuid().required()
        })
        try {
            paramsSchema.validateSync(request.params, {
                abortEarly: false,
                strict: true
            });
            bodySchema.validateSync(request.body, {
                abortEarly: false,
                strict: true,
            });
        } catch (error) {

            return response.status(400).json({
                error: error.errors,
            });
        }
        const { match_id } = request.params;

        const match = await Matches.findByPk(match_id);

        if (!match) {
            return response.status(404).json({ error: "Match not found" });
        }

        if (match.user_id !== request.userId) {
            return response.status(403).json({
                error: "No permission to modify this match"
            });
        }
        if (match.status !== "pending") {
            return response.status(403).json({ error: "Player selection by draw is not possible at the moment." })
        }

        const {
            howManyTeams,
            playersPerTeam,
            hasReserve,
            reservePerTeam,
            considerGoalkeepers
        } = request.body;
        try {
            const result = await MatchDrawService.draw({
                match,
                howManyTeams,
                playersPerTeam,
                hasReserve,
                reservePerTeam,
                considerGoalkeepers
            })
            return response.status(201).json(result)

        } catch (error) {
            
            return response.status(400).json({
                error: error.message
            })
        }

    }
}

export default new MatchDrawController();