const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');
const User = require('../Models/UsersModel');
const Chalet = require('../Models/ChaletsModel');
const RightTime = require('../Models/RightTimeModel');
const Status = require('./StatusModel');

const Reservations_Chalets = sequelize.define('Reservations_Chalets', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cashback: {
    type: DataTypes.FLOAT,
    allowNull: true, 
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,  
  },
  end_date:{
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  Time:{
    type: DataTypes.STRING,
    allowNull: true,
  },
  status:{
    type: DataTypes.STRING,
    allowNull: true,
  },
  Reservation_Type:{
    type: DataTypes.STRING,
    allowNull: false,
  },
  starting_price:{
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  Total_Amount:{
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  additional_visitors: {
    type: DataTypes.INTEGER,
    allowNull: false, 
  },
  number_of_days: {
    type: DataTypes.INTEGER,
    allowNull: false,  
  },
  lang: {
    type: DataTypes.ENUM('ar', 'en'),
    allowNull: false, 
  },
}, {
  tableName: 'Reservations_Chalets',
  timestamps: false,
});


User.hasMany(Reservations_Chalets, { foreignKey: 'user_id' });
Reservations_Chalets.belongsTo(User, { foreignKey: 'user_id'});


Chalet.hasMany(Reservations_Chalets, { foreignKey: 'chalet_id'});
Reservations_Chalets.belongsTo(Chalet, { foreignKey: 'chalet_id'});


RightTime.hasMany(Reservations_Chalets, { foreignKey: 'right_time_id', });
Reservations_Chalets.belongsTo(RightTime, { foreignKey: 'right_time_id'});



module.exports = Reservations_Chalets;