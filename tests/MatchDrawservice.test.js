import { describe, it, expect } from "vitest";

import Matches from "../src/App/Models/Matches.js";
import MatchTeams from "../src/App/Models/MatchTeams.js";
import MatchDrawService from "../src/App/Services/MatchDrawService.js";
import "../src/Database/index.js";

describe("MatchDrawService", () => {
    it("deve impedir o sorteio quando não houver goleiros suficientes", async () => {

        const match = await Matches.create({
            user_id: "a8bbc2a4-bde6-49e2-aded-d69555a0f9ef",
            duration: 10
        });

        await MatchTeams.create({
            match_id: match.id,
            name: "Time 1",
            team_number: 1,
            score: 0
        });

        await MatchTeams.create({
            match_id: match.id,
            name: "Time 2",
            team_number: 2,
            score: 0
        });

        const config = {
            match: {
                id: match.id,
                user_id: match.user_id
            },
            howManyTeams: 2,
            playersPerTeam: 4,
            hasReserve: false,
            reservePerTeam: 0,
            considerGoalkeepers: true
        };

        await expect(
            MatchDrawService.draw(config)
        ).rejects.toThrow("There aren't enough goalkeepers.");
    });
});