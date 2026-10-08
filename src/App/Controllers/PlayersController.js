import Sequelize from "sequelize";
import Player from "../Models/Player.js";
import MatchPlayers from "../Models/MatchPlayers.js";
import * as Yup from "yup";

class PlayersController {
    async store(request, response) {
        const schema = Yup.object({
            name: Yup.string()
                .transform((value, originalValue) =>
                    typeof originalValue === "string" ? value : originalValue
                )
                .trim()
                .min(1)
                .required(),

            position: Yup.string(),

            is_goalkeeper: Yup.boolean()
                .required(),

            overall_rating: Yup.number()
                .min(0)
                .max(10)
                .required(),
        });

        let validatedBody;
        try {
            validatedBody = schema.validateSync(request.body, {
                abortEarly: false,
                strict: false,
            });
        } catch (error) {
            return response.status(400).json({
                error: error.errors,
            });
        }

        const name = validatedBody.name;

        const {
            position,
            is_goalkeeper,
            overall_rating,
        } = validatedBody;

        const user_id = request.userId;

        const existingPlayer = await Player.findOne({
            where: {
                user_id,
                [Sequelize.Op.and]: [
                    Sequelize.where(
                        Sequelize.fn(
                            "LOWER",
                            Sequelize.col("name")
                        ),
                        name.toLowerCase()
                    ),
                ],
            },
        });

        if (existingPlayer) {
            return response.status(400).json({
                error: "A player with this name already exists",
            });
        }

        const player = await Player.create({
            name,
            position,
            is_goalkeeper,
            overall_rating,
            user_id,
        });

        return response.status(201).json({
            id: player.id,
            name: player.name,
            position: player.position,
            is_goalkeeper: player.is_goalkeeper,
            overall_rating: player.overall_rating,
        });
    }

    async index(request, response) {
        const players = await Player.findAll({
            where: {
                user_id: request.userId,
            },
            order: [["name", "ASC"]],
        });

        return response.status(200).json(players);
    }

    async show(request, response) {
        const schema = Yup.object({
            id: Yup.string()
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

        const { id } = request.params;

        const player = await Player.findOne({
            where: {
                id,
                user_id: request.userId,
            },
        });

        if (!player) {
            return response.status(404).json({
                error: "Player not found",
            });
        }

        return response.status(200).json(player);
    }

    async update(request, response) {
        const paramsSchema = Yup.object({
            id: Yup.string()
                .uuid()
                .required(),
        });

        const bodySchema = Yup.object({
            name: Yup.string()
                .transform((value, originalValue) =>
                    typeof originalValue === "string" ? value : originalValue
                )
                .trim()
                .min(1),

            position: Yup.string(),

            is_goalkeeper: Yup.boolean(),
        });

        let validatedBody;
        try {
            paramsSchema.validateSync(request.params, {
                abortEarly: false,
                strict: true,
            });

            validatedBody = bodySchema.validateSync(request.body, {
                abortEarly: false,
                strict: false,
            });
        } catch (error) {
            return response.status(400).json({
                error: error.errors,
            });
        }

        const { id } = request.params;

        const player = await Player.findOne({
            where: {
                id,
                user_id: request.userId,
            },
        });

        if (!player) {
            return response.status(404).json({
                error: "Player not found",
            });
        }

        const {
            name,
            position,
            is_goalkeeper,
        } = validatedBody;

        const updateData = {};

        if (name !== undefined) {
            updateData.name = name;

            const existingPlayer = await Player.findOne({
                where: {
                    user_id: request.userId,
                    [Sequelize.Op.and]: [
                        Sequelize.where(
                            Sequelize.fn(
                                "LOWER",
                                Sequelize.col("name")
                            ),
                            updateData.name.toLowerCase()
                        ),
                    ],
                },
            });

            if (
                existingPlayer &&
                existingPlayer.id !== player.id
            ) {
                return response.status(400).json({
                    error: "A player with this name already exists",
                });
            }
        }

        if (position !== undefined) {
            updateData.position = position;
        }

        if (is_goalkeeper !== undefined) {
            updateData.is_goalkeeper =
                is_goalkeeper;
        }

        await player.update(updateData);

        return response.status(200).json(player);
    }

    async delete(request, response) {
        const { id } = request.params;

        const player = await Player.findOne({
            where: {
                id,
                user_id: request.userId,
            },
        });

        if (!player) {
            return response.status(404).json({
                error: "Player not found",
            });
        }

        const playerInMatch = await MatchPlayers.findOne({
            where: {
                player_id: player.id,
            },
        });

        if (playerInMatch) {
            return response.status(409).json({
                error: "A player who has participated in a match cannot be deleted.",
            });
        }

        await player.destroy();

        return response.status(204).send();
    }
}

export default new PlayersController();
