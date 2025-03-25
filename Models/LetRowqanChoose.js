const { DataTypes } = require('sequelize');
const sequelize = require('../Config/dbConnect');  

const LetRowqanChoose = sequelize.define('LetRowqanChoose', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  reservation_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  Rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  Duration: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  number_of_visitors: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  Facilities: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('Facilities');
      return rawValue ? rawValue.split(',').map(facility => facility.trim()) : [];
    },
    set(value) {
      this.setDataValue('Facilities', Array.isArray(value) ? value.join(', ') : value);
    }
  },
  number_of_rooms: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  Preferred_Location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  Budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  Additional_Notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  Full_Name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  Phone_Number: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      is: /^(\+962|0)?7\d{8}$/
    }
  },
}, {
  timestamps: true,
});

module.exports = LetRowqanChoose;