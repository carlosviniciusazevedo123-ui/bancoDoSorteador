import Sequelize, { Model } from 'sequelize';

class MatchPauses extends Model {
    static init(sequelize) {
        super.init({
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: Sequelize.UUIDV4
            },
            match_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            started_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            finished_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            tableName: 'match_pauses',
            timestamps: true,
            underscored: true,
        });
        return this;
    }
    static associate(models) {
        this.belongsTo(models.Matches, {
            foreignKey: 'match_id',
            as: 'match',
        });
    }
}

export default MatchPauses;
