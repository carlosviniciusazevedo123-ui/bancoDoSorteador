"use strict";

/** @type {import('sequelize-cli').Migration} */

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("match_games", {
            id: {
                primaryKey: true,
                allowNull: false,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
            },

            match_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "matches",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },

            team_a_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "match_teams",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },

            team_b_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "match_teams",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },

            round: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },

            duration: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },

            status: {
                type: Sequelize.ENUM(
                    "pending",
                    "in_progress",
                    "paused",
                    "finished"
                ),
                allowNull: false,
                defaultValue: "pending",
            },

            winner_team_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: "match_teams",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            },

            started_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },

            finished_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },

            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal(
                    "CURRENT_TIMESTAMP"
                ),
            },

            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal(
                    "CURRENT_TIMESTAMP"
                ),
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("match_games");
    },
};