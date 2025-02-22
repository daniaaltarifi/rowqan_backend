const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');
const RightTimeModel = require('../Models/RightTimeModel'); 

const NewModel = sequelize.define('DatesForRightTime', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  right_time_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: RightTimeModel, 
      key: 'id'
    }
  }
}, {
  timestamps: false, 
  tableName:"DatesForRightTime"
});


RightTimeModel.hasMany(NewModel, { foreignKey: 'right_time_id' });
NewModel.belongsTo(RightTimeModel, { foreignKey: 'right_time_id' });

module.exports = NewModel;