const Sequelize = require("sequelize");

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable("draw_teams", {
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

            name: {
                type: Sequelize.STRING,
                allowNull: false,
            },

            team_number: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },

            score: {
                type: Sequelize.DECIMAL(3, 1),
                allowNull: false,
                defaultValue: 0,
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
        await queryInterface.dropTable("draw_teams");
    },
};