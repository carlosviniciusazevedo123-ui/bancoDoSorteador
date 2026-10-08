"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("match_events", "substituted_player_id", {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: "players",
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn(
            "match_events",
            "substituted_player_id"
        );
    },
};
