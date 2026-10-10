
import Sequelize from "sequelize";
import crypto from "node:crypto";
import * as Yup from "yup";

import Matches from "../Models/Matches.js";
import MatchEvaluator from "../Models/MatchEvaluator.js";
import MatchPlayers from "../Models/MatchPlayers.js";
import Player from "../Models/Player.js";
import PlayerEvaluations from "../Models/PlayerEvaluations.js";
import MatchEvaluatorSession from "../Models/MatchEvaluatorSessions.js"



class MatchEvaluatorController {

    async store(request, response) {

        const paramsSchema = Yup.object({
            match_id: Yup.string()
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

        const { match_id } = request.params;

        // Verifica se a partida existe e pertence ao usuário.
        const match = await Matches.findOne({
            where: {
                id: match_id,
                user_id: request.userId,
            },
        });

        if (!match) {
            return response.status(404).json({
                error: "Match not found",
            });
        }

        // Só pode gerar o link depois que a partida terminar.
        if (match.status !== "finished") {
            return response.status(400).json({
                error: "An evaluation link can only be generated after the match has finished",
            });
        }

        // Verifica se já existe um link para essa partida.
        const existingEvaluator = await MatchEvaluator.findOne({
            where: {
                match_id,
            },
        });

        if (existingEvaluator) {

             if (existingEvaluator.used_at !== null) {
            return response.status(410).json({
                error: "The evaluation period for this match has ended",
            });
        }

            // Se o link ainda estiver válido, devolve o mesmo link.
            if (new Date(existingEvaluator.expires_at) > new Date()) {
                return response.status(200).json({
                    id: existingEvaluator.id,
                    token: existingEvaluator.token,
                    expires_at: existingEvaluator.expires_at,
                });
            }

            return response.status(410).json({
                error: "The evaluation period for this match has expired"
            })


        }

        // Token aleatório seguro.
        const token = crypto.randomBytes(32).toString("base64url");

        // Link válido por 10 minutos.
        const expiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        );

        const evaluator = await MatchEvaluator.create({
            match_id,
            token,
            expires_at: expiresAt,
        });

        return response.status(201).json({
            id: evaluator.id,
            token: evaluator.token,
            expires_at: evaluator.expires_at,
        });
    }

    async show(request, response) {

        const paramsSchema = Yup.object({
            token: Yup.string()
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

        const { token } = request.params;

        const evaluator = await MatchEvaluator.findOne({
            where: {
                token,
            },
        });

        if (!evaluator) {
            return response.status(404).json({
                error: "Invalid evaluation link",
            });
        }

        // Verifica se o link expirou.
        if (new Date(evaluator.expires_at) <= new Date()) {
            return response.status(410).json({
                error: "The evaluation link has expired",
            });
        }

        if (evaluator.used_at !== null) {
            return response.status(410).json({
                error: "The evaluation period for this match has ended",
            });
        }

        return response.status(200).json({
            match_id: evaluator.match_id,
            expires_at: evaluator.expires_at,
        });
    }

    async identifyPlayer(request, response) {

        const paramsSchema = Yup.object({
            token: Yup.string()
                .required(),
        });

        const bodySchema = Yup.object({
            name: Yup.string()
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

        const { token } = request.params;
        const name = request.body.name.trim();

        // 1. Procura o link de avaliação.
        const evaluator = await MatchEvaluator.findOne({
            where: {
                token,
            },
        });

        if (!evaluator) {
            return response.status(404).json({
                error: "Invalid evaluation link",
            });
        }

        // 2. Verifica se o link ainda está dentro dos 10 minutos.
        if (new Date(evaluator.expires_at) <= new Date()) {
            return response.status(410).json({
                error: "The evaluation link has expired",
            });
        }
        if (evaluator.used_at !== null) {
            return response.status(410).json({
                error: "The evaluation period for this match has ended",
            });
        }

        // 3. Busca a partida.
        const match = await Matches.findByPk(
            evaluator.match_id
        );

        if (!match) {
            return response.status(404).json({
                error: "Match not found",
            });
        }

        // 4. Procura o jogador pelo nome,
        //    mas somente dentro do usuário dono da partida.
        const player = await Player.findOne({
            where: {
                user_id: match.user_id,
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

        if (!player) {
            return response.status(404).json({
                error: "Player not found",
            });
        }

        // 5. Verifica se o jogador participou desta partida.
        const matchPlayer = await MatchPlayers.findOne({
            where: {
                match_id: match.id,
                player_id: player.id,
            },
        });

        if (!matchPlayer) {
            return response.status(403).json({
                error: "This player did not participate in this match",
            });
        }

        const uniqueSession = await MatchEvaluatorSession.findOne({
            where: {
                player_id: player.id,
                match_evaluator_id: evaluator.id,
            },
        });

        let session;

        if (uniqueSession) {
            if (new Date(uniqueSession.expires_at) > new Date()) {
                session = uniqueSession;
            } else {
                const sessionToken = crypto.randomBytes(32).toString("base64url");

                session = await uniqueSession.update({
                    token: sessionToken,
                    expires_at: evaluator.expires_at,
                });
            }
        } else {
            const sessionToken = crypto.randomBytes(32).toString("base64url");

            session = await MatchEvaluatorSession.create({
                player_id: player.id,
                match_evaluator_id: evaluator.id,
                token: sessionToken,
                expires_at: evaluator.expires_at,
            });
        }

        // 6. Busca os jogadores do mesmo time.
        const teammates = await MatchPlayers.findAll({
            where: {
                match_id: match.id,
                team_id: matchPlayer.team_id,
            },
            include: [
                {
                    model: Player,
                    as: "player",
                    attributes: [
                        "id",
                        "name",
                    ],
                },
            ],
        });

        // 7. Remove o próprio jogador da lista.
        const submitted = await PlayerEvaluations.findAll({
            where: { match_id: match.id, evaluator_id: player.id },
            attributes: ["evaluated_player_id"],
        });
        const alreadyEvaluated = new Set(submitted.map(row => row.evaluated_player_id));
        const playersToEvaluate = teammates
            .filter((matchPlayer) =>
                matchPlayer.player_id !== player.id && !alreadyEvaluated.has(matchPlayer.player_id)
            )
            .map((matchPlayer) => ({
                id: matchPlayer.player.id,
                name: matchPlayer.player.name,
            }));

        // 8. Retorna os jogadores que ele pode avaliar.
        return response.status(200).json({
            player: {
                id: player.id,
                name: player.name,
            },

            match_id: match.id,
            expires_at: evaluator.expires_at,
            players: playersToEvaluate,
            session_token: session.token
        });
    };

}

export default new MatchEvaluatorController();

