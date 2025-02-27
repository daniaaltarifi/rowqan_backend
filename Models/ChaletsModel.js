const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');
const chaletsImages = require('../Models/ChaletsImagesModel');
const RightTimeModel = require('../Models/RightTimeModel');
const ReservationDate = require('../Models/ReservationDatesModel');
const Status = require('../Models/StatusModel');
const AdminChalet = require('./AdminChalet ');
const User = require('./UsersModel');



const Chalet = sequelize.define('Chalet', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  image: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  Rating:{
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  city:{
    type: DataTypes.STRING,
    allowNull: false,
  },
  area:{
    type: DataTypes.STRING,
    allowNull: false,
  },
  intial_Amount:{
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  type:{
    type: DataTypes.JSON,
    allowNull: false,
  },
  features:{
    type: DataTypes.JSON,
    allowNull: false,
  },
  Additional_features:{
    type: DataTypes.JSON,
    allowNull: false,
  },

  near_me:{
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


Chalet.hasMany(chaletsImages, { foreignKey: 'chalet_id', onDelete: 'CASCADE' });
chaletsImages.belongsTo(Chalet, { foreignKey: 'chalet_id' });


Chalet.hasMany(RightTimeModel, { foreignKey: 'chalet_id', onDelete: 'CASCADE' });
RightTimeModel.belongsTo(Chalet, { foreignKey: 'chalet_id' });

Chalet.hasMany(ReservationDate, { foreignKey: 'chalet_id', onDelete: 'CASCADE' });
ReservationDate.belongsTo(Chalet, { foreignKey: 'chalet_id' });


Chalet.belongsTo(Status, { foreignKey: 'status_id' });
Status.hasOne(Chalet, { foreignKey: 'status_id'});

module.exports = Chalet;
