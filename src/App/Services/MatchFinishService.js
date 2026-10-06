import Matches from "../Models/Matches.js";
import MatchEvaluationService from "./MatchEvaluationService.js";
import Database from "../../Database/index.js";

class MatchFinishService {
    async finish(match, existingTransaction = null) {
        const ownsTransaction = !existingTransaction;
        const transaction = existingTransaction ||
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
                if (ownsTransaction) await transaction.rollback();
                return false;
            }

            if (currentMatch.status !== "in_progress") {
                if (ownsTransaction) await transaction.rollback();
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

            if (ownsTransaction) await transaction.commit();

            return true;
        } catch (error) {
            if (ownsTransaction) await transaction.rollback();

            throw error;
        }
    }
}

export default new MatchFinishService();
