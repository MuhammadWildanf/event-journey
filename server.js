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



app.get("/seed-doorprize", async (req, res) => {
  const doorprizeRef = db.ref("doorprize");

  const dummyNames = [
    "Alya Putri", "Rahmat Saputra", "Naya Lestari", "Dimas Hendra", "Ratna Dewi",
    "Rafi Pratama", "Salsa Nuraini", "Farhan Abdullah", "Indira Cahaya", "Bagas Satrio",
    "Fauzan Ramadhan", "Putri Melati", "Gilang Nugraha", "Zahra Rahma", "Iqbal Ferdian",
    "Rizki Amelia", "Yuda Prakoso", "Nadira Salma", "Dea Maharani", "Taufik Ramdani",
    "Della Kusuma", "Hendra Wijayanto", "Fitria Nanda", "Agung Wibowo", "Tiara Maharani",
    "Yusuf Ardiansyah", "Selvi Oktaviani", "Rio Kurniawan", "Intan Fadila", "M. Naufal",
    "Sinta Amanda", "Arif Fikri", "Vina Kartika", "Hana Nurazizah", "Farel Kurnia",
    "Elisa Dwi", "Andika Fauzi", "Putra Mahendra", "Nabila Fitri", "Dewa Pramana",
    "Zulfa Nadine", "Rama Dwiki", "Bella Anggraini", "Azka Aditya", "Aulia Rakhma",
    "Fadlan Akbar", "Eka Maulana", "Silvia Sukma", "Irsyad Maulana", "Citra Ayuning",
    "Siti Rohmah", "Rian Anggara", "Anisa Maulidya", "Fikri Ramadhan", "Reva Andini",
    "Wahyu Kurnia", "Tasya Ayu", "Erlangga Pratama", "Isabella Putri", "Naufal Adrian",
    "Malika Nur", "Fahri Hidayat", "Dian Maharani", "Jordan Nugraha", "Fauziah Azzahra",
    "Reyhan Prayoga", "Anjani Prameswari", "Iqra Alfarizi", "Sarah Fadilah", "Arya Bagaskara",
    "Kirana Dewi", "Angga Prakoso", "Nisa Amelia", "Farel Aryansyah", "Nurul Azizah",
    "Davin Pratama", "Indah Kurnia", "Fauzi Nur", "Dinda Lestari", "Reza Aditya",
    "Hidayat Akbar", "Amanda Safira", "Rafael Putra", "Nur Annisa", "Jason Ramadhan",
    "Yesi Kumalasari", "Hafizh Fikri", "Safira Zahra", "Bagus Pratama", "Sakinah Aulia",
    "Fikri Andrian", "Cindy Anastasia", "Rangga Dwi", "Dara Maharani", "Rizwan Ramdani",
    "Laras Sari", "Farhan Aulia", "Putri Alifah", "Rifqi Hidayat", "Sherly Oktavian",
    "Dimas Fadhil", "Sekar Ayu", "Andre Ramadhan", "Ajeng Safitri", "Dio Kusuma",
    "Manda Arsy", "Naufal Hakim", "Clara Cahyani", "Zidan Fadhil", "Khansa Rahma",
    "Wildan Saputra", "Naya Funia", "Raihan Putra", "Tasya Lusiana", "Keisha Nur",
    "Revan Aditya", "Amelia Putri", "Satria Dwi", "Indri Maharani", "Faris Rizky",
    "Novi Andika", "Mirza Putra", "Nadya Anjani", "Rafi Alfikri", "Rima Anggraini",
    "Fauzan Kamil", "Aira Putri", "Alvino Pradana", "Diyah Lestari", "Gilang Satriya",
    "Shania Oktaviani", "Jordan Mahendra", "Raisa Nur", "Bagas Fadillah", "Maya Anggun",
    "Putra Wicaksono", "Sabrina Tsani", "Rendy Ardiansyah", "Ayu Rahmadina", "Ferdiansyah",
    "Ella Setiani", "Fajar Prakoso", "Shafira Rahmadini", "Ridho Abdurrahman", "Winda Putri",
    "Naufal Ramadhani", "Intan Maharani", "Fahmi Ardiansyah", "Salwa Syakira", "Andre Wicaksono",
    "Diva Oktaviani", "Mufid Ramadhan", "Karina Damayanti", "Arfan Pratama", "Dita Permata",
    "Reza Ardiansyah", "Rizki Fadillah", "Tasya Nur", "Nadia Ayuning", "Raffi Dwiyan",
    "Dwi Anggraini", "Dandi Saputra", "Salma Azzahra", "Akbar Nugraha", "Rita Kusuma",
    "Atha Rahman", "Naila Alifah", "Riko Pranata", "Reina Maharani", "Ghifari Akbar",
    "Putri Zahra", "Raka Pratama", "Nisha Afifah", "Fahri Alfian", "Zahra Anindya",
    "Dani Ramadhan", "Kayla Nur", "Reyhan Ramdani", "Bella Prahesti", "Agung Pangestu",
    "Nadia Fathia", "Diva Maharani", "Rangga Hidayat", "Safira Aulia", "Fadil Nugraha",
    "Sekar Nindya", "Alfarizi Saputra", "Nisrina Cahya", "Farhan Dwiki", "Rani Anggun",
    "Davin Nugraha", "Luthfi Ramadhan", "Tyas Kusuma", "Reza Septian", "Ika Prasetya",
    "Yogi Maulana", "Sheila Aulia", "Febrian Ramadhan", "Natasha Bilqis", "Fajar Nugroho",
    "Nadia Hana", "Yugo Pratama", "Nur Alifah", "Rangga Wibowo", "Yasmin Zahra",
    "Zikri Ramadhan", "Mira Andini", "Ramzi Rahman", "Uni Maharani", "Arga Pratama",
    "Irfan Hidayat", "Novia Cahaya", "Revan Dwi", "Aulia Putranti", "Adit Pradana",
    "Novi Nur", "Fathur Ramdani", "Kirana Puspa", "Aulia Ramadhani", "Husein Faiz",
    "Tara Anindita", "Faris Maulana", "Vanessa Cahyani", "Alwi Pratama", "Tasya Maharani",
    "Dwi Fadilah", "Arkan Ramadhani", "Azzahra Nur", "Fauzan Kurnia", "Mira Santika",
    "Riko Ramdani", "Hana Nuraini", "Yoga Pratama", "Dwita Maharani", "Syahrul Ramadhan",
    "Delia Anggun", "Ahmad Rifqi", "Nayla Azzahra", "Rizky Prakoso", "Aira Lestari",
    "Dwinanda Fadhil", "Sarah Annisa", "Arif Pradana", "Citra Maharani", "Vincent Akbar",
    "Putri Lestari", "Rama Prakoso", "Elisa Nur", "Alvin Ramadhan", "Talitha Kamilah",
    "Regan Pratama", "Adelia Maharani", "Farhan Nugraha", "Indah Sari", "Rivaldi Prakoso",
    "Ghina Aisyah", "Rio Wicaksono"
  ];

  try {
    for (let i = 0; i < dummyNames.length; i++) {
      await doorprizeRef.push({
        name: dummyNames[i],
        timestamp: Date.now(),
        userId: `dummyUser${i + 1}`,
      });
    }
    res.send("✔️ Data dummy doorprize (300) berhasil ditambahkan ke Firebase.");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Gagal menambahkan data dummy.");
  }
});


