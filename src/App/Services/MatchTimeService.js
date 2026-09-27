
import MatchPauses from '../Models/MatchPauses.js';
import MatchFinishService from './MatchFinishService.js';

class MatchTimeService {

    async getEffectiveTime(match) {

        if (!match.started_at) {
            return 0;
        }

        const startTime =
            new Date(match.started_at).getTime();

        // Se já terminou, usamos finished_at.
        // Caso contrário, usamos o horário atual.
        const endTime =
            match.finished_at
                ? new Date(match.finished_at).getTime()
                : Date.now();

        const elapsedMilliseconds =
            endTime - startTime;

        const pauses = await MatchPauses.findAll({
            where: {
                match_id: match.id,
            },
            order: [['started_at', 'ASC']],
        });

        let pausedMilliseconds = 0;

        for (const pause of pauses) {

            const pauseStartedAt =
                new Date(pause.started_at).getTime();

            const pauseFinishedAt =
                pause.finished_at
                    ? new Date(pause.finished_at).getTime()
                    : Date.now();

            pausedMilliseconds +=
                pauseFinishedAt - pauseStartedAt;
        }

        const effectiveMilliseconds =
            elapsedMilliseconds - pausedMilliseconds;

        return Math.max(0, effectiveMilliseconds);
    }

    async getEffectiveSeconds(match) {

        const milliseconds =
            await this.getEffectiveTime(match);

        return Math.floor(milliseconds / 1000);
    }

    async getEffectiveMinutes(match) {

        const seconds =
            await this.getEffectiveSeconds(match);

        return Math.floor(seconds / 60);
    }

    async isFinished(match) {

        if (!match.started_at) {
            return false;
        }

        const effectiveSeconds =
            await this.getEffectiveSeconds(match);

        const durationSeconds =
            match.duration * 60;

        return effectiveSeconds >= durationSeconds;
    }

    async finishIfExpired(match) {

        if (match.status !== 'in_progress') {
            return false;
        }

        const finished =
            await this.isFinished(match);

        if (!finished) {
            return false;
        }

        const finishMatch = await MatchFinishService.finish(match);

        return (finishMatch);
    }
}

export default new MatchTimeService();

