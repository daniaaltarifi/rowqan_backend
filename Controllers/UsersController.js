const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../Models/UsersModel');
const ReservationModel = require('../Models/ReservationsModel');
const UserTypes = require('../Models/UsersTypes');
const { argon2d } = require('argon2');
require('dotenv').config();
const argon2 = require("argon2");
const Chalet = require('../Models/ChaletsModel');
const { client } = require('../Utils/redisClient');
const Wallet = require('../Models/WalletModel');


exports.createUser = async (req, res) => {
  const { name, email, phone_number, country, password, lang, user_type_id } = req.body;

  try {
   
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({
        code: 'ER_DUP_ENTRY',
        message: lang === 'en' ? 'Email already exists' : 'البريد الالكتروني موجود',
      });
    }

    
    if (!['ar', 'en'].includes(lang)) {
      return res.status(400).json({
        error: lang === 'en' ? 'Invalid language. Please use "ar" or "en".' : 'اللغة غير صالحة. استخدم "ar" أو "en".',
      });
    }

    
    const hashedPassword = await argon2.hash(password);

    
    const finalUserType = user_type_id || 2;

   
    const newUser = await User.create({
      name,
      email,
      phone_number,
      country,
      password: hashedPassword,
      lang,
      user_type_id: finalUserType,
    });

    
    res.status(201).json(
     newUser,
    );
  } catch (error) {
    console.error('Error creating user:', error);

  
    res.status(500).json({
      error: lang === 'en' ? 'Failed to create user' : 'فشل في إنشاء المستخدم',
    });
  }
};



exports.getAllUsers = async (req, res) => {
  const { lang } = req.params;
  try {
    if (!['ar', 'en'].includes(lang)) {
      return res.status(400).json({
        error: 'Invalid language. Please use "ar" or "en".',
      });
    }
    const users = await User.findAll({
      where: { lang },
      include: [
        {
          model: UserTypes,
          attributes: ['id', 'type'],
        },
      ],
    });

    res.status(200).json(
      users,
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: lang === 'en' ? 'Failed to fetch users' : 'فشل في جلب المستخدمين',
    });
  }
};


exports.getUserById = async (req, res) => {
  const { id } = req.params;
  const { lang } = req.query;

  try {
    
    const cacheKey = `user:${id}:lang:${lang || 'all'}`;
    client.del(cacheKey);  

    
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
    
      return res.status(200).json(JSON.parse(cachedData));
    }

    
    const whereCondition = lang ? { id, lang } : { id };

    
    const user = await User.findOne({
      where: whereCondition,
      include: [
        {
          model: ReservationModel,
          attributes: ['id', 'total_amount', 'cashback_amount'],
        },
        {
          model: UserTypes,
          attributes: ['id', 'type'],
        },
      ],
      attributes: ['id', 'name', 'email', 'phone_number', 'country', 'password'],
    });

    
    if (!user) {
      return res.status(404).json({
        error: lang === 'en' ? 'User not found' : 'المستخدم غير موجود',
      });
    }

    
    await client.setEx(cacheKey, 3600, JSON.stringify(user));

    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: lang === 'en' ? 'Failed to fetch user' : 'فشل في جلب المستخدم',
    });
  }
};




exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone_number, country, password, confirm_password, lang, user_type_id } = req.body;

  try {
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        error: lang === 'en' ? 'User not found' : 'المستخدم غير موجود',
      });
    }

    
    if (password && confirm_password) {
      if (password !== confirm_password) {
        return res.status(400).json({
          error: lang === 'en' ? 'Passwords do not match' : 'كلمتا المرور غير متطابقتين',
        });
      }
    }

    
    let hashedPassword = user.password;
    if (password) {
      hashedPassword = await argon2.hash(password);
    }

    
    await user.update({
      name,
      email,
      phone_number,
      country,
      password: hashedPassword,
      lang,
      user_type_id,
    });

    res.status(200).json({
      message: lang === 'en' ? 'User updated successfully' : 'تم تحديث المستخدم بنجاح',
      user,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: lang === 'en' ? 'Failed to update user' : 'فشل في تحديث المستخدم',
    });
  }
};




