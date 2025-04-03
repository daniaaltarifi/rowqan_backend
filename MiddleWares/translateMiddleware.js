const rp = require('request-promise');

/**
 * @param {object} req
 * @param {object} res
 * @param {function} next 
 */
const translateMiddleware = async (req, res, next) => {
  const originalSend = res.json;
  const lang = req.query.lang || "en";

  res.json = async function(data) {
    if (typeof data !== "object" || !lang || lang === "en") {
      return originalSend.call(res, data);
    }

    try {
      let processedData = Array.isArray(data) ? data : [data];
      processedData = processedData.map(item => {
        if (item && item.dataValues) {
          return {
            id: item.dataValues.id,
            title: item.dataValues.title,
            description: item.dataValues.description,
            lang: item.dataValues.lang,
            image: item.dataValues.image
          };
        }
        return item;
      });

    
      const dataToTranslate = Array.isArray(data) ? processedData : processedData[0];
      
      const translatedData = await translateObject(dataToTranslate, lang);
      originalSend.call(res, translatedData);
    } catch (error) {
      console.error("Translation Error:", error);
      originalSend.call(res, { error: "Translation failed", original: data });
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
    const cachedTranslation = getCachedTranslation(text, lang);
    if (cachedTranslation) {
      return cachedTranslation;
    }

    const options = {
      method: 'GET',
      url: 'https://translate.googleapis.com/translate_a/single',
      qs: {
        client: 'gtx',
        sl: 'auto',
        tl: lang,
        dt: 't',
        q: text
      },
      json: true
    };

    const response = await rp(options);
    const translation = response[0][0][0];
    setCachedTranslation(text, lang, translation);
    return translation;
  } catch (error) {
    console.error('Translation API Error:', error);
    return text;
  }
};

/**
 * @param {object} obj
 * @param {string} lang
 * @returns {Promise<object>} 
 */
const translateObject = async (obj, lang) => {
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => translateObject(item, lang)));
  }

  const translatedObj = {};

  for (const key in obj) {
    if (typeof obj[key] === "string" && obj[key].trim() !== "") {
      try {
        const translatedText = await translate(obj[key], lang);
        translatedObj[key] = translatedText;
      } catch (err) {
        console.error(`Error translating key ${key}:`, err);
        translatedObj[key] = obj[key];
      }
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      translatedObj[key] = await translateObject(obj[key], lang);
    } else {
      translatedObj[key] = obj[key];
    }
  }

  return translatedObj;
};

const translationCache = new Map();

const getCachedTranslation = (text, lang) => {
  const key = `${text}_${lang}`;
  return translationCache.get(key);
};

const setCachedTranslation = (text, lang, translation) => {
  const key = `${text}_${lang}`;
  translationCache.set(key, translation);setCachedTranslation 
};

module.exports = translateMiddleware;