import { describe, it, expect } from "vitest";

import Matches from "../src/App/Models/Matches.js";
import MatchTeams from "../src/App/Models/MatchTeams.js";
import MatchDrawService from "../src/App/Services/MatchDrawService.js";
import Player from "../src/App/Models/Player.js";
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
describe("MatchDrawService", () => {
    it("deve impedir o sorteio quando não houver jogadores suficientes", async () => {


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
        const players = await Player.findAll({
            where: {
                user_id: match.user_id
            }
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
            considerGoalkeepers: false
        };

        await expect(
            MatchDrawService.draw(config)
        ).rejects.toThrow("There aren't enough players.");
    });

    it("deve realizar o sorteio", async () => {
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
            playersPerTeam: 1,
            hasReserve: false,
            reservePerTeam: 0,
            considerGoalkeepers: false
        };
        const result = await MatchDrawService.draw(config);

        expect(result).toHaveLength(2);
        const teamIds = result.map((item) => {
            return item.team_id;
        });
        const uniqueTeamIds = new Set(teamIds);
        expect(uniqueTeamIds.size).toBe(2);

        const matchIds = result.map((item) => {
            return item.match_id;
        });
        expect(
            matchIds.every((matchId) => {
                return matchId === config.match.id;
            })
        ).toBe(true)

    })

    it("deve impedir um novo sorteio quando não houver jogadores disponíveis", async () => {
        const match = await Matches.create({
            user_id: "a8bbc2a4-bde6-49e2-aded-d69555a0f9ef",
            duration: 10
        });

        const team1 = await MatchTeams.create({
            match_id: match.id,
            name: "Time 1",
            team_number: 1,
            score: 0
        });

        const team2 = await MatchTeams.create({
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
            playersPerTeam: 1,
            hasReserve: false,
            reservePerTeam: 0,
            considerGoalkeepers: false
        };

        await MatchDrawService.draw(config);

        await expect(
            MatchDrawService.draw(config)
        ).rejects.toThrow( "There are no more roster spots for outfield players, and no more goalkeepers to add.");
    });

});