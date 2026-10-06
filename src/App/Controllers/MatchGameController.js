import * as Yup from "yup";

import MatchGameCreateService from "../Services/MatchGameCreateService.js";
import MatchGameTimeService from "../Services/MatchGameTimeService.js";

class MatchGameController {
    async store(request, response) {
        const schema = Yup.object({
            team_a_id: Yup.string()
                .uuid()
                .required(),

            team_b_id: Yup.string()
                .uuid()
                .required(),

            round: Yup.number()
                .integer()
                .positive()
                .required(),

            duration: Yup.number()
                .integer()
                .positive()
                .required(),
        });

        try {
            schema.validateSync(request.body, {
                abortEarly: false,
                strict: true,
            });
        } catch (error) {
            return response.status(400).json({
                error: error.errors,
            });
        }

        const {
            team_a_id,
            team_b_id,
            round,
            duration,
        } = request.body;

        try {
            const game =
                await MatchGameCreateService.create({
                    matchId: request.params.match_id,
                    userId: request.userId,
                    teamAId: team_a_id,
                    teamBId: team_b_id,
                    round,
                    duration,
                });

            return response.status(201).json(game);
        } catch (error) {
            return response.status(400).json({
                error: error.message,
            });
        }
    }

    async show(request, response) {
        const schema = Yup.object({
            match_id: Yup.string()
                .uuid()
                .required(),

            game_id: Yup.string()
                .uuid()
                .required(),
        });

        try {
            schema.validateSync(request.params, {
                abortEarly: false,
                strict: true,
            });
        } catch (error) {
            return response.status(400).json({
                error: error.errors,
            });
        }

        const {
            match_id,
            game_id,
        } = request.params;

        try {
            const result =
                await MatchGameTimeService.getGameTime({
                    matchId: match_id,
                    gameId: game_id,
                    userId: request.userId,
                });

            return response.status(200).json(result);
        } catch (error) {
            return response.status(400).json({
                error: error.message,
            });
        }
    }
}

export default new MatchGameController();