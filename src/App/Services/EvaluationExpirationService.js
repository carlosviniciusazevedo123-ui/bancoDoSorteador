import { Op } from "sequelize";
import Database from "../../Database/index.js";
import MatchEvaluator from "../Models/MatchEvaluator.js";
import Matches from "../Models/Matches.js";
import MatchPlayers from "../Models/MatchPlayers.js";
import PlayerEvaluations from "../Models/PlayerEvaluations.js";
import Player from "../Models/Player.js";
import updateRating from "./RatingService.js";

class EvaluationExpirationService {
    isRunning = false;

    async checkEvaluations() {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;

        try {
            const evaluators = await MatchEvaluator.findAll({
                attributes: ["id"],
                where: {
                    expires_at: { [Op.lte]: new Date() },
                    used_at: null,
                },
            });

            for (const evaluator of evaluators) {
                await this.processEvaluator(evaluator.id);
            }
        } finally {
            this.isRunning = false;
        }
    }

    async processEvaluator(evaluatorId) {
        const transaction = await Database.connection.transaction();

        try {
            // The row lock and used_at check make this safe across processes.
            const evaluator = await MatchEvaluator.findByPk(evaluatorId, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (
                !evaluator ||
                evaluator.used_at !== null ||
                new Date(evaluator.expires_at) > new Date()
            ) {
                await transaction.rollback();
                return;
            }

            const match = await Matches.findByPk(evaluator.match_id, {
                transaction,
            });

            if (!match) {
                await evaluator.update(
                    { used_at: new Date() },
                    { transaction }
                );
                await transaction.commit();
                return;
            }

            const matchPlayers = await MatchPlayers.findAll({
                where: { match_id: match.id },
                transaction,
            });

            const playerEvaluations = await PlayerEvaluations.findAll({
                where: { match_id: match.id },
                transaction,
            });

            for (const matchPlayer of matchPlayers) {
                const possibleEvaluators = matchPlayers.filter(
                    (player) =>
                        player.team_id === matchPlayer.team_id &&
                        player.player_id !== matchPlayer.player_id
                );

                if (possibleEvaluators.length === 0) {
                    continue;
                }

                const receivedEvaluations = playerEvaluations.filter(
                    (evaluation) =>
                        evaluation.evaluated_player_id === matchPlayer.player_id &&
                        possibleEvaluators.some(
                            (player) => player.player_id === evaluation.evaluator_id
                        ) && [
                            evaluation.attack,
                            evaluation.defense,
                            evaluation.passing,
                            evaluation.finishing,
                            evaluation.speed,
                            evaluation.decision_making,
                        ].some((value) => value !== null)
                );

                const evaluationWeight =
                    receivedEvaluations.length / possibleEvaluators.length;

                const totals = receivedEvaluations.reduce(
                    (result, evaluation) => {
                        const attributes = [
                            ["attack", "attackCount"],
                            ["defense", "defenseCount"],
                            ["passing", "passingCount"],
                            ["finishing", "finishingCount"],
                            ["speed", "speedCount"],
                            ["decision_making", "decisionMakingCount"],
                        ];

                        for (const [attribute, count] of attributes) {
                            if (evaluation[attribute] !== null) {
                                result[attribute] += Number(evaluation[attribute]);
                                result[count]++;
                            }
                        }

                        return result;
                    },
                    {
                        attack: 0,
                        defense: 0,
                        passing: 0,
                        finishing: 0,
                        speed: 0,
                        decision_making: 0,
                        attackCount: 0,
                        defenseCount: 0,
                        passingCount: 0,
                        finishingCount: 0,
                        speedCount: 0,
                        decisionMakingCount: 0,
                    }
                );

                const averages = {
                    attack: this.average(totals.attack, totals.attackCount),
                    defense: this.average(totals.defense, totals.defenseCount),
                    passing: this.average(totals.passing, totals.passingCount),
                    finishing: this.average(totals.finishing, totals.finishingCount),
                    speed: this.average(totals.speed, totals.speedCount),
                    decision_making: this.average(
                        totals.decision_making,
                        totals.decisionMakingCount
                    ),
                };

                const ratedPlayer = await Player.findByPk(
                    matchPlayer.player_id,
                    { transaction }
                );

                if (ratedPlayer) {
                    await updateRating(
                        ratedPlayer,
                        averages,
                        evaluationWeight,
                        transaction
                    );
                }
            }

            await evaluator.update(
                { used_at: new Date() },
                { transaction }
            );
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    average(total, count) {
        return count > 0 ? Number((total / count).toFixed(1)) : null;
    }
}

export default new EvaluationExpirationService();
