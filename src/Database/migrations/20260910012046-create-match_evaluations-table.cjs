'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('match_evaluations', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
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
      evaluator_player_id: {
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
      rating: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

    });
    await queryInterface.addConstraint('match_evaluations', {
      fields: [
        'match_id',
        'evaluator_player_id',
        'evaluated_player_id',
      ],
      type: 'unique',
      name: 'match_evaluations_unique_evaluation',
    }
    );
    // Garante que a nota esteja entre 0 e 10. 

    await queryInterface.addConstraint('match_evaluations', {
      fields: ['rating'],
      type: 'check',
      name: 'match_evaluations_rating_check',
      where: {
        rating: {
          [Sequelize.Op.gte]: 0,
          [Sequelize.Op.lte]: 10,
        },
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('match_evaluations');
  },

};