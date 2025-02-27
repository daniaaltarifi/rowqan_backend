const AdminChalet = require('../Models/AdminChalet ');
const Chalet = require('../Models/ChaletsModel'); 



exports.getChaletByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
   

    if (!userId) {
      return res.status(400).json({
        error: "userId is required in the request parameters",
      });
    }

    const adminChalets = await AdminChalet.findAll({
      where: { user_id: userId },
      attributes: ['chalet_id'],
    });

    if (adminChalets.length === 0) {
      return res.status(404).json({
        error: `No chalets found for user ID ${userId}`,
      });
    }

    const chaletIds = adminChalets.map(adminChalet => adminChalet.chalet_id);

    const chalets = await Chalet.findAll({
      where: {
        id: chaletIds,
      },
      attributes: ['id', 'title', 'image'],
    });

    if (chalets.length > 0) {
      return res.status(200).json(chalets);
    } else {
      return res.status(404).json({
        error: `No chalets found for the given user ID`,
      });
    }
  } catch (error) {
    console.error("Error fetching chalets by user ID:", error);
    return res.status(500).json({ error: "Failed to fetch chalets" });
  }
};



  

