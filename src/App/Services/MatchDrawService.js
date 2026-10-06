
import Player from "../Models/Player.js";
import DrawPlayer from "../Models/DrawPlayer.js";
import DrawTeam from "../Models/DrawTeam.js";
import Draw from "../Models/Draw.js";
import Database from "../../Database/index.js";
import AppError from "../Errors/AppError.js";

class MatchDrawService {
    shufflePlayers(players) {
        for (let index = players.length - 1; index > 0; index--) {
            const randomIndex = Math.floor(
                Math.random() * (index + 1)
            );

            [players[index], players[randomIndex]] = [
                players[randomIndex],
                players[index],
            ];
        }

        return players;
    }

    sortPlayersByRating(players) {
        const playersByRating = new Map();

        for (const player of players) {
            const rating = Number(player.overall_rating);

            if (!playersByRating.has(rating)) {
                playersByRating.set(rating, []);
            }

            playersByRating.get(rating).push(player);
        }

        const sortedRatings = [...playersByRating.keys()].sort(
            (a, b) => b - a
        );

        const sortedPlayers = [];

        for (const rating of sortedRatings) {
            const playersWithSameRating = playersByRating.get(
                rating
            );

            this.shufflePlayers(playersWithSameRating);

            sortedPlayers.push(...playersWithSameRating);
        }

        return sortedPlayers;
    }

