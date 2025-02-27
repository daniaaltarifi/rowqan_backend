const AdminChalet = require('../Models/AdminChalet ');
const Chalet = require('../Models/ChaletsModel'); 



exports.getChaletByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const chalets = await AdminChalet.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Chalet,
          attributes: ['id', 'title', 'description', 'image', 'Rating'],
        },
      ],
    });

    if (chalets.length > 0) {
      res.json({
        chalets: chalets.map(chalet => chalet.Chalet),
      });
    } else {
      res.status(404).json({
        error: `No chalets found for user ID ${userId}`,
      });
    }
  } catch (error) {
    console.error("Error fetching chalets by user ID:", error);
    res.status(500).json({ error: "Failed to fetch chalets" });
  }
};

  

