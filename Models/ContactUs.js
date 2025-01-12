const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');

const ContactUs = sequelize.define('ContactUs', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  First_Name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  Last_Name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  EmailAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  Phone_Number:{
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  Address:{
    type: DataTypes.STRING,
    allowNull: false,
  },
  Messages:{
    type: DataTypes.TEXT,
    allowNull: false,
  },
  lang: {
    type: DataTypes.STRING, 
    allowNull: false, 
  },
  
}, {
  timestamps: false,
  tableName:'ContactUs'
});




module.exports = ContactUs;
