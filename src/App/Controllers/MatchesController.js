
import * as Yup from "yup";

import Matches from "../Models/Matches.js";
import User from "../Models/User.js";
import MatchTimeServices from "../Services/MatchTimeService.js";
import MatchFinishService from "../Services/MatchFinishService.js";

class MatchesController {

    async store(request, response) {

        const schema = Yup.object({
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

        const { duration } = request.body;
        const user_id = request.userId;

        const user = await User.findByPk(user_id);

        if (!user) {

            return response.status(404).json({
                error: "Usuário não encontrado",
            });
        }

        const match = await Matches.create({
            user_id,
            duration,
        });

        return response.status(201).json(match);
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
        });

        if (!match) {

            return response.status(404).json({
                error: "Partida não encontrada",
            });
        }

        const effectiveSeconds =
            await MatchTimeServices.getEffectiveSeconds(match);

        const effectiveMinutes =
            Math.floor(effectiveSeconds / 60);

        const timeFinished =
            await MatchTimeServices.isFinished(match);

        return response.status(200).json({
            ...match.toJSON(),
            effective_seconds: effectiveSeconds,
            effective_minutes: effectiveMinutes,
            time_finished: timeFinished,
        });
    }


    async update(request, response) {

        const paramsSchema = Yup.object({
            id: Yup.string()
                .uuid()
                .required(),
        });

        const bodySchema = Yup.object({
            duration: Yup.number()
                .integer()
                .positive()
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

        const { id } = request.params;

        const match = await Matches.findOne({
            where: {
                id,
                user_id: request.userId,
            },
        });

        if (!match) {

            return response.status(404).json({
                error: "Partida não encontrada",
            });
        }

        if (match.status !== "pending") {

            return response.status(400).json({
                error: "A duração só pode ser alterada antes do início da partida",
            });
        }

        await match.update({
            duration: request.body.duration,
        });

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
                error: "Partida não encontrada",
            });
        }

        await match.destroy();

        return response.status(204).send();
    }


    async start(request, response) {

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

        try {

            const match = await Matches.findOne({
                where: {
                    id,
                    user_id: request.userId,
                },
            });

            if (!match) {

                return response.status(404).json({
                    error: "Partida não encontrada",
                });
            }

            if (match.status !== "pending") {

                return response.status(400).json({
                    error: "A partida não pode ser iniciada",
                });
            }

            await match.update({
                status: "in_progress",
                started_at: new Date(),
            });

            return response.status(200).json(match);

        } catch (error) {

            return response.status(500).json({
                error: "Erro interno",
            });
        }
    }


    async finish(request, response) {

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
                error: "Partida não encontrada",
            });
        }

        if (match.status === "finished") {

            return response.status(400).json({
                error: "A partida já foi finalizada",
            });
        }

        if (match.status === "pending") {

            return response.status(400).json({
                error: "A partida ainda não foi iniciada",
            });
        }

        if (match.status === "paused") {

            return response.status(400).json({
                error: "A partida está pausada. Retome a partida antes de finalizá-la",
            });
        }

        await MatchFinishService.finish(match);

        return response.status(200).json(match);
    }
}

export default new MatchesController();

