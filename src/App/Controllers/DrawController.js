import * as Yup from "yup";

import Draw from "../Models/Draw.js";
import DrawTeam from "../Models/DrawTeam.js";
import DrawService from "../Services/MatchDrawService.js";
import Database from "../../Database/index.js";

class DrawController {
    async store(request, response, next) {
        const bodySchema = Yup.object({
            howManyTeams: Yup.number()
                .integer()
                .min(1)
                .max(50)
                .required(),

            playersPerTeam: Yup.number()
                .integer()
                .min(1)
                .max(20)
                .required(),

            hasReserve: Yup.boolean().required(),

            reservePerTeam: Yup.number()
                .integer()
                .min(0)
                .max(10)
                .when("hasReserve", {
                    is: true,
                    then: (schema) => schema.min(1).required(),
                    otherwise: (schema) => schema.min(0),
                }),

            considerGoalkeepers: Yup.boolean().required(),
        });

        try {
            bodySchema.validateSync(request.body, {
                abortEarly: false,
                strict: true,
            });
        } catch (error) {
            return response.status(400).json({
                error: error.errors,
            });
        }

        const {
            howManyTeams,
            playersPerTeam,
            hasReserve,
            reservePerTeam,
            considerGoalkeepers,
        } = request.body;

        const transaction =
            await Database.connection.transaction();

        try {
            const draw = await Draw.create(
                {
                    user_id: request.userId,
                    how_many_teams: howManyTeams,
                    players_per_team: playersPerTeam,
                    has_reserve: hasReserve,
                    reserve_per_team: hasReserve
                        ? reservePerTeam
                        : 0,
                    consider_goalkeepers:
                        considerGoalkeepers,
                },
                {
                    transaction,
                }
            );

            const teams = [];

            for (
                let index = 1;
                index <= howManyTeams;
                index++
            ) {
                const team = await DrawTeam.create(
                    {
                        draw_id: draw.id,
                        name: `Time ${index}`,
                        team_number: index,
                        score: 0,
                    },
                    {
                        transaction,
                    }
                );

                teams.push(team);
            }

            await transaction.commit();

            return response.status(201).json({
                draw,
                teams,
            });
        } catch (error) {
            await transaction.rollback();

            return next(error);
        }
    }

    async draw(request, response, next) {
        const bodySchema = Yup.object({
            playerIds: Yup.array()
                .of(
                    Yup.string()
                        .uuid()
                        .required()
                )
                .min(1)
                .required(),
        });

        const paramsSchema = Yup.object({
            draw_id: Yup.string()
                .uuid()
                .required(),
        });

        try {
            paramsSchema.validateSync(request.params, {
                abortEarly: false,
                strict: true,
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

        const { draw_id } = request.params;

        const draw = await Draw.findByPk(draw_id);

        if (!draw) {
            return response.status(404).json({
                error: "Draw not found",
            });
        }

        if (draw.user_id !== request.userId) {
            return response.status(403).json({
                error: "No permission to modify this draw",
            });
        }

        const { playerIds } = request.body;

        try {
            const result = await DrawService.draw({
                draw,
                playerIds,

                howManyTeams:
                    draw.how_many_teams,

                playersPerTeam:
                    draw.players_per_team,

                hasReserve:
                    draw.has_reserve,

                reservePerTeam:
                    draw.reserve_per_team,

                considerGoalkeepers:
                    draw.consider_goalkeepers,
            });

            return response.status(201).json(result);
        } catch (error) {
            return next(error);
        }
    }
}

export default new DrawController();