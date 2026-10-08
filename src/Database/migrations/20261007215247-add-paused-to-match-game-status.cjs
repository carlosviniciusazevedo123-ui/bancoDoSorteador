'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_match_games_status"
      ADD VALUE IF NOT EXISTS 'paused';
    `);
  },

  async down() {
    // O PostgreSQL não remove um valor de enum com segurança.
  },
};