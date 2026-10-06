import Matches from "../Models/Matches.js";
import MatchTeams from "../Models/MatchTeams.js";
import MatchPlayers from "../Models/MatchPlayers.js";

import Draw from "../Models/Draw.js";
import DrawTeam from "../Models/DrawTeam.js";
import DrawPlayer from "../Models/DrawPlayer.js";
import Player from "../Models/Player.js";

import Database from "../../Database/index.js";
import AppError from "../Errors/AppError.js";

class MatchCreateService {
    async create({ drawId, userId }) {
        const transaction =
            await Database.connection.transaction();

        try {
            const draw = await Draw.findOne({
                where: {
                    id: drawId,
                    user_id: userId,
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!draw) {
                throw new AppError("Draw not found.", 404);
            }

            const drawTeams = await DrawTeam.findAll({
                where: {
                    draw_id: draw.id,
                },
                order: [["team_number", "ASC"]],
                transaction,
            });

            if (drawTeams.length === 0) {
                throw new AppError("Draw has no teams.", 400);
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

            if (drawPlayers.length === 0) {
                throw new AppError("Draw has no players.", 400);
            }

            const match = await Matches.create(
                {
                    user_id: userId,
                },
                {
                    transaction,
                }
            );

            const matchTeams = [];

            for (const drawTeam of drawTeams) {
                const matchTeam = await MatchTeams.create(
                    {
                        match_id: match.id,
                        name: drawTeam.name,
                        team_number: drawTeam.team_number,
                        score: drawTeam.score,
                    },
                    {
                        transaction,
                    }
                );

                matchTeams.push({
                    drawTeam,
                    matchTeam,
                });
            }

            for (const drawPlayer of drawPlayers) {
                if (!drawPlayer.player) {
                    throw new AppError(
                        "One or more players from the draw were not found.",
                        400
                    );
                }

                const matchTeam = matchTeams.find(
                    ({ drawTeam }) =>
                        drawTeam.id === drawPlayer.team_id
                );

                if (!matchTeam) {
                    throw new AppError(
                        "One or more players from the draw have an invalid team.",
                        400
                    );
                }

                await MatchPlayers.create(
                    {
                        match_id: match.id,
                        team_id: matchTeam.matchTeam.id,
                        player_id: drawPlayer.player_id,
                        player_name: drawPlayer.player.name,
                        overall_rating:
                            drawPlayer.player.overall_rating,
                        number: drawPlayer.number,
                        is_reserve: drawPlayer.is_reserve,
                        is_goalkeeper:
                            drawPlayer.is_goalkeeper,
                        minutes_player: 0,
                    },
                    {
                        transaction,
                    }
                );
            }

            const result = await Matches.findOne({
                where: {
                    id: match.id,
                },
                include: [
                    {
                        model: MatchTeams,
                        as: "teams",
                        include: [
                            {
                                model: MatchPlayers,
                                as: "players",
                            },
                        ],
                    },
                ],
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

export default new MatchCreateService();