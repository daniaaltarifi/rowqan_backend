const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');
const Users = require('../Models/UsersModel');
const Chalets = require('../Models/ChaletsModel')

const Messages = sequelize.define('Messages', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  message: { 
    type: DataTypes.STRING,
    allowNull: false,
  },
  lang: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Users,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Users,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  chaletId: { 
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Chalets,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
}, {
  timestamps: false,
});


Users.hasMany(Messages, { foreignKey: 'senderId', as: 'SentMessages', onDelete: 'CASCADE' });
Users.hasMany(Messages, { foreignKey: 'receiverId', as: 'ReceivedMessages', onDelete: 'CASCADE' });
Messages.belongsTo(Users, { foreignKey: 'senderId', as: 'Sender', onDelete: 'CASCADE' });
Messages.belongsTo(Users, { foreignKey: 'receiverId', as: 'Receiver', onDelete: 'CASCADE' });

Chalets.hasMany(Messages, { foreignKey: 'chaletId', as: 'ChaletMessages', onDelete: 'CASCADE' });
Messages.belongsTo(Chalets, { foreignKey: 'chaletId', as: 'Chalet', onDelete: 'CASCADE' });

module.exports = Messages;
