import * as Yup from "yup";

import Matches from "../Models/Matches.js";
import MatchGames from "../Models/MatchGames.js";
import MatchGameCreateService from "../Services/MatchGameCreateService.js";
import MatchGameTimeService from "../Services/MatchGameTimeService.js";

class MatchGameController {
    async index(request, response) {
        const schema = Yup.object({
            match_id: Yup.string()
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

        const { match_id } = request.params;

        const match = await Matches.findByPk(match_id);

        if (!match) {
            return response.status(404).json({
                error: "Match not found",
            });
        }

        if (match.user_id !== request.userId) {
            return response.status(403).json({
                error: "You do not have permission to view this match",
            });
        }

        const games = await MatchGames.findAll({
            where: {
                match_id: match.id,
            },
            attributes: [
                "id",
                "match_id",
                "team_a_id",
                "team_b_id",
                "round",
                "duration",
                "status",
                "winner_team_id",
                "started_at",
                "finished_at",
                "created_at",
                "updated_at",
            ],
            include: [
                {
                    association: "teamA",
                    attributes: ["id", "name"],
                },
                {
                    association: "teamB",
                    attributes: ["id", "name"],
                },
                {
                    association: "winner",
                    attributes: ["id", "name"],
                },
            ],
            order: [
                ["round", "ASC"],
                ["created_at", "ASC"],
            ],
        });

        return response.status(200).json(games);
    }

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
