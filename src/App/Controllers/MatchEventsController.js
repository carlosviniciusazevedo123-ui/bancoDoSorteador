import * as Yup from "yup";

import Matches from "../Models/Matches.js";
import MatchEvents from "../Models/MatchEvents.js";
import MatchPlayers from "../Models/MatchPlayers.js";
import MatchTeams from "../Models/MatchTeams.js";
import MatchGames from "../Models/MatchGames.js";
import MatchGameTimeService from "../Services/MatchGameTimeService.js";

class MatchEventsController {
    async index(request, response) {
        const paramsSchema = Yup.object({
            match_id: Yup.string().uuid().required(),
            game_id: Yup.string().uuid().required(),
        });

        try {
            paramsSchema.validateSync(request.params, {
                abortEarly: false,
                strict: true,
            });
        } catch (error) {
            return response.status(400).json({ error: error.errors });
        }

        const { match_id, game_id } = request.params;
        const match = await Matches.findOne({
            where: { id: match_id, user_id: request.userId },
        });
        if (!match) {
            return response.status(404).json({ error: "Match not found" });
        }

        const game = await MatchGames.findOne({
            where: { id: game_id, match_id: match.id },
        });
        if (!game) {
            return response.status(404).json({ error: "Game not found in this match" });
        }

        const events = await MatchEvents.findAll({
            where: { match_id: match.id, game_id: game.id },
            order: [["createdAt", "ASC"], ["id", "ASC"]],
        });
        return response.status(200).json(events);
    }


    async store(request, response) {
        const paramsSchema = Yup.object({
            match_id: Yup.string().uuid().required(),
            game_id: Yup.string().uuid().required(),
        });

        const bodySchema = Yup.object({
            team_id: Yup.string().uuid().required(),
            event_type: Yup.string()
                .oneOf([
                    "goal",
                    "assist",
                    "yellow_card",
                    "red_card",
                    "substitution",
                    "own_goal",
                ])
                .required(),
            player_id: Yup.string()
                .uuid()
                .when("event_type", {
                    is: "substitution",
                    then: (schema) => schema.notRequired(),
                    otherwise: (schema) => schema.required(),
                }),
            player_out_id: Yup.string()
                .uuid()
                .when("event_type", {
                    is: "substitution",
                    then: (schema) => schema.required(),
                    otherwise: (schema) => schema.notRequired(),
                }),
            player_in_id: Yup.string()
                .uuid()
                .when("event_type", {
                    is: "substitution",
                    then: (schema) => schema.required(),
                    otherwise: (schema) => schema.notRequired(),
                }),
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

        const { match_id, game_id } = request.params;
        const {
            team_id,
            event_type,
            player_id,
            player_out_id,
            player_in_id,
        } = request.body;

        const transaction = await MatchEvents.sequelize.transaction();

        try {
            const match = await Matches.findOne({
                where: {
                    id: match_id,
                    user_id: request.userId,
                },
                transaction,
            });

            if (!match) {
                await transaction.rollback();
                return response.status(404).json({
                    error: "Match not found",
                });
            }

            if (match.status !== "in_progress") {
                await transaction.rollback();
                return response.status(400).json({
                    error: "The match is not underway.",
                });
            }

            const game = await MatchGames.findOne({
                where: {
                    id: game_id,
                    match_id: match.id,
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!game) {
                await transaction.rollback();
                return response.status(404).json({
                    error: "Game not found in this match",
                });
            }

            if (game.status !== "in_progress") {
                await transaction.rollback();
                return response.status(400).json({
                    error: "The game is not underway.",
                });
            }

            const effectiveSeconds =
                await MatchGameTimeService.getElapsedSeconds(
                    game,
                    transaction
                );
            if (effectiveSeconds >= Number(game.duration) * 60) {
                await transaction.rollback();
                return response.status(400).json({ error: "The game time has expired." });
            }

            const team = await MatchTeams.findOne({
                where: {
                    id: team_id,
                    match_id: match.id,
                },
                transaction,
            });

            if (!team) {
                await transaction.rollback();
                return response.status(404).json({
                    error: "Team not found in this match",
                });
            }

            let eventPlayerId = player_id;
            let substitutedPlayerId = null;

            if (event_type === "substitution") {
                if (player_out_id === player_in_id) {
                    await transaction.rollback();
                    return response.status(400).json({
                        error: "The outgoing and incoming players must be different.",
                    });
                }

                const playerOut = await MatchPlayers.findOne({
                    where: {
                        match_id: match.id,
                        team_id,
                        player_id: player_out_id,
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });

                const playerIn = await MatchPlayers.findOne({
                    where: {
                        match_id: match.id,
                        team_id,
                        player_id: player_in_id,
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });

                if (!playerOut || !playerIn) {
                    await transaction.rollback();
                    return response.status(404).json({
                        error: "Both players must belong to this team in the match.",
                    });
                }

                if (playerOut.is_reserve || !playerIn.is_reserve) {
                    await transaction.rollback();
                    return response.status(400).json({
                        error: "The outgoing player must be active and the incoming player must be a reserve.",
                    });
                }

                const expelledPlayer = await MatchEvents.findOne({
                    where: {
                        match_id: match.id,
                        game_id: game.id,
                        event_type: "red_card",
                        player_id: [player_out_id, player_in_id],
                    },
                    transaction,
                });

                if (expelledPlayer) {
                    await transaction.rollback();
                    return response.status(400).json({
                        error: "A player sent off cannot take part in a substitution.",
                    });
                }

                await playerOut.update(
                    { is_reserve: true },
                    { transaction }
                );
                await playerIn.update(
                    { is_reserve: false },
                    { transaction }
                );

                eventPlayerId = player_out_id;
                substitutedPlayerId = player_in_id;
            } else {
                const matchPlayer = await MatchPlayers.findOne({
                    where: {
                        match_id: match.id,
                        team_id,
                        player_id,
                    },
                    transaction,
                });

                if (!matchPlayer) {
                    await transaction.rollback();
                    return response.status(404).json({
                        error: "Player not selected for this team",
                    });
                }

                if (["goal", "own_goal", "assist"].includes(event_type) && matchPlayer.is_reserve) {
                    await transaction.rollback();
                    return response.status(400).json({
                        error: "A reserve player cannot score or assist while off the field.",
                    });
                }

                const expelled = await MatchEvents.findOne({
                    where: {
                        player_id,
                        match_id: match.id,
                        game_id: game.id,
                        event_type: "red_card",
                    },
                    transaction,
                });

                if (expelled) {
                    await transaction.rollback();
                    return response.status(400).json({
                        message:
                            "The player was sent off and can no longer participate in the game.",
                    });
                }
            }


            const eventData = {
                match_id: match.id,
                game_id: game.id,
                player_id: eventPlayerId,
                team_id,
                event_type,
                minute: Math.floor(effectiveSeconds / 60),
            };

            if (event_type === "substitution") {
                eventData.substituted_player_id = substitutedPlayerId;
            }

            const matchEvent = await MatchEvents.create(eventData, {
                transaction,
                fields: Object.keys(eventData),
            });

            await transaction.commit();
            return response.status(201).json(matchEvent);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

export default new MatchEventsController();
