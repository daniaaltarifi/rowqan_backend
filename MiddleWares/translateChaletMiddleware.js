const rp = require('request-promise');

/**
 * @param {object} req
 * @param {object} res
 * @param {function} next 
 */
const translateMiddleware = async (req, res, next) => {
  const originalSend = res.json;
  const lang = req.query.lang || "ar"; // استخدام العربية كلغة افتراضية

  res.json = async function(data) {
    // إذا كانت اللغة هي العربية أو البيانات ليست كائنًا، نقوم بإرجاع البيانات كما هي
    if (lang === "ar" || typeof data !== "object") {
      return originalSend.call(res, data);
    }

    try {
      // تحويل البيانات إلى مصفوفة إذا لم تكن مصفوفة بالفعل
      let processedData = Array.isArray(data) ? data : [data];
      
      // ترجمة البيانات
      const translatedData = await Promise.all(
        processedData.map(item => translateObject(item, lang))
      );
      
      // إرجاع البيانات المترجمة (كمصفوفة أو كائن حسب شكل البيانات الأصلية)
      originalSend.call(res, Array.isArray(data) ? translatedData : translatedData[0]);
    } catch (error) {
      console.error("Translation Error:", error);
      originalSend.call(res, { 
        error: "Translation failed", 
        message: lang === "en" ? "Could not translate content" : "تعذرت ترجمة المحتوى",
        original: data 
      });
    }
  };
  next();
};

/**
 * @param {string} text
 * @param {string} lang
 * @returns {Promise<string>} 
 */
const translate = async (text, lang) => {
  try {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return text;
    }

    // التحقق من وجود الترجمة في ذاكرة التخزين المؤقت
    const cachedTranslation = getCachedTranslation(text, lang);
    if (cachedTranslation) {
      return cachedTranslation;
    }

    // إعداد طلب API الترجمة
    const options = {
      method: 'GET',
      url: 'https://translate.googleapis.com/translate_a/single',
      qs: {
        client: 'gtx',
        sl: 'auto', // اكتشاف اللغة تلقائيًا
        tl: lang,
        dt: 't',
        q: text
      },
      json: true
    };

    // إرسال طلب الترجمة
    const response = await rp(options);
    
    // استخراج النص المترجم
    let translation = '';
    if (response && response[0]) {
      // دمج جميع أجزاء الترجمة
      for (let i = 0; i < response[0].length; i++) {
        if (response[0][i][0]) {
          translation += response[0][i][0];
        }
      }
    }

    // تخزين الترجمة في ذاكرة التخزين المؤقت للاستخدام المستقبلي
    if (translation) {
      setCachedTranslation(text, lang, translation);
    }
    
    return translation || text;
  } catch (error) {
    console.error('Translation API Error:', error);
    return text; // إرجاع النص الأصلي في حالة حدوث خطأ
  }
};

/**
 * ترجمة كائن بالكامل بما في ذلك أي كائنات فرعية
 * @param {object} obj
 * @param {string} lang
 * @returns {Promise<object>} 
 */
const translateObject = async (obj, lang) => {
  // إذا كان المدخل مصفوفة، نترجم كل عنصر في المصفوفة
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => translateObject(item, lang)));
  }

  // إذا كان المدخل ليس كائنًا أو كان قيمة فارغة، نعيده كما هو
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const translatedObj = {};

  // معالجة كل خاصية في الكائن
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      // ترجمة النصوص فقط
      if (typeof value === "string" && value.trim() !== "") {
        try {
          // ترجمة النص
          translatedObj[key] = await translate(value, lang);
        } catch (err) {
          console.error(`Error translating key ${key}:`, err);
          translatedObj[key] = value; // استخدام القيمة الأصلية في حالة حدوث خطأ
        }
      } 
      // ترجمة الكائنات الفرعية بشكل متكرر
      else if (typeof value === "object" && value !== null) {
        translatedObj[key] = await translateObject(value, lang);
      } 
      // نسخ القيم الأخرى كما هي
      else {
        translatedObj[key] = value;
      }
    }
  }

  return translatedObj;
};

// ذاكرة تخزين مؤقت للترجمات
const translationCache = new Map();

/**
 * الحصول على ترجمة مخزنة مسبقًا
 * @param {string} text
 * @param {string} lang
 * @returns {string|null}
 */
const getCachedTranslation = (text, lang) => {
  const key = `${text}_${lang}`;
  return translationCache.get(key);
};

/**
 * تخزين ترجمة في ذاكرة التخزين المؤقت
 * @param {string} text
 * @param {string} lang
 * @param {string} translation
 */
const setCachedTranslation = (text, lang, translation) => {
  const key = `${text}_${lang}`;
  translationCache.set(key, translation);
};

module.exports = translateMiddleware;