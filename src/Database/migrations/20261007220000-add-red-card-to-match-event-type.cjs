"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TYPE "enum_match_events_event_type"
            ADD VALUE IF NOT EXISTS 'red_card';
        `);
    },

    async down() {
        // PostgreSQL não remove valores de enum com segurança.
    },
};
