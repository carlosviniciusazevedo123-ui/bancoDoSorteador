import * as Yup from "yup"
import PlayerEvaluations from "../Models/PlayerEvaluations.js"
import MatchEvaluator from "../Models/MatchEvaluator.js";
import MatchPlayers from "../Models/MatchPlayers.js";
import MatchEvaluatorSession from "../Models/MatchEvaluatorSessions.js";
import Player from "../Models/Player.js";

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

        const session = await MatchEvaluatorSession.findOne({
            where: {
                token: session_token
            },
            include: [
                {
                    model: MatchEvaluator,
                    as: 'matchEvaluator'
                }
            ]
        });

        if (!session) {
            return response.status(404).json({
                error: "Invalid evaluation link"
            });
        }
        const evaluator_id = session.player_id;
        const match_id = session.matchEvaluator.match_id;

        if (new Date(session.expires_at) <= new Date()) {
            return response.status(410).json({
                error: "The evaluation link has expired"
            });
        }

        const playedMatch = await MatchPlayers.findOne({
            where: {
                match_id,
                player_id: evaluator_id
            }
        });

        if (!playedMatch) {
            return response.status(400).json({
                error: "This player didn`t play in this match"
            });
        }

        const playedTheMatch = await MatchPlayers.findOne({
            where: {
                match_id,
                player_id: evaluated_player_id
            }
        });

        if (!playedTheMatch) {
            return response.status(400).json({
                error: "This player didn`t play in this match"
            });
        }

        if (evaluator_id === evaluated_player_id) {
            return response.status(400).json({
                error: "A player cannot evaluate himself."
            });
        }

        if (playedMatch.team_id !== playedTheMatch.team_id) {
            return response.status(400).json({
                error: "This player doesn't belong to this team."
            })
        }
        const findMatch = await PlayerEvaluations.findOne({
            where: {
                match_id,
                evaluator_id,
                evaluated_player_id
            }
        });

        if (findMatch) {
            return response.status(400).json({
                error: "This player has already rated this player in this match."
            })
        }

        const evaluatedPlayer = await Player.findOne({
            where: {
                id: evaluated_player_id
            }
        });

        if (!evaluatedPlayer) {
            return response.status(404).json({
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
        });
        
        return response.status(201).json(evaluation);
    }


}

export default new PlayerEvaluationsController();