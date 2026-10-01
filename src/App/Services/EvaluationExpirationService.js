import { Op } from "sequelize";
import MatchEvaluator from "../Models/MatchEvaluator.js";
import Matches from "../Models/Matches.js";
import MatchPlayers from "../Models/MatchPlayers.js";
import PlayerEvaluations from "../Models/PlayerEvaluations.js";
import Player from "../Models/Player.js";
import updateRating from "./RatingService.js"

class EvaluationExpirationService {

    isRunning = false;

    async checkEvaluations() {

        if (this.isRunning === true) {
            return;
        }
        this.isRunning = true;
        try {

            const evaluators = await MatchEvaluator.findAll({
                where: {
                    expires_at: {
                        [Op.lte]: new Date()
                    },
                    used_at: null
                },
                include: [
                    {
                        model: Matches,
                        as: "match"
                    }
                ]
            });


            for (const evaluator of evaluators) {

                const match = evaluator.match;


                const matchPlayers = await MatchPlayers.findAll({
                    where: {
                        match_id: match.id
                    }
                });


                const playerEvaluations = await PlayerEvaluations.findAll({
                    where: {
                        match_id: match.id
                    }
                });


                for (const matchPlayer of matchPlayers) {


                    const possibleEvaluators = matchPlayers.filter((player) => {
                        return (
                            player.team_id === matchPlayer.team_id &&
                            player.player_id !== matchPlayer.player_id
                        );
                    });


                    if (possibleEvaluators.length === 0) {
                        continue;
                    }

                    const receivedEvaluations = playerEvaluations.filter((evaluation) => {
                        return (
                            evaluation.evaluated_player_id === matchPlayer.player_id &&
                            possibleEvaluators.some((player) =>
                                player.player_id === evaluation.evaluator_id
                            ) && (
                                evaluation.attack !== null ||
                                evaluation.defense !== null ||
                                evaluation.passing !== null ||
                                evaluation.finishing !== null ||
                                evaluation.speed !== null ||
                                evaluation.decision_making !== null
                            )
                        );
                    });

                    const evaluationWeight =
                        receivedEvaluations.length / possibleEvaluators.length;


                    const totals = receivedEvaluations.reduce((acc, evaluation) => {


                        if (evaluation.attack !== null) {
                            acc.attack += Number(evaluation.attack);
                            acc.attackCount++;
                        }


                        if (evaluation.defense !== null) {
                            acc.defense += Number(evaluation.defense);
                            acc.defenseCount++;
                        }


                        if (evaluation.passing !== null) {
                            acc.passing += Number(evaluation.passing);
                            acc.passingCount++;
                        }


                        if (evaluation.finishing !== null) {
                            acc.finishing += Number(evaluation.finishing);
                            acc.finishingCount++;
                        }


                        if (evaluation.speed !== null) {
                            acc.speed += Number(evaluation.speed);
                            acc.speedCount++;
                        }


                        if (evaluation.decision_making !== null) {
                            acc.decision_making += Number(evaluation.decision_making);
                            acc.decisionMakingCount++;
                        }

                        return acc;

                    }, {

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
                        decisionMakingCount: 0

                    });

                    const averages = {

                        attack: totals.attackCount > 0
                            ? Number((totals.attack / totals.attackCount).toFixed(1))
                            : null,

                        defense: totals.defenseCount > 0
                            ? Number((totals.defense / totals.defenseCount).toFixed(1))
                            : null,

                        passing: totals.passingCount > 0
                            ? Number((totals.passing / totals.passingCount).toFixed(1))
                            : null,

                        finishing: totals.finishingCount > 0
                            ? Number((totals.finishing / totals.finishingCount).toFixed(1))
                            : null,

                        speed: totals.speedCount > 0
                            ? Number((totals.speed / totals.speedCount).toFixed(1))
                            : null,

                        decision_making: totals.decisionMakingCount > 0
                            ? Number((totals.decision_making / totals.decisionMakingCount).toFixed(1))
                            : null,
                    };

                    const ratedPlayer = await Player.findByPk(
                        matchPlayer.player_id,
                    );

                    if (!ratedPlayer) {
                        continue;
                    }

                    await updateRating(
                        ratedPlayer,
                        averages,
                        evaluationWeight
                    );
                }
                await evaluator.update({
                    used_at: new Date()
                });
            }


        } finally {
            this.isRunning = false
        }

    }
}

export default new EvaluationExpirationService();