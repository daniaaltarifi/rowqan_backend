const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');
const ReservationDate = require('../Models/ReservationDatesModel');

const RightTimeModel = sequelize.define('RightTimeModel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type_of_time: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  from_time: {
    type: DataTypes.STRING, 
    allowNull: false,
  },
  to_time: {
    type: DataTypes.STRING, 
    allowNull: false,
  },
  lang: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: { 
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  After_Offer:{
    type: DataTypes.FLOAT,
    allowNull: true,
  }
}, {
  timestamps: false,
});

RightTimeModel.hasMany(ReservationDate, { foreignKey: 'right_time_id', onDelete: 'CASCADE' });
ReservationDate.belongsTo(RightTimeModel, { foreignKey: 'right_time_id' });

module.exports = RightTimeModel;
