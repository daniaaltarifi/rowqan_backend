const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');

const AdditionalFeatures = sequelize.define('AdditionalFeatures', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  FeatureName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lang: {
    type: DataTypes.STRING, 
    allowNull: false, 
  },
  
}, {
  timestamps: false,
  tableName:'AdditionalFeatures'
});




module.exports = AdditionalFeatures;
