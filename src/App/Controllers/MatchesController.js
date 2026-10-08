import * as Yup from "yup";
import Matches from "../Models/Matches.js";
import MatchCreateService from "../Services/MatchCreateService.js";

class MatchesController {
    async store(request, response, next) {
        const schema = Yup.object({
            draw_id: Yup.string().uuid().required(),
            draw_team_a_id: Yup.string().uuid().required(),
            draw_team_b_id: Yup.string().uuid().required(),
            round: Yup.number().integer().positive().required(),
            duration: Yup.number().integer().positive().required(),
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

        try {
            const match =
                await MatchCreateService.create({
                    userId: request.userId,
                    drawId: request.body.draw_id,
                    drawTeamAId: request.body.draw_team_a_id,
                    drawTeamBId: request.body.draw_team_b_id,
                    round: request.body.round,
                    duration: request.body.duration,
                });

            return response.status(201).json(match);
        } catch (error) {
            return next(error);
        }
    }

    async index(request, response) {
        const matches = await Matches.findAll({
            where: {
                user_id: request.userId,
            },
        });

        return response.status(200).json(matches);
    }

    async show(request, response) {
        const paramsSchema = Yup.object({
            id: Yup.string()
                .uuid()
                .required(),
        });

        try {
            paramsSchema.validateSync(request.params, {
                abortEarly: false,
                strict: true,
            });
        } catch (error) {
            return response.status(400).json({
                error: error.errors,
            });
        }

        const { id } = request.params;

        const match = await Matches.findOne({
            where: {
                id,
                user_id: request.userId,
            },
            include: [
                {
                    association: "teams",
                    include: [
                        {
                            association: "players",
                        },
                    ],
                },
                {
                    association: "games",
                },
            ],
        });

        if (!match) {
            return response.status(404).json({
                error: "Match not found",
            });
        }

        return response.status(200).json(match);
    }

    async delete(request, response) {
        const paramsSchema = Yup.object({
            id: Yup.string()
                .uuid()
                .required(),
        });

        try {
            paramsSchema.validateSync(request.params, {
                abortEarly: false,
                strict: true,
            });
        } catch (error) {
            return response.status(400).json({
                error: error.errors,
            });
        }

        const { id } = request.params;

        const match = await Matches.findOne({
            where: {
                id,
                user_id: request.userId,
            },
        });

        if (!match) {
            return response.status(404).json({
                error: "Match not found",
            });
        }

        await match.destroy();

        return response.status(204).send();
    }
}

export default new MatchesController();
