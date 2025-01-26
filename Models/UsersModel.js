const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect'); 
const UserTypes = require('../Models/UsersTypes');
const Chalet = require('../Models/ChaletsModel'); 

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  phone_number: {
    type: DataTypes.STRING, 
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lang: {
    type: DataTypes.ENUM('ar', 'en'),
    allowNull: false,  
  },
  device_id: {
    type: DataTypes.JSON, 
    allowNull: true,
  },
  reset_token: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reset_token_expiration: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  chalet_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Chalet,
      key: 'id',
    },
  },
  user_type_id: { 
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: UserTypes,
      key: 'id',
    },
  },
}, {
  timestamps: false,
});



User.belongsTo(UserTypes, { foreignKey: 'user_type_id' });
UserTypes.hasMany(User, { foreignKey: 'user_type_id' });

module.exports = User;
