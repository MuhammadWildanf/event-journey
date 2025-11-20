import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import boothRoutes from "./routes/boothRoutes.js";
import scanRoutes from "./routes/scanRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import checkinRoutes from "./routes/checkinRoutes.js";
import serverless from "serverless-http";
import { sendEmail } from "./utils/mailer.js";
import http from "http";
import { WebSocketServer } from "ws";



dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================================================
// ✅ Firebase Admin Initialization
// ==================================================
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
    }),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

const db = admin.database();
export { db };

// ==================================================
// ✅ Express App Configuration
// ==================================================
const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🚫 Hindari MemoryStore di Vercel
if (!process.env.VERCEL) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "scm_digitalday_secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 hari
        httpOnly: true,
        secure: false, // true jika HTTPS
        sameSite: "lax",
      }
    })
  );
}

// View Engine & Static Files
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/qr", express.static(path.join(__dirname, "qr")));

// ==================================================
// ✅ Routes
// ==================================================


app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  if (!req.session.hasVisited) {
    req.session.hasVisited = true;
    return res.redirect("/register");
  }

  return res.redirect("/login");
});


app.use("/", authRoutes);
app.use("/", checkinRoutes);
app.use("/", dashboardRoutes);
app.use("/", boothRoutes);
app.use("/", scanRoutes);
app.use("/", serviceRoutes);

app.get("/event-guide", (req, res) => {
  // optional: require login
  if (!req.session?.user) return res.redirect("/login");

  const publicPdfUrl = "/assets/files/QR.pdf";

  res.send(`
    <html>
      <head><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
      <body style="margin:0;padding:0;">
        <iframe src="${publicPdfUrl}" style="width:100vw;height:100vh;border:none;"></iframe>
      </body>
    </html>
  `);
});

// AUTO SET ACTIVE MENU
app.use((req, res, next) => {
  const url = req.originalUrl;

  if (url.startsWith("/admin/booths")) {
    res.locals.active = "booths";
  } else if (url.startsWith("/admin/users")) {
    res.locals.active = "users";
  } else if (url.startsWith("/admin")) {
    res.locals.active = "dashboard";
  } else {
    res.locals.active = "";
  }

  next();
});


app.use("/admin", adminRoutes);

app.get("/test-email", async (req, res) => {
  const ok = await sendEmail("wildanf.daftar@gmail.com", "Test Brevo", "Works!", "<h1>OK</h1>");
  res.send(ok ? "Sukses" : "Gagal");
});


// Default Redirect
app.get("*", (req, res) => res.redirect("/login"));


const wss = new WebSocketServer({ server });

export const boothSockets = {};

wss.on("connection", (ws, req, boothId) => {
  console.log(`Connected to booth ${boothId}`);  // Verifikasi boothId yang diterima
  boothSockets[boothId] = ws;

  ws.send(JSON.stringify({ event: "connected" }));

  ws.on("close", () => {
    delete boothSockets[boothId];
  });
});


server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/ws/booth") {
    const boothId = url.searchParams.get("booth_id");
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, boothId);
    });
  }
});



const PORT = process.env.PORT || 3002;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Local server running at http://localhost:${PORT}`);
  });
}

// Export untuk Vercel
export default serverless(app);
