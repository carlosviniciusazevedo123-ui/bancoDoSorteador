import * as Yup from "yup";

import MatchGames from "../Models/MatchGames.js";
import Matches from "../Models/Matches.js";
import MatchPauses from "../Models/MatchPauses.js";

class MatchPausesController {
    async pause(request, response) {
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
            return response.status(400).json({
                error: error.errors,
            });
        }

        let transaction;
        try {
            transaction = await MatchPauses.sequelize.transaction();

            const match = await Matches.findOne({
                where: {
                    id: request.params.match_id,
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

            const game = await MatchGames.findOne({
                where: {
                    id: request.params.game_id,
                    match_id: match.id,
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!game) {
                await transaction.rollback();

                return response.status(404).json({
                    error: "Game not found",
                });
            }

            if (game.status !== "in_progress") {
                await transaction.rollback();

                return response.status(400).json({
                    error: "The game is not in progress",
                });
            }

            const openPause = await MatchPauses.findOne({
                where: {
                    game_id: game.id,
                    finished_at: null,
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (openPause) {
                await transaction.rollback();

                return response.status(409).json({
                    error: "The game already has an open pause",
                });
            }

            const pause = await MatchPauses.create(
                {
                    game_id: game.id,
                    started_at: new Date(),
                },
                {
                    transaction,
                }
            );

            await game.update(
                {
                    status: "paused",
                },
                {
                    transaction,
                }
            );

            await transaction.commit();

            return response.status(201).json(pause);
        } catch (error) {

            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }

            return response.status(500).json({
                error: "Erro interno",
            });
        }
    }

    async resume(request, response) {
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
            return response.status(400).json({
                error: error.errors,
            });
        }

        const transaction =
            await MatchPauses.sequelize.transaction();

        try {
            const match = await Matches.findOne({
                where: {
                    id: request.params.match_id,
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

            const game = await MatchGames.findOne({
                where: {
                    id: request.params.game_id,
                    match_id: match.id,
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!game) {
                await transaction.rollback();

                return response.status(404).json({
                    error: "Game not found",
                });
            }

            if (game.status !== "paused") {
                await transaction.rollback();

                return response.status(400).json({
                    error: "The game is not paused",
                });
            }

            const pause = await MatchPauses.findOne({
                where: {
                    game_id: game.id,
                    finished_at: null,
                },
                order: [["started_at", "DESC"]],
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!pause) {
                await transaction.rollback();

                return response.status(409).json({
                    error: "No open pause was found for this game",
                });
            }

            await pause.update(
                {
                    finished_at: new Date(),
                },
                {
                    transaction,
                }
            );

            await game.update(
                {
                    status: "in_progress",
                },
                {
                    transaction,
                }
            );

            await transaction.commit();

            return response.status(200).json(pause);
        } catch (error) {
            
            await transaction.rollback();

            return response.status(500).json({
                error: "Erro interno",
            });
        }
    }
}

export default new MatchPausesController();
