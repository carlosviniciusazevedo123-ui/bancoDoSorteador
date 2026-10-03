
import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    vi,
} from "vitest";

import MatchDrawService from "../src/App/Services/MatchDrawService.js";
import Player from "../src/App/Models/Player.js";
import Matches from "../src/App/Models/Matches.js";
import MatchTeams from "../src/App/Models/MatchTeams.js";
import MatchPlayers from "../src/App/Models/MatchPlayers.js";

import "../src/Database/index.js";

describe("MatchDrawService", () => {
    const userId = "a8bbc2a4-bde6-49e2-aded-d69555a0f9ef";

    let createdPlayers = [];
    let createdMatches = [];
    let playerFindAllSpy = null;

    beforeEach(() => {
        createdPlayers = [];
        createdMatches = [];
        playerFindAllSpy = null;
    });

    afterEach(async () => {
        if (playerFindAllSpy) {
            playerFindAllSpy.mockRestore();
            playerFindAllSpy = null;
        }

        await MatchPlayers.destroy({
            where: {
                match_id: createdMatches.map((match) => match.id),
            },
        });

        await MatchTeams.destroy({
            where: {
                match_id: createdMatches.map((match) => match.id),
            },
        });

        await Matches.destroy({
            where: {
                id: createdMatches.map((match) => match.id),
            },
        });

        await Player.destroy({
            where: {
                id: createdPlayers.map((player) => player.id),
            },
        });
    });

    async function createPlayer({
        name,
        overall_rating,
        is_goalkeeper = false,
    }) {
        const player = await Player.create({
            user_id: userId,
            name,
            overall_rating,
            is_goalkeeper,
        });

        createdPlayers.push(player);

        return player;
    }

    async function createMatchWithTeams(numberOfTeams = 2) {
        const match = await Matches.create({
            user_id: userId,
            name: "Teste",
            how_many_teams: numberOfTeams,
            players_per_team: 1,
            has_reserve: false,
            reserve_per_team: 0,
            consider_goalkeepers: false,
            duration: 60,
        });

        createdMatches.push(match);

        const teams = [];

        for (let index = 0; index < numberOfTeams; index++) {
            const team = await MatchTeams.create({
                match_id: match.id,
                name: `Time ${index + 1}`,
                team_number: index + 1,
            });

            teams.push(team);
        }

        return {
            match,
            teams,
        };
    }

    function mockPlayersForThisTest() {
        playerFindAllSpy = vi
            .spyOn(Player, "findAll")
            .mockResolvedValue(createdPlayers);
    }

    it("deve impedir o sorteio quando não houver goleiros suficientes", async () => {
        const { match } = await createMatchWithTeams(2);

        await createPlayer({
            name: "Jogador 1",
            overall_rating: 80,
            is_goalkeeper: false,
        });

        await createPlayer({
            name: "Jogador 2",
            overall_rating: 75,
            is_goalkeeper: false,
        });

        await createPlayer({
            name: "Goleiro 1",
            overall_rating: 80,
            is_goalkeeper: true,
        });

        mockPlayersForThisTest();

        const config = {
            match,
            howManyTeams: 2,
            playersPerTeam: 1,
            hasReserve: false,
            reservePerTeam: 0,
            considerGoalkeepers: true,
        };

        await expect(
            MatchDrawService.draw(config)
        ).rejects.toThrow("There aren't enough goalkeepers.");
    });

    it("deve impedir o sorteio quando não houver jogadores suficientes", async () => {
        const { match } = await createMatchWithTeams(2);

        await createPlayer({
            name: "Jogador 1",
            overall_rating: 80,
        });

        await createPlayer({
            name: "Jogador 2",
            overall_rating: 70,
        });

        mockPlayersForThisTest();

        const config = {
            match,
            howManyTeams: 2,
            playersPerTeam: 2,
            hasReserve: false,
            reservePerTeam: 0,
            considerGoalkeepers: false,
        };

        await expect(
            MatchDrawService.draw(config)
        ).rejects.toThrow("There aren't enough players.");
    });

    it("deve realizar o sorteio", async () => {
        const { match } = await createMatchWithTeams(2);

        await createPlayer({
            name: "Jogador 1",
            overall_rating: 90,
        });

        await createPlayer({
            name: "Jogador 2",
            overall_rating: 80,
        });

        mockPlayersForThisTest();

        const config = {
            match,
            howManyTeams: 2,
            playersPerTeam: 1,
            hasReserve: false,
            reservePerTeam: 0,
            considerGoalkeepers: false,
        };

        const result = await MatchDrawService.draw(config);

        expect(result).toHaveLength(2);

        expect(
            result.every((matchPlayer) => {
                return matchPlayer.match_id === match.id;
            })
        ).toBe(true);
    });

    it("deve impedir um novo sorteio quando não houver jogadores disponíveis", async () => {
        const { match, teams } = await createMatchWithTeams(2);

        const player1 = await createPlayer({
            name: "Jogador 1",
            overall_rating: 90,
        });

        const player2 = await createPlayer({
            name: "Jogador 2",
            overall_rating: 80,
        });

        await MatchPlayers.create({
            match_id: match.id,
            player_id: player1.id,
            team_id: teams[0].id,
            is_reserve: false,
            number: 2,
        });

        await MatchPlayers.create({
            match_id: match.id,
            player_id: player2.id,
            team_id: teams[1].id,
            is_reserve: false,
            number: 2,
        });

        mockPlayersForThisTest();

        const config = {
            match,
            howManyTeams: 2,
            playersPerTeam: 1,
            hasReserve: false,
            reservePerTeam: 0,
            considerGoalkeepers: false,
        };

        await expect(
            MatchDrawService.draw(config)
        ).rejects.toThrow(
            "There are no more roster spots for outfield players, and no more goalkeepers to add."
        );
    });

    it("deve preencher as reservas em um segundo sorteio", async () => {
        const { match, teams } = await createMatchWithTeams(2);

        const player1 = await createPlayer({
            name: "Jogador 1",
            overall_rating: 90,
        });

        const player2 = await createPlayer({
            name: "Jogador 2",
            overall_rating: 80,
        });

        await createPlayer({
            name: "Jogador 3",
            overall_rating: 70,
        });

        await createPlayer({
            name: "Jogador 4",
            overall_rating: 60,
        });

        await MatchPlayers.create({
            match_id: match.id,
            player_id: player1.id,
            team_id: teams[0].id,
            is_reserve: false,
            number: 2,
        });

        await MatchPlayers.create({
            match_id: match.id,
            player_id: player2.id,
            team_id: teams[1].id,
            is_reserve: false,
            number: 2,
        });

        mockPlayersForThisTest();

        const config = {
            match,
            howManyTeams: 2,
            playersPerTeam: 1,
            hasReserve: true,
            reservePerTeam: 1,
            considerGoalkeepers: false,
        };

        const result = await MatchDrawService.draw(config);

        expect(result).toHaveLength(4);

        const reserves = result.filter((matchPlayer) => {
            return matchPlayer.is_reserve;
        });

        expect(reserves).toHaveLength(2);
    });
});
