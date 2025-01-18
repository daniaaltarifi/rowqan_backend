const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');

const FeaturesChalet = sequelize.define('FeaturesChalet', {
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
  tableName:'FeaturesChalet'
});




module.exports = FeaturesChalet;
