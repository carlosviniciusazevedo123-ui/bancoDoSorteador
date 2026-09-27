import Player from "../Models/Player.js";
import MatchPlayers from "../Models/MatchPlayers.js";
import MatchTeams from "../Models/MatchTeams.js";

class MatchDrawService {
    async draw(config) {
        const players = await Player.findAll({
            where: {
                user_id: config.match.user_id
            }
        });

        const matchPlayers = await MatchPlayers.findAll({
            where: {
                match_id: config.match.id
            },
            include: [
                {
                    model: Player,
                    as: "player"
                }
            ]
        });

        const availablePlayers = players.filter((player) => {
            return !matchPlayers.some((matchPlayer) => {
                return matchPlayer.player_id === player.id;
            });
        });

        const reservePerTeam = config.hasReserve
            ? config.reservePerTeam
            : 0;

        const teams = await MatchTeams.findAll({
            where: {
                match_id: config.match.id
            }
        });

        if (teams.length !== config.howManyTeams) {
            throw new Error("The number of teams is invalid.");
        }

        const teamScores = [];

        teams.map((team) => {
            const playersInTeam = matchPlayers.filter((matchPlayer) => {
                return matchPlayer.team_id === team.id;
            });

            let sum = 0;

            for (let index = 0; index < playersInTeam.length; index++) {
                const element = playersInTeam[index];

                sum = sum + element.player.overall_rating;
            }

            let average;

            if (playersInTeam.length === 0) {
                average = 0;
            } else {
                average = sum / playersInTeam.length;
            }

            const isLinePlayer = (matchPlayer) => {
                return (
                    !config.considerGoalkeepers ||
                    !matchPlayer.is_goalkeeper
                );
            };

            const linePlayerCount = playersInTeam.filter((matchPlayer) => {
                return isLinePlayer(matchPlayer);
            }).length;

            const starterCount = playersInTeam.filter((matchPlayer) => {
                return (
                    isLinePlayer(matchPlayer) &&
                    !matchPlayer.is_reserve
                );
            }).length;

            const reserveCount = playersInTeam.filter((matchPlayer) => {
                return (
                    isLinePlayer(matchPlayer) &&
                    matchPlayer.is_reserve
                );
            }).length;

            const hasGoalkeeper = playersInTeam.some((matchPlayer) => {
                return matchPlayer.is_goalkeeper;
            });

            teamScores.push({
                teamId: team.id,
                score: average,
                sum: sum,
                playerCount: playersInTeam.length,
                linePlayerCount: linePlayerCount,
                starterCount: starterCount,
                reserveCount: reserveCount,
                hasGoalkeeper: hasGoalkeeper,
            });
        });

        const availableGoalkeepers = availablePlayers.filter((player) => {
            return player.is_goalkeeper;
        });

        let goalkeepersNeeded = [];

        if (config.considerGoalkeepers) {
            goalkeepersNeeded = teamScores.filter((teamScore) => {
                return !teamScore.hasGoalkeeper;
            });

            if (availableGoalkeepers.length < goalkeepersNeeded.length) {
                throw new Error("There aren't enough goalkeepers.");
            }
        }

        const totalStarterSlots = teamScores.reduce((total, teamScore) => {
            return total +
                (config.playersPerTeam - teamScore.starterCount);
        }, 0);

        const totalReserveSlots = teamScores.reduce((total, teamScore) => {
            return total +
                (reservePerTeam - teamScore.reserveCount);
        }, 0);

        const totalLineSlots =
            totalStarterSlots +
            totalReserveSlots;

        if (availablePlayers.length < totalLineSlots) {
            throw new Error("There aren't enough players.");
        }

        let outfieldPlayers;

        if (config.considerGoalkeepers) {
            outfieldPlayers = availablePlayers.filter((player) => {
                return !player.is_goalkeeper;
            });
        } else {
            outfieldPlayers = availablePlayers;
        }

        if (outfieldPlayers.length < totalLineSlots) {
            throw new Error("There aren't enough outfield players.");
        }

        outfieldPlayers.sort((a, b) => {
            return b.overall_rating - a.overall_rating;
        });

        for (let index = 0; index < totalLineSlots; index++) {
            const element = outfieldPlayers[index];

            let availableTeams = teamScores.filter((teamScore) => {
                return (
                    teamScore.starterCount <
                    config.playersPerTeam
                );
            });

            let isStarter = true;

            if (availableTeams.length === 0) {
                availableTeams = teamScores.filter((teamScore) => {
                    return (
                        teamScore.reserveCount <
                        reservePerTeam
                    );
                });

                isStarter = false;
            }

            const lowestScore = availableTeams.reduce(
                (smaller, current) => {
                    if (
                        current.score < smaller.score ||
                        (
                            current.score === smaller.score &&
                            current.linePlayerCount <
                            smaller.linePlayerCount
                        )
                    ) {
                        return current;
                    } else {
                        return smaller;
                    }
                },
                availableTeams[0]
            );

            const team = teams.find((team) => {
                return team.id === lowestScore.teamId;
            });

            await MatchPlayers.create({
                match_id: config.match.id,
                player_id: element.id,
                team_id: team.id,
                is_reserve: !isStarter,
                number: lowestScore.linePlayerCount + 2,
            });

            lowestScore.sum =
                lowestScore.sum + element.overall_rating;

            lowestScore.playerCount =
                lowestScore.playerCount + 1;

            lowestScore.linePlayerCount =
                lowestScore.linePlayerCount + 1;

            lowestScore.score =
                lowestScore.sum / lowestScore.playerCount;

            if (isStarter) {
                lowestScore.starterCount =
                    lowestScore.starterCount + 1;
            } else {
                lowestScore.reserveCount =
                    lowestScore.reserveCount + 1;
            }
        }

        for (let index = 0; index < goalkeepersNeeded.length; index++) {
            const teamScore = goalkeepersNeeded[index];

            const goalkeeper = availableGoalkeepers[index];

            const team = teams.find((team) => {
                return team.id === teamScore.teamId;
            });

            await MatchPlayers.create({
                match_id: config.match.id,
                player_id: goalkeeper.id,
                is_goalkeeper: true,
                team_id: team.id,
                number: 1,
            });

            teamScore.sum =
                teamScore.sum + goalkeeper.overall_rating;

            teamScore.playerCount =
                teamScore.playerCount + 1;

            teamScore.score =
                teamScore.sum / teamScore.playerCount;

            teamScore.hasGoalkeeper = true;
        }

        const result = await MatchPlayers.findAll({
            where: {
                match_id: config.match.id
            }
        });

        return result;
    }
}

export default new MatchDrawService();