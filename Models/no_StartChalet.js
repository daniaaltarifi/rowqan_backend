const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');
const Chalets = require('../Models/ChaletsModel');


const number_stars = sequelize.define('number_stars', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  no_start: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'number_stars',
});


number_stars.belongsTo(Chalets, { foreignKey: 'chalet_id', targetKey: 'id' });


Chalets.hasMany(number_stars, { foreignKey: 'chalet_id', sourceKey: 'id' });

module.exports = number_stars;
