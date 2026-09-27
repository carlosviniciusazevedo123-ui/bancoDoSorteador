'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'match_evaluators',
      'evaluator_player_id',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'players',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      'match_evaluators',
      'evaluator_player_id');

  }
};
