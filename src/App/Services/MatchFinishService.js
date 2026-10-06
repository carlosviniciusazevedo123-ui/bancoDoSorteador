import Matches from "../Models/Matches.js";
import MatchEvaluationService from "./MatchEvaluationService.js";
import Database from "../../Database/index.js";

class MatchFinishService {
    async finish(match) {
        const transaction =
            await Database.connection.transaction();

        try {
            const currentMatch = await Matches.findByPk(
                match.id,
                {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                }
            );

            if (!currentMatch) {
                await transaction.rollback();
                return false;
            }

            if (currentMatch.status !== "in_progress") {
                await transaction.rollback();
                return false;
            }

            const finishedAt = new Date();

            await currentMatch.update(
                {
                    status: "finished",
                    finished_at: finishedAt,
                },
                {
                    transaction,
                }
            );

            await MatchEvaluationService.evaluate(
                currentMatch,
                transaction
            );

            await transaction.commit();

            return true;
        } catch (error) {
            await transaction.rollback();

            throw error;
        }
    }
}

export default new MatchFinishService();