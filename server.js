const express = require("express");
const sequelize = require("./Config/dbConnect");
const helmet = require("helmet");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const compression = require("compression");
app.use(compression());



app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);




app.use((req, res, next) => {
  req.socketIoInstance = io;
  next();
});



app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);




app.use(express.json());


const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://rowqan.com",
      "https://dashboard.rowqan.com",
      "https://rowqanbackend.rowqan.com",
    ], 
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});



const UsersRoutes = require('./Routes/UsersRoutes');
const LogoRoutes = require('./Routes/LogoRoutes');
const HeaderRoutes = require('./Routes/HeaderRoutes');
const HeroesRoutes = require('./Routes/HeroRoutes');
const ServicesRoutes = require('./Routes/ServicesRoutes');
const FooterRoutes = require('./Routes/FooterRoutes');
const FooterIconRoutes = require('./Routes/FooterIconsRoutes');
const HeroChaletsRoutes = require('./Routes/ChaletsHeroRoutes');
const ChaletsRoutes = require('./Routes/ChaletsRoutes');
const ChaletImagesRoutes = require('./Routes/ChaletsImagesRoutes');
const ReservatioDatesRoutes = require('./Routes/ReservationsDateRoutes');
const ContactUsRoutes = require('./Routes/ContactUsRoutes');
const RightTimeRoutes = require('./Routes/RightTimeRoutes');
const StatusRoutes = require('./Routes/StatusRoutes');
const UsersTypesRoutes = require('./Routes/UsersTypesRoutes');
const ReservationsChaletsRoutes = require('./Routes/ReservationsChaletsRoutes');
const WalletRoutes = require('./Routes/WalletRoutes');
const MessagesRoutes = require('./Routes/MessagesRoutes');
const PaymentsRoutes = require('./Routes/PaymentsRoutes')
const AboutRoutes = require('./Routes/AboutusRoutes')
const BlogRoutes = require('./Routes/BlogRoutes');
const axios = require('axios');
const geoip = require('geoip-lite');
const ContactsRoutes = require('./Routes/ContactsRoutes')
const TagRoutes = require('./Routes/TagRoutes')
const number_Of_Stars = require('./Routes/numberOfStarsRoutes')
const DateForRightTime = require('./Routes/RightTimeDateRoutes')




const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3001",
  "https://rowqan.com",
  "https://dashboard.rowqan.com",
  "https://rowqanbackend.rowqan.com",
];



const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },    
  credentials: true,
};


app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());


app.use('/users', UsersRoutes);
app.use('/logos', LogoRoutes);
app.use('/header', HeaderRoutes);
app.use('/heroes', HeroesRoutes);
app.use('/services', ServicesRoutes);
app.use('/footer', FooterRoutes);
app.use('/footericons', FooterIconRoutes);
app.use('/heroChalets', HeroChaletsRoutes);
app.use('/chalets', ChaletsRoutes);
app.use('/chaletsimages', ChaletImagesRoutes);
app.use('/ReservationDates', ReservatioDatesRoutes);
app.use('/ContactUs', ContactUsRoutes);
app.use('/RightTimes', RightTimeRoutes);
app.use('/status', StatusRoutes);
app.use('/userstypes', UsersTypesRoutes);
app.use('/ReservationsChalets', ReservationsChaletsRoutes);
app.use('/Wallet', WalletRoutes);
app.use('/messages', MessagesRoutes);
app.use('/payments', PaymentsRoutes); 
app.use('/aboutUs',AboutRoutes)
app.use('/Blogs',BlogRoutes)
app.use('/Contacts',ContactsRoutes)
app.use('/Tags',TagRoutes)
app.use('/NOstars',number_Of_Stars)
app.use('/DatesForRightTime',DateForRightTime)




const IP_LOOKUP_API = "https://ipqualityscore.com/api/json/ip/T0hMeOnMzeAnPVsmgH6AKMhguvmr1Yv9";




async function checkVPN(userIP) {
  try {
    const response = await axios.get(`${IP_LOOKUP_API}?ip=${userIP}`);
    const { vpn, proxy, fraud_score, isp, city, asn, is_proxy } = response.data;

    if (vpn || proxy || is_proxy) {
      console.log("VPN or Proxy detected.");
      return false;
    }

    if (fraud_score > 50) {
      console.log("Fraud score is too high.");
      return false;
    }

    if ((isp && isp.toLowerCase().includes("vpn")) || city === "unknown") {
      console.log("Suspicious ISP or City.");
      return false;
    }

    if (asn && (asn === "12345" || asn === "67890")) {
      console.log("Suspicious ASN detected.");
      return false;
    }

    const geo = geoip.lookup(userIP);
    if (!geo || geo.country !== "JO") {
      console.log("Access denied due to non-Jordan IP.");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking VPN:", error);
    return false;
  }
}

function checkAuth(req, res, next) {
  const token = req.cookies.authToken || req.headers["authorization"];
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.user = decoded;
    next();
  });
}

app.use("/dashboard", async (req, res, next) => {
  const userIP = req.query.ip || requestIp.getClientIp(req);

  const isAllowed = await checkVPN(userIP);

  if (!isAllowed) {
    return res
      .status(403)
      .json({ message: "Access denied due to VPN/Proxy or non-Jordan IP" });
  }

  res.status(200).json({ message: "Access granted to the dashboard" });
});

sequelize.sync({ force: false }).then(() => {
  console.log("Database connected and synced!");
});

app.get("/", (req, res) => {
  res.send("Welcome to Rowqan!");
});

server.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});
