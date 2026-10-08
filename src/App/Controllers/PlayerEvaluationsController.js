import * as Yup from "yup"
import PlayerEvaluations from "../Models/PlayerEvaluations.js"
import MatchEvaluator from "../Models/MatchEvaluator.js";
import MatchPlayers from "../Models/MatchPlayers.js";
import MatchEvaluatorSession from "../Models/MatchEvaluatorSessions.js";
import Player from "../Models/Player.js";
import Database from "../../Database/index.js";

class PlayerEvaluationsController {
    async store(request, response) {
        const schema = Yup.object({
            attack: Yup.number().min(0).max(10).nullable().notRequired(),
            defense: Yup.number().min(0).max(10).nullable().notRequired(),
            passing: Yup.number().min(0).max(10).nullable().notRequired(),
            finishing: Yup.number().min(0).max(10).nullable().notRequired(),
            speed: Yup.number().min(0).max(10).nullable().notRequired(),
            decision_making: Yup.number().min(0).max(10).nullable().notRequired(),
            evaluated_player_id: Yup.string().uuid().required()
        });
        try {
            schema.validateSync(request.body, {
                abortEarly: false,
                strict: true,
            })
        } catch (error) {
            return response.status(400).json({
                error: error.errors,
            })
        }

        const { session_token } = request.params;

        const {
            evaluated_player_id,
            attack,
            defense,
            passing,
            finishing,
            speed,
            decision_making
        } = request.body;

        const result = await Database.connection.transaction(async (transaction) => {
            const reply = (status) => ({ json: (body) => ({ status, body }) });
            const session = await MatchEvaluatorSession.findOne({
                where: {
                    token: session_token
                },
                transaction,
            });

            if (!session) {
                return reply(404).json({
                    error: "Invalid evaluation link"
                });
            }
            // Use the same evaluator lock as expiration processing so accepted
            // evaluations commit before the final rating calculation can run.
            const evaluator = await MatchEvaluator.findByPk(session.match_evaluator_id, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!evaluator) {
                return reply(404).json({ error: "Invalid evaluation link" });
            }

            if (evaluator.used_at !== null) {
                return reply(410).json({
                    error: "The evaluation period for this match has ended",
                });
            }

            if (new Date(evaluator.expires_at) <= new Date()) {
                return reply(410).json({
                    error: "The evaluation link has expired",
                });
            }

            const evaluator_id = session.player_id;
            const match_id = evaluator.match_id;

            if (new Date(session.expires_at) <= new Date()) {
                return reply(410).json({
                    error: "The evaluation link has expired"
                });
            }

            const playedMatch = await MatchPlayers.findOne({
                where: {
                    match_id,
                    player_id: evaluator_id
                },
                transaction,
            });

            if (!playedMatch) {
                return reply(400).json({
                    error: "This player didn`t play in this match"
                });
            }

            const playedTheMatch = await MatchPlayers.findOne({
                where: {
                    match_id,
                    player_id: evaluated_player_id
                },
                transaction,
            });

            if (!playedTheMatch) {
                return reply(400).json({
                    error: "This player didn`t play in this match"
                });
            }

            if (evaluator_id === evaluated_player_id) {
                return reply(400).json({
                    error: "A player cannot evaluate himself."
                });
            }

            if (playedMatch.team_id !== playedTheMatch.team_id) {
                return reply(400).json({
                    error: "This player doesn't belong to this team."
                })
            }
            const findMatch = await PlayerEvaluations.findOne({
                where: {
                    match_id,
                    evaluator_id,
                    evaluated_player_id
                },
                transaction,
            });

            if (findMatch) {
                return reply(400).json({
                    error: "This player has already rated this player in this match."
                })
            }

            const evaluatedPlayer = await Player.findOne({
                where: {
                    id: evaluated_player_id
                },
                transaction,
            });

            if (!evaluatedPlayer) {
                return reply(404).json({
                    error: "Evaluated player not found"
                })
            }

            const evaluation = await PlayerEvaluations.create({
                match_id,
                evaluator_id,
                evaluated_player_id,
                attack,
                defense,
                passing,
                finishing,
                speed,
                decision_making
            }, { transaction });

            return reply(201).json(evaluation);
        });
        return response.status(result.status).json(result.body);
    }


}

export default new PlayerEvaluationsController();