// ==================================================
// 🧾 Seed Dummy Guestbook (50 data random)
// ==================================================
app.get("/seed-guestbook", async (req, res) => {
  const guestbookRef = db.ref("guestbook");

  // Nama random sederhana
  const names = [
    "Wildan", "Alya", "Raka", "Naufal", "Yasmin", "Bagus", "Citra", "Hana", "Fikri",
    "Dewi", "Rizwan", "Dinda", "Rama", "Tasya", "Farhan", "Nadya", "Rafi", "Indah",
    "Mira", "Fahri", "Bella", "Reza", "Nabila", "Andre", "Vina", "Iqbal", "Sabrina",
    "Yuda", "Sarah", "Anisa", "Arif", "Karina", "Dio", "Nurul", "Gilang", "Salma",
    "Dani", "Dara", "Jasmine", "Hafizh", "Tara", "Elang", "Rania", "Febri", "Kayla",
    "Raihan", "Zahra", "Fadil", "Agung", "Nisrina"
  ];

  // Komentar berragam
  const comments = [
    "Mantap banget!", "Sukses selalu!", "Acara keren!", "Harus ada lagi tahun depan!",
    "Luar biasa!", "Bermanfaat sekali.", "Respect!", "Good job panitia!",
    "Bagus eventnya!", "Seru parah!", "Gokil!", "Keren banget acaranya!",
    "Pembicaranya mantap!", "Recommended!", "Nambah wawasan banget!",
    "Informatif dan menarik.", "Acaranya asik!", "Bisa networking juga!",
    "Konsepnya bagus!", "Gak nyesel ikut.", "Puas banget ikut event ini.",
    "Sempurna!", "Tim panitia solid!", "Semoga diadakan lagi.", "Mantap sekali panitia!",
    "Good vibes!", "Sangat menginspirasi.", "Keren pol!", "Mantul!",
    "Next event kapan?", "Worth it!", "Bikin semangat belajar!", "Berkesan banget!",
    "Top markotop!", "Lanjutkan!", "Good experience!", "Amazing event!",
    "Sangat informatif!", "Luar biasa profesional!", "Sukses ke depannya!",
    "Seru dan edukatif.", "Mantap panitia!", "Event berkualitas!",
    "Benar-benar niat!", "Nice session!", "Powerful event!", "Great job!",
    "Salut buat panitia!", "Event berkelas!"
  ];

  try {
    for (let i = 0; i < 50; i++) {
      await guestbookRef.push({
        char: i + 1,
        name: names[i % names.length],
        comment: comments[Math.floor(Math.random() * comments.length)],
        timestamp: Date.now() + i * 15000 // beda timestamp biar realistis
      });
    }

    res.send("✔️ Guestbook dummy (50 data) berhasil ditambahkan ke Firebase.");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Gagal menambahkan data dummy guestbook.");
  }
});

