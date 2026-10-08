import Database from "../../Database/index.js";
import MatchGames from "../Models/MatchGames.js";
import Matches from "../Models/Matches.js";
import MatchGameTimeService from "./MatchGameTimeService.js";
import MatchFinishService from "./MatchFinishService.js";

class MatchGameExpirationService {
    isRunning = false;

    async checkGames() {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;

        try {
            const games = await MatchGames.findAll({
                attributes: ["id"],
                where: { status: "in_progress" },
            });

            for (const game of games) {
                await this.processGame(game.id);
            }
        } finally {
            this.isRunning = false;
        }
    }

    async processGame(gameId) {
        const transaction = await Database.connection.transaction();

        try {
            const gameSnapshot = await MatchGames.findByPk(gameId, {
                transaction,
            });

            if (!gameSnapshot) {
                await transaction.rollback();
                return;
            }

            const match = await Matches.findByPk(gameSnapshot.match_id, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            const game = await MatchGames.findByPk(gameId, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (
                !match ||
                match.status !== "in_progress" ||
                !game ||
                game.status !== "in_progress" ||
                !(await MatchGameTimeService.isFinished(game, transaction))
            ) {
                await transaction.rollback();
                return;
            }

            await game.update(
                {
                    status: "finished",
                    finished_at: new Date(),
                    winner_team_id: null,
                },
                { transaction }
            );

            const gameCount = await MatchGames.count({
                where: { match_id: match.id },
                transaction,
            });

            if (gameCount === 1) {
                await MatchFinishService.finish(match, transaction);
            } else {
                const unfinishedGames = await MatchGames.count({
                    where: {
                        match_id: match.id,
                        status: ["pending", "in_progress", "paused"],
                    },
                    transaction,
                });

                if (unfinishedGames === 0) {
                    await MatchFinishService.finish(match, transaction);
                }
            }

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

export default new MatchGameExpirationService();