    async draw(config) {
        const transaction =
            await Database.connection.transaction();

        try {
            const draw = await Draw.findByPk(config.draw.id, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!draw) {
                throw new AppError(
                    "Player selection by draw is not possible at the moment."
                );
            }

            if (
                !Array.isArray(config.playerIds) ||
                config.playerIds.length === 0
            ) {
                throw new AppError(
                    "At least one player must be selected."
                );
            }

            if (
                new Set(config.playerIds).size !==
                config.playerIds.length
            ) {
                throw new AppError(
                    "Duplicate players were selected."
                );
            }

            const players = await Player.findAll({
                where: {
                    user_id: draw.user_id,
                    id: config.playerIds,
                },
                transaction,
            });

            if (
                players.length !== config.playerIds.length
            ) {
                throw new AppError(
                    "One or more selected players were not found."
                );
            }

            const drawPlayers = await DrawPlayer.findAll({
                where: {
                    draw_id: draw.id,
                },
                include: [
                    {
                        model: Player,
                        as: "player",
                    },
                ],
                transaction,
            });

            const availablePlayers = players.filter(
                (player) => {
                    return !drawPlayers.some(
                        (drawPlayer) => {
                            return (
                                drawPlayer.player_id ===
                                player.id
                            );
                        }
                    );
                }
            );

            const reservePerTeam = config.hasReserve
                ? config.reservePerTeam
                : 0;

            const teams = await DrawTeam.findAll({
                where: {
                    draw_id: draw.id,
                },
                transaction,
            });

            if (
                teams.length !== config.howManyTeams
            ) {
                throw new AppError(
                    "The number of teams is invalid."
                );
            }

            const teamScores = [];

            teams.map((team) => {
                const playersInTeam = drawPlayers.filter(
                    (drawPlayer) => {
                        return (
                            drawPlayer.team_id ===
                            team.id
                        );
                    }
                );

                let sum = 0;

                for (
                    let index = 0;
                    index < playersInTeam.length;
                    index++
                ) {
                    const drawPlayer =
                        playersInTeam[index];

                    const player = drawPlayer.player;

                    if (player) {
                        sum =
                            sum +
                            Number(
                                player.overall_rating
                            );
                    }
                }

                let average;

                if (playersInTeam.length === 0) {
                    average = 0;
                } else {
                    average =
                        sum / playersInTeam.length;
                }

                const isLinePlayer = (drawPlayer) => {
                    return (
                        !config.considerGoalkeepers ||
                        !drawPlayer.is_goalkeeper
                    );
                };

                const linePlayerCount =
                    playersInTeam.filter(
                        (drawPlayer) => {
                            return isLinePlayer(
                                drawPlayer
                            );
                        }
                    ).length;

                const starterCount =
                    playersInTeam.filter(
                        (drawPlayer) => {
                            return (
                                isLinePlayer(
                                    drawPlayer
                                ) &&
                                !drawPlayer.is_reserve
                            );
                        }
                    ).length;

                const reserveCount =
                    playersInTeam.filter(
                        (drawPlayer) => {
                            return (
                                isLinePlayer(
                                    drawPlayer
                                ) &&
                                drawPlayer.is_reserve
                            );
                        }
                    ).length;

                const hasGoalkeeper =
                    playersInTeam.some(
                        (drawPlayer) => {
                            return (
                                drawPlayer.is_goalkeeper
                            );
                        }
                    );

                teamScores.push({
                    teamId: team.id,
                    score: average,
                    sum: sum,
                    playerCount:
                        playersInTeam.length,
                    linePlayerCount:
                        linePlayerCount,
                    starterCount:
                        starterCount,
                    reserveCount:
                        reserveCount,
                    hasGoalkeeper:
                        hasGoalkeeper,
                });
            });

            const availableGoalkeepers =
                availablePlayers.filter((player) => {
                    return player.is_goalkeeper;
                });

            let goalkeepersNeeded = [];

            if (config.considerGoalkeepers) {
                goalkeepersNeeded =
                    teamScores.filter((teamScore) => {
                        return !teamScore.hasGoalkeeper;
                    });

                if (
                    availableGoalkeepers.length <
                    goalkeepersNeeded.length
                ) {
                    throw new AppError(
                        "There aren't enough goalkeepers."
                    );
                }
            }

            const totalStarterSlots =
                teamScores.reduce(
                    (total, teamScore) => {
                        return (
                            total +
                            (config.playersPerTeam -
                                teamScore.starterCount)
                        );
                    },
                    0
                );

            const totalReserveSlots =
                teamScores.reduce(
                    (total, teamScore) => {
                        return (
                            total +
                            (reservePerTeam -
                                teamScore.reserveCount)
                        );
                    },
                    0
                );

            const totalLineSlots =
                totalStarterSlots + totalReserveSlots;

            if (
                availablePlayers.length <
                totalLineSlots
            ) {
                throw new AppError(
                    "There aren't enough players."
                );
            }

            if (
                totalLineSlots === 0 &&
                goalkeepersNeeded.length === 0
            ) {
                throw new AppError(
                    "There are no more roster spots for outfield players, and no more goalkeepers to add."
                );
            }

            let outfieldPlayers;

            if (config.considerGoalkeepers) {
                outfieldPlayers =
                    availablePlayers.filter((player) => {
                        return !player.is_goalkeeper;
                    });
            } else {
                outfieldPlayers = availablePlayers;
            }

            if (
                outfieldPlayers.length <
                totalLineSlots
            ) {
                throw new AppError(
                    "There aren't enough outfield players."
                );
            }

            /*
             * Mantém os jogadores com maior overall
             * como prioridade.
             *
             * Quando dois ou mais jogadores possuem
             * o mesmo overall, eles são embaralhados
             * entre si para evitar um sorteio
             * determinístico.
             */
            outfieldPlayers =
                this.sortPlayersByRating(
                    outfieldPlayers
                );

            for (
                let index = 0;
                index < totalLineSlots;
                index++
            ) {
                const player = outfieldPlayers[index];

                let availableTeams =
                    teamScores.filter((teamScore) => {
                        return (
                            teamScore.starterCount <
                            config.playersPerTeam
                        );
                    });

                let isStarter = true;

                if (availableTeams.length === 0) {
                    availableTeams =
                        teamScores.filter(
                            (teamScore) => {
                                return (
                                    teamScore.reserveCount <
                                    reservePerTeam
                                );
                            }
                        );

                    isStarter = false;
                }

                const lowestScore =
                    availableTeams.reduce(
                        (smaller, current) => {
                            if (
                                current.score <
                                    smaller.score ||
                                (current.score ===
                                    smaller.score &&
                                    current.linePlayerCount <
                                        smaller.linePlayerCount)
                            ) {
                                return current;
                            }

                            return smaller;
                        },
                        availableTeams[0]
                    );

                const team = teams.find((team) => {
                    return (
                        team.id ===
                        lowestScore.teamId
                    );
                });

                await DrawPlayer.create(
                    {
                        draw_id: draw.id,
                        player_id: player.id,
                        team_id: team.id,
                        is_reserve: !isStarter,
                        number:
                            lowestScore.linePlayerCount +
                            2,
                    },
                    {
                        transaction,
                    }
                );

                lowestScore.sum =
                    lowestScore.sum +
                    Number(player.overall_rating);

                lowestScore.playerCount =
                    lowestScore.playerCount + 1;

                lowestScore.linePlayerCount =
                    lowestScore.linePlayerCount + 1;

                lowestScore.score =
                    lowestScore.sum /
                    lowestScore.playerCount;

                if (isStarter) {
                    lowestScore.starterCount =
                        lowestScore.starterCount + 1;
                } else {
                    lowestScore.reserveCount =
                        lowestScore.reserveCount + 1;
                }
            }

            for (
                let index = 0;
                index < goalkeepersNeeded.length;
                index++
            ) {
                const teamScore =
                    goalkeepersNeeded[index];

                const goalkeeper =
                    availableGoalkeepers[index];

                const team = teams.find((team) => {
                    return (
                        team.id ===
                        teamScore.teamId
                    );
                });

                await DrawPlayer.create(
                    {
                        draw_id: draw.id,
                        player_id: goalkeeper.id,
                        is_goalkeeper: true,
                        team_id: team.id,
                        number: 1,
                    },
                    {
                        transaction,
                    }
                );

                teamScore.sum =
                    teamScore.sum +
                    Number(
                        goalkeeper.overall_rating
                    );

                teamScore.playerCount =
                    teamScore.playerCount + 1;

                teamScore.score =
                    teamScore.sum /
                    teamScore.playerCount;

                teamScore.hasGoalkeeper = true;
            }

            for (const teamScore of teamScores) {
                const team = teams.find((team) => {
                    return (
                        team.id ===
                        teamScore.teamId
                    );
                });

                await team.update(
                    {
                        score: teamScore.score,
                    },
                    {
                        transaction,
                    }
                );
            }

            const result = await DrawPlayer.findAll({
                where: {
                    draw_id: draw.id,
                },
                transaction,
            });

            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

export default new MatchDrawService();
