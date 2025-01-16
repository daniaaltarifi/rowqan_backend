const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');

const ChaletsDetails = sequelize.define('ChaletsDetails', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  Type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  value:{
    type: DataTypes.JSON,
    allowNull: false,
  },
  lang: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['ar', 'en']], 
    },
  },
}, {
  timestamps: false, 
});

module.exports = ChaletsDetails;
