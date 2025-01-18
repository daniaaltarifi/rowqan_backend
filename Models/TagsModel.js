const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');

const Tags = sequelize.define('Tags', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    TagName:{
        type:DataTypes.STRING,
        allowNull:false
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
  

  
  module.exports = Tags;
