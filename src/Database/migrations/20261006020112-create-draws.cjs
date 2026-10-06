const Sequelize = require("sequelize");

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable("draws", {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: Sequelize.UUIDV4,
            },

            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "users",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },

            how_many_teams: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },

            players_per_team: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },

            has_reserve: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            reserve_per_team: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },

            consider_goalkeepers: {
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
        await queryInterface.dropTable("draws");
    },
};