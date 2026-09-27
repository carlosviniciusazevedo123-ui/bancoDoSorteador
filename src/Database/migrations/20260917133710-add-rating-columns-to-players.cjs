'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'players',
      'overall_rating', {
      type: Sequelize.DECIMAL(3, 1),
      allowNull: false,
    }),
      await queryInterface.addColumn(
        'players',
        'attack', {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      }),
      await queryInterface.addColumn(
        'players',
        'defense', {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      }),
      await queryInterface.addColumn(
        'players',
        'passing', {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      }),
      await queryInterface.addColumn(
        'players',
        'finishing', {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      }),
      await queryInterface.addColumn(
        'players',
        'speed', {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      }
      ),
      await queryInterface.addColumn(
        'players',
        'decision_making', {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      }
      );

  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      'players',
      'overall_rating',
    );
    await queryInterface.removeColumn(
      'players',
      'attack',
    );
    await queryInterface.removeColumn(
      'players',
      'defense',
    );
    await queryInterface.removeColumn(
      'players',
      'passing',
    );
    await queryInterface.removeColumn(
      'players',
      'finishing',
    );
    await queryInterface.removeColumn(
      'players',
      'speed',
    );
    await queryInterface.removeColumn(
      'players',
      'decision_making',
    );
  }
};
