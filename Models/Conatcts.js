
const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');

const Contacts = sequelize.define('Contacts', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lang: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false, 
  },
}, {
  timestamps: false,  
});

module.exports = Contacts;