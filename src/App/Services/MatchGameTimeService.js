import Matches from "../Models/Matches.js";
import MatchGames from "../Models/MatchGames.js";
import MatchPauses from "../Models/MatchPauses.js";

class MatchGameTimeService {
    async getElapsedTime(game) {
        if (!game.started_at) {
            return 0;
        }

        const startTime =
            new Date(game.started_at).getTime();

        const endTime = game.finished_at
            ? new Date(game.finished_at).getTime()
            : Date.now();

        const elapsedMilliseconds =
            endTime - startTime;

        const pauses = await MatchPauses.findAll({
            where: {
                game_id: game.id,
            },
            order: [["started_at", "ASC"]],
        });

        let pausedMilliseconds = 0;

        for (const pause of pauses) {
            const pauseStartedAt =
                new Date(pause.started_at).getTime();

            const pauseFinishedAt = pause.finished_at
                ? new Date(
                    pause.finished_at
                ).getTime()
                : Date.now();

            pausedMilliseconds +=
                pauseFinishedAt - pauseStartedAt;
        }

        const effectiveMilliseconds =
            elapsedMilliseconds - pausedMilliseconds;

        return Math.max(
            0,
            effectiveMilliseconds
        );
    }

    async getElapsedSeconds(game) {
        const milliseconds =
            await this.getElapsedTime(game);

        return Math.floor(
            milliseconds / 1000
        );
    }

    async getElapsedMinutes(game) {
        const seconds =
            await this.getElapsedSeconds(game);

        return Math.floor(
            seconds / 60
        );
    }

    async isFinished(game) {
        if (!game.started_at) {
            return false;
        }

        const elapsedSeconds =
            await this.getElapsedSeconds(game);

        const durationSeconds =
            game.duration * 60;

        return elapsedSeconds >= durationSeconds;
    }

    async getGameTime({
        matchId,
        gameId,
        userId,
    }) {
        const match = await Matches.findOne({
            where: {
                id: matchId,
                user_id: userId,
            },
        });

        if (!match) {
            throw new Error(
                "Match not found."
            );
        }

        const game = await MatchGames.findOne({
            where: {
                id: gameId,
                match_id: match.id,
            },
        });

        if (!game) {
            throw new Error(
                "Game not found."
            );
        }

        const seconds =
            await this.getElapsedSeconds(game);

        const minutes =
            await this.getElapsedMinutes(game);

        const finished =
            await this.isFinished(game);

        return {
            ...game.toJSON(),
            elapsed_seconds: seconds,
            elapsed_minutes: minutes,
            time_finished: finished,
        };
    }
}

export default new MatchGameTimeService();