// // Default Redirect
// app.get("*", (req, res) => res.redirect("/login"));


const wss = new WebSocketServer({ server });

// Simpan socket berdasarkan boothId
export const boothSockets = {};

// Ketika ada koneksi WebSocket masuk, ambil boothId dari query string pada req.url
wss.on("connection", (ws, req) => {
  try {
    const url = new URL(req.url, "https://scmdigitalday2025.com");
    const boothId = url.searchParams.get("booth_id");

    console.log(`Upgrade request for boothId: ${boothId}`);

    // Pastikan permintaan ke "/ws/booth"
    if (url.pathname !== "/ws/booth") {
      console.log("Invalid WebSocket path requested:", url.pathname);
      ws.close();
      return;
    }

    if (!boothId) {
      console.log("No booth_id provided in WebSocket connection");
      ws.close();
      return;
    }

    console.log(`Connected to booth: ${boothId}`);
    boothSockets[boothId] = ws;

    // Kirim pesan setelah koneksi terbuka
    ws.send(JSON.stringify({ event: "connected", boothId }));

    ws.on("close", () => {
      console.log(`Connection closed for booth: ${boothId}`);
      delete boothSockets[boothId];
    });
  } catch (err) {
    console.error("WebSocket connection handling error:", err);
    ws.close();
  }
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`🚀 Local server running at http://localhost:${PORT}`);
});

// Export untuk Vercel
export default serverless(app);
