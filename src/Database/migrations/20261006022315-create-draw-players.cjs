const Sequelize = require("sequelize");

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable("draw_players", {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: Sequelize.UUIDV4,
            },

            draw_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "draws",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },

            team_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "draw_teams",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },

            player_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "players",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },

            number: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },

            is_reserve: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            is_goalkeeper: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },

            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("draw_players");
    },
};