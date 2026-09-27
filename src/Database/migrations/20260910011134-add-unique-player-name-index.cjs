
'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {

    async up(queryInterface) {

        await queryInterface.sequelize.query(`
            CREATE UNIQUE INDEX players_user_id_lower_name_unique
            ON players (user_id, LOWER(name));
        `);

    },

    async down(queryInterface) {

        await queryInterface.sequelize.query(`
            DROP INDEX IF EXISTS players_user_id_lower_name_unique;
        `);

    },

};

