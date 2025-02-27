const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect'); // تأكد من استيراد اتصال قاعدة البيانات
const User = require('../Models/UsersModel'); // جدول المستخدمين
const Chalet = require('../Models/ChaletsModel'); // جدول الشاليهات

const AdminChalet = sequelize.define('AdminChalet', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  chalet_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Chalet,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'admin_chalets',
  timestamps: false,
});

User.belongsToMany(Chalet, { through: AdminChalet, foreignKey: 'user_id' });
Chalet.belongsToMany(User, { through: AdminChalet, foreignKey: 'chalet_id' });

module.exports = AdminChalet;