exports.deleteUser = async (req, res) => {
  const { id,lang } = req.params;

  
  try {
    
    const user = await User.findOne({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        error: lang === 'en' ? 'User not found' : 'المستخدم غير موجود',
      });
    }

    
    await Wallet.destroy({
      where: { user_id: id },
    });

    
    await User.destroy({
      where: { id },
    });

    res.status(200).json({
      message: lang === 'en' ? 'User deleted successfully' : 'تم حذف المستخدم بنجاح',
    });
  } catch (error) {
    console.error('Error deleting user:', error);

    res.status(500).json({
      error: lang === 'en' ? 'Failed to delete user' : 'فشل في حذف المستخدم',
    });
  }
};





const secretKey = process.env.JWT_SECRET;

exports.login = async (req, res) => {
  const { email, password, lang } = req.body;

  try {


    // Validate the language input

    if (!['ar', 'en'].includes(lang)) {
      return res.status(400).json({
        error: lang === 'en' ? 'Invalid language. Please use "ar" or "en".' : 'اللغة غير صالحة. استخدم "ar" أو "en".',
      });
    }



    // Check if the user exists

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        error: lang === 'en' ? 'User not found' : 'المستخدم غير موجود',
      });
    }



    // Verify the password

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        error: lang === 'en' ? 'Invalid password' : 'كلمة المرور غير صحيحة',
      });
    }


  
    if (!secretKey) {
      console.error("SECRET_KEY is not defined in .env file.");
      return res.status(500).json({
        error: lang === 'en' ? 'Internal server error' : 'خطأ داخلي في الخادم',
      });
    }

    const token = jwt.sign(
      { id: user.id, user_type_id: user.user_type_id },
      secretKey,
      { expiresIn: '1h' }
    );

    // Generate JWT token


    // Set the cookie first before sending the response
    
    // For Production
    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: true,
    //   maxAge: 24 * 60 * 60 * 1000,
    //   sameSite: "Strict",
    // });
// For Development
    res.cookie('token', token, {
      httpOnly: true, // Cookie can't be accessed from JavaScript
      maxAge: 3600000, // 1 hour expiration
      secure: false, // Set to true in production, false in development
    });
    
    return res.status(200).json(
      token,  
    );
    
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({
      error: lang === 'en' ? 'Failed to login' : 'فشل في تسجيل الدخول',
    });
  }
};





exports.logout = (req, res) => {
  try {
    // Ensure the token cookie is cleared both server-side and client-side

    res.clearCookie('token', { 
      httpOnly: true,  
      secure: false,   // Make sure it's false in development or adjust for production
    }); 
    // res.clearCookie('token', { 
    //   httpOnly: true,  
    //   secure: true,   // Make sure it's false in development or adjust for production
    //   sameSite: 'Strict'
    // }); 

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({
      error: 'Failed to log out',
    });
  }
};


exports.createAdmin = async (req, res) => {
  const { name, email, phone_number, country, password, RepeatPassword, user_type_id, lang, chalet_id } = req.body;

  try {
    
    if (password !== RepeatPassword) {
      return res.status(400).json({
        error: lang === 'en' ? 'Password and Repeat Password do not match' : 'كلمة المرور وتكرار كلمة المرور غير متطابقتين',
      });
    }

    
    if (user_type_id !== '1') {
      return res.status(400).json({
        error: lang === 'en' ? 'Role must be admin to create an admin user' : 'يجب أن يكون الدور "admin" لإنشاء مستخدم أدمن',
      });
    }

    
    const chalet = await Chalet.findByPk(chalet_id);
    if (!chalet) {
      return res.status(400).json({
        error: lang === 'en' ? 'Chalet not found' : 'الشاليه غير موجود',
      });
    }

    
    const saltRounds = 10;
    const hashedPassword = await argon2.hash(password, saltRounds);

    
    const newAdmin = await User.create({
      name,
      email,
      phone_number,
      country,
      password: hashedPassword,
      user_type_id,
      lang,
      chalet_id, 
    });

    res.status(201).json(newAdmin);
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      error: lang === 'en' ? 'Failed to create admin' : 'فشل في إنشاء الأدمن',
    });
  }
};



exports.verifyToken = (req, res, next) => {

  const token = req.cookies['token']; 
  
  if (!token) {
    return res.status(403).json({ error: 'Token missing' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = decoded; 
    next();
  });
};




