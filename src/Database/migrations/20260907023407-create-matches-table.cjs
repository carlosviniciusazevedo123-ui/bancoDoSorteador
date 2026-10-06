"use strict";

/** @type {import('sequelize-cli').Migration} */

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("matches", {
            id: {
                primaryKey: true,
                allowNull: false,
                type: Sequelize.UUID,
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

            finished_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },

            status: {
                type: Sequelize.ENUM(
                    "pending",
                    "in_progress",
                    "finished"
                ),
                allowNull: false,
                defaultValue: "pending",
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
        await queryInterface.dropTable("matches");
    },
};