import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    push,
    onValue,
    get
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import {
    firebaseConfig
} from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const API = "/api";

const page = document.body.classList[0];

// ================== REGISTER ==================
if (page === "page-register") {
    document.getElementById("register").onclick = async () => {
        const name = document.getElementById("name").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const pass = document.getElementById("password").value.trim();

        if (!name || !phone || !pass) {
            return alert("Semua data wajib diisi!");
        }

        const res = await fetch(`${API}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                phone,
                password: pass
            }),
        });

        const data = await res.json();

        localStorage.setItem("userId", data.userId);
        localStorage.setItem("userPhone", phone);
        localStorage.setItem("userName", name);

        window.location.href = "dashboard.html";
    };
}


// ================== LOGIN ==================
if (page === "page-login") {
    document.getElementById("login").onclick = async () => {
        const phone = document.getElementById("phoneLogin").value.trim();
        const password = document.getElementById("passwordLogin").value.trim();
        if (!phone || !password) return alert("Isi semua field");

        const snap = await get(ref(db, "users"));
        let found = null;
        snap.forEach((child) => {
            const user = child.val();
            if (user.phone === phone && user.password === password) {
                found = {
                    id: child.key,
                    ...user
                };
            }
        });

        if (!found) return alert("Nomor WA atau password salah!");

        localStorage.setItem("userId", found.id);
        localStorage.setItem("userPhone", found.phone);
        localStorage.setItem("userName", found.name);

        window.location.href = "dashboard.html";
    };
}

// ================== DASHBOARD / SCAN ==================
if (page === "page-dashboard") {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");
    if (!userId) window.location.href = "login.html";

    const boothGrid = document.getElementById("boothGrid");
    const lastScanDisplay = document.getElementById("last-scan");
    const btnLogout = document.getElementById("logout");
    const countDisplay = document.getElementById("count");
    const rewardDisplay = document.getElementById("reward");

    // 🔹 Ambil daftar booth dari database (sekali saja)
    const boothSnap = await get(ref(db, "booths"));
    const booths = [];
    boothSnap.forEach((child) => {
        booths.push(child.val().name);
    });

    // 🔹 Pantau perubahan user secara realtime
    onValue(ref(db, `users/${userId}`), (snap) => {
        if (!snap.exists()) return;

        const user = snap.val();
        const visited = user.booths_visited || {};

        // Update jumlah booth yang dikunjungi
        const count = Object.keys(visited).length;
        countDisplay.textContent = count;

        // Update reward
        rewardDisplay.textContent = user.reward_ready ? "✅ Siap Diambil" : "Belum";

        // Update daftar booth dengan warna/status
        boothGrid.innerHTML = "";
        booths.forEach((name) => {
            const el = document.createElement("div");
            el.className = "booth-box";
            el.textContent = name;
            if (visited[name]) el.classList.add("visited"); // tambahkan warna hijau misalnya
            boothGrid.appendChild(el);
        });
    });

    // 🔹 QR Scanner
    function startQRScanner() {
        const html5QrCode = new Html5Qrcode("qr-reader");
        const config = {
            fps: 10,
            qrbox: {
                width: 250,
                height: 250
            }
        };

        html5QrCode
            .start({
                facingMode: "environment"
            }, config, async (decodedText) => {
                if (!decodedText.startsWith("BOOTH-")) return;
                lastScanDisplay.textContent = decodedText;

                await fetch(`${API}/scan`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        userId,
                        boothCode: decodedText
                    }),
                });
            })
            .catch(() => alert("Pastikan izin kamera diizinkan"));
    }

    startQRScanner();

    btnLogout.onclick = () => {
        localStorage.clear();
        window.location.href = "login.html";
    };
}


// ================== WELCOME PAGE ==================
if (page === "page-welcome") {
    document.getElementById("create").onclick = () => {
        window.location.href = "register.html";
    };
}