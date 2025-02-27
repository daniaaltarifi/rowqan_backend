const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');
const User = require('../Models/UsersModel');
const Chalet = require('../Models/ChaletsModel');

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

// تأكد من أن النماذج المرتبطة هي فئات من Sequelize.Model
AdminChalet.belongsTo(User, { foreignKey: 'user_id' });
AdminChalet.belongsTo(Chalet, { foreignKey: 'chalet_id' });
User.hasMany(AdminChalet, { foreignKey: 'user_id' });
Chalet.hasMany(AdminChalet, { foreignKey: 'chalet_id' });

module.exports = AdminChalet;
