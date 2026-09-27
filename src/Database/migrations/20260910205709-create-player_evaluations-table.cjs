'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('player_evaluations', {

      id: {
        primaryKey: true,
        allowNull: false,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },

      match_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'matches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      evaluator_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'players',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      evaluated_player_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'players',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      attack: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      },

      defense: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      },

      passing: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      },

      finishing: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      },

      speed: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      },

      decision_making: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

    });

    await queryInterface.addIndex(
      'player_evaluations',
      ['match_id', 'evaluator_id', 'evaluated_player_id'],
      {
        unique: true,
        name: 'unique_player_evaluation_per_match',
      }
    );
  },

  async down(queryInterface) {

    await queryInterface.dropTable('player_evaluations');

  },
};