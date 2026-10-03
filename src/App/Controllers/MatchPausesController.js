import * as Yup from 'yup';
import Matches from '../Models/Matches.js';
import MatchPauses from '../Models/MatchPauses.js';


class MatchPausesController {

    async pause(request, response) {
        const paramsSchema = Yup.object({
            id: Yup.string().uuid().required(),
        });

        try {
            paramsSchema.validateSync(
                request.params, {
                abortEarly: false,
                strict: true,
            });
        } catch (error) { return response.status(400).json({ error: error.errors, }); }

        const transaction = await MatchPauses.sequelize.transaction();

        try {
            const match = await Matches.findOne({
                where: {
                    id: request.params.id,
                    user_id: request.userId,
                },
                transaction, lock: transaction.LOCK.UPDATE,
            });

            if (!match) {
                await transaction.rollback();

                return response.status(404).json({ error: 'Match not found', });

            } if (match.status !== 'in_progress') {

                await transaction.rollback();

                return response.status(400).json({
                    error: 'The match is not in progress',
                });
            }

            const openPause = await MatchPauses.findOne({
                where: {
                    match_id: match.id,
                    finished_at: null,
                },
                transaction, lock: transaction.LOCK.UPDATE,
            });

            if (openPause) {

                await transaction.rollback();
                return response.status(409).json({ error: 'The match already has an open pause', }

                );
            }

            const pause = await MatchPauses.create({
                match_id: match.id,
                started_at: new Date(),
            }, { transaction, });
            await match.update({ status: 'paused', }, { transaction, });
            await transaction.commit();

            return response.status(201).json(pause);

        } catch (error) {

            await transaction.rollback();

            return response.status(500).json({ error: 'Erro interno', });
        }
    }
    async resume(request, response) {

        const paramsSchema = Yup.object({
            id: Yup.string().uuid().required(),
        }
        );

        try {
            paramsSchema.validateSync(request.params, {
                abortEarly: false,
                strict: true,
            });

        } catch (error) {

            return response.status(400).json({ error: error.errors, });
        }

        const transaction = await MatchPauses.sequelize.transaction();

        try {
            const match = await Matches.findOne({
                where: {
                    id: request.params.id,
                    user_id: request.userId,
                },
                transaction, lock: transaction.LOCK.UPDATE,
            }
            );

            if (!match) {
                await transaction.rollback();

                return response.status(404).json({ error: 'Match not found', }

                );

            } if (match.status !== 'paused') {
                await transaction.rollback();
                return response.status(400).json({
                    error: 'The match is not paused',
                }
                );
            }

            const pause = await MatchPauses.findOne({
                where: {
                    match_id: match.id,
                    finished_at: null,
                },
                order: [['started_at', 'DESC']],

                transaction, lock: transaction.LOCK.UPDATE,
            }
            );

            if (!pause) {
                await transaction.rollback();

                return response.status(409).json({
                    error: 'No open pause was found for this match',
                }
                );
            }
            await pause.update({ finished_at: new Date(), }, { transaction, });

            await match.update({
                status: 'in_progress',
            }, { transaction, });
            await transaction.commit();

            return response.status(200).json(pause);
        } catch (error) {

            await transaction.rollback();

            response.status(500).json({ error: 'Erro interno', });
        }
    }
}
export default new MatchPausesController();
