import Database from "../../Database/index.js";
import Draw from "../Models/Draw.js";
import DrawTeam from "../Models/DrawTeam.js";
import DrawPlayer from "../Models/DrawPlayer.js";
import Matches from "../Models/Matches.js";
import MatchTeams from "../Models/MatchTeams.js";
import MatchPlayers from "../Models/MatchPlayers.js";
import MatchGames from "../Models/MatchGames.js";
import Player from "../Models/Player.js";
import AppError from "../Errors/AppError.js";

class MatchCreateService {
    async create({
        userId,
        drawId,
        drawTeamAId,
        drawTeamBId,
        round,
        duration,
    }) {
        const transaction = await Database.connection.transaction();

        try {
            if (drawTeamAId === drawTeamBId) {
                throw new AppError("A team cannot play against itself.");
            }

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
                    id: [drawTeamAId, drawTeamBId],
                },
                order: [["team_number", "ASC"]],
                transaction,
            });

            if (drawTeams.length !== 2) {
                throw new AppError(
                    "Both selected teams must belong to this draw."
                );
            }

            const drawPlayers = await DrawPlayer.findAll({
                where: {
                    draw_id: draw.id,
                    team_id: drawTeams.map((team) => team.id),
                },
                include: [
                    {
                        model: Player,
                        as: "player",
                    },
                ],
                transaction,
            });

            const selectedIds = new Set();
            for (const team of drawTeams) {
                const roster = drawPlayers.filter(row => row.team_id === team.id);
                const starters = roster.filter(row => !row.is_reserve && (!draw.consider_goalkeepers || !row.is_goalkeeper));
                const reserves = roster.filter(row => row.is_reserve);
                const goalkeepers = roster.filter(row => !row.is_reserve && row.is_goalkeeper);
                if (starters.length !== draw.players_per_team ||
                    reserves.length !== (draw.has_reserve ? draw.reserve_per_team : 0) ||
                    (draw.consider_goalkeepers && goalkeepers.length !== 1)) {
                    throw new AppError("The draw roster is incomplete. Draw the teams again.");
                }
                for (const row of roster) {
                    if (!row.player || selectedIds.has(row.player_id)) {
                        throw new AppError("The draw roster is invalid. Draw the teams again.");
                    }
                    selectedIds.add(row.player_id);
                }
            }
            const match = await Matches.create(
                { user_id: userId },
                { transaction }
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
                    { transaction }
                );

                matchTeams.push({ drawTeam, matchTeam });
            }

            for (const drawPlayer of drawPlayers) {
                if (!drawPlayer.player) {
                    throw new AppError(
                        "One or more players from the draw were not found."
                    );
                }

                const matchTeam = matchTeams.find(
                    ({ drawTeam }) => drawTeam.id === drawPlayer.team_id
                )?.matchTeam;

                if (!matchTeam) {
                    throw new AppError(
                        "A selected player has an invalid team."
                    );
                }

                await MatchPlayers.create(
                    {
                        match_id: match.id,
                        team_id: matchTeam.id,
                        player_id: drawPlayer.player_id,
                        player_name: drawPlayer.player.name,
                        overall_rating: drawPlayer.player.overall_rating,
                        number: drawPlayer.number,
                        is_reserve: drawPlayer.is_reserve,
                        is_goalkeeper: drawPlayer.is_goalkeeper,
                        minutes_player: 0,
                    },
                    { transaction }
                );
            }

            const matchTeamA = matchTeams.find(
                ({ drawTeam }) => drawTeam.id === drawTeamAId
            ).matchTeam;
            const matchTeamB = matchTeams.find(
                ({ drawTeam }) => drawTeam.id === drawTeamBId
            ).matchTeam;

            await MatchGames.create(
                {
                    match_id: match.id,
                    team_a_id: matchTeamA.id,
                    team_b_id: matchTeamB.id,
                    round,
                    duration,
                },
                { transaction }
            );

            const result = await Matches.findByPk(match.id, {
                include: [
                    {
                        association: "teams",
                        include: [{ association: "players" }],
                    },
                    { association: "games" },
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
