import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    push,
    onValue,
    get,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const API = "/api";

const page = document.body.classList[0];

// ================== SweetAlert2 Default Style ==================
const swal = (title, text = "", icon = "info") => {
    return Swal.fire({
        title,
        text,
        icon,
        confirmButtonColor: "#ccff00",
        background: "rgba(15, 25, 35, 0.95)",
        color: "#fff",
        customClass: {
            popup: "rounded-4 border border-neon",
            confirmButton: "fw-bold text-dark",
        },
    });
};

// ================== REGISTER ==================
if (page === "page-register") {
    const registerForm = document.getElementById("registerForm");

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const pass = document.getElementById("password").value.trim();
        const repeat = document.getElementById("repeatpassword").value.trim();

        if (!name || !email || !pass || !repeat)
            return swal("Peringatan", "Semua data wajib diisi!", "warning");

        if (pass.length < 6)
            return swal("Password Terlalu Pendek", "Minimal 6 karakter", "error");

        if (pass !== repeat)
            return swal("Tidak Cocok", "Password dan konfirmasi tidak sama!", "error");

        try {
            const res = await fetch(`${API}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password: pass }),
            });

            const data = await res.json();

            if (res.status !== 200)
                return swal("Gagal", data.error || "Registrasi gagal!", "error");

            localStorage.setItem("userId", data.userId);
            localStorage.setItem("userEmail", email);
            localStorage.setItem("userName", name);

            swal("Berhasil!", "Akun berhasil dibuat 🎉", "success").then(() => {
                window.location.href = "dashboard.html";
            });
        } catch (err) {
            console.error(err);
            swal("Error", "Terjadi kesalahan koneksi.", "error");
        }
    });
}

// ================== LOGIN ==================
if (page === "page-login") {
    const loginForm = document.getElementById("loginForm");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("emailLogin").value.trim();
        const password = document.getElementById("passwordLogin").value.trim();

        if (!email || !password)
            return swal("Peringatan", "Isi semua field!", "warning");

        try {
            const snap = await get(ref(db, "users"));
            let found = null;
            snap.forEach((child) => {
                const user = child.val();
                if (user.email === email && user.password === password)
                    found = { id: child.key, ...user };
            });

            if (!found) return swal("Gagal", "Email atau password salah!", "error");

            localStorage.setItem("userId", found.id);
            localStorage.setItem("userEmail", found.email);
            localStorage.setItem("userName", found.name);

            swal("Selamat Datang", found.name, "success").then(() => {
                window.location.href = "dashboard.html";
            });
        } catch (error) {
            console.error(error);
            swal("Error", "Terjadi kesalahan saat login.", "error");
        }
    });
}

// ================== DASHBOARD ==================
if (page === "page-dashboard") {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");

    if (!userId) {
        swal("Sesi Berakhir", "Silakan login kembali.", "info").then(() => {
            window.location.href = "login.html";
        });
    }

    const usernameEl = document.getElementById("username");
    if (usernameEl) usernameEl.textContent = userName || "Guest";

    const btnLogout = document.getElementById("logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", (e) => {
            e.preventDefault();
            Swal.fire({
                title: "Logout?",
                text: "Yakin ingin keluar dari akun?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Ya, Logout",
                cancelButtonText: "Batal",
                confirmButtonColor: "#ccff00",
                background: "rgba(15, 25, 35, 0.95)",
                color: "#fff",
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.clear();
                    window.location.href = "login.html";
                }
            });
        });
    }

    const navs = {
        "btn-lunch": "lunch.html",
        "btn-souvenir": "souvenir.html",
        "btn-photo": "photobooth.html",
        "btn-games": "games.html",
        "btn-booth": "booths.html",
    };

    Object.entries(navs).forEach(([id, url]) => {
        const el = document.getElementById(id);
        if (el)
            el.addEventListener("click", (e) => {
                e.preventDefault();
                window.location.href = url;
            });
    });
}

if (page === "page-booths") {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");

    if (!userId) {
        swal("Sesi Berakhir", "Silakan login kembali.", "info").then(() => {
            window.location.href = "login.html";
        });
    }

    const usernameEl = document.getElementById("username");
    if (usernameEl) usernameEl.textContent = userName || "Guest";

    const btnLogout = document.getElementById("logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", (e) => {
            e.preventDefault();
            Swal.fire({
                title: "Logout?",
                text: "Yakin ingin keluar dari akun?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Ya, Logout",
                cancelButtonText: "Batal",
                confirmButtonColor: "#ccff00",
                background: "rgba(15, 25, 35, 0.95)",
                color: "#fff",
            }).then((r) => {
                if (r.isConfirmed) {
                    localStorage.clear();
                    window.location.href = "login.html";
                }
            });
        });
    }

    // 🔹 Bungkus seluruh fetch Firebase dalam fungsi async
    const loadBooths = async () => {
        const boothList = document.getElementById("boothList");

        try {
            const snap = await get(ref(db, "booths"));

            if (!snap.exists()) {
                boothList.innerHTML = `<p class="text-center text-white-50 mt-4">Belum ada booth terdaftar.</p>`;
                return; // ✅ sekarang aman karena di dalam async function
            }

            snap.forEach((child) => {
                const booth = child.val();
                const name = booth.name || "Booth";
                const code = booth.code || child.key;

                const item = document.createElement("div");
                item.classList.add("booth-item");
                item.innerHTML = `
                    <span>${name}</span>
                    <i class="bi bi-chevron-right"></i>
                `;

                item.addEventListener("click", () => {
                    window.location.href = `booth-${code}.html`;
                });

                boothList.appendChild(item);
            });
        } catch (error) {
            console.error(error);
            swal("Error", "Gagal memuat daftar booth.", "error");
        }
    };

    // 🔹 Jalankan
    loadBooths();
}

// ================== SCAN PAGE ==================
if (page === "page-scan") {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");

    if (!userId) {
        swal("Sesi Berakhir", "Silakan login kembali.", "info").then(() => {
            window.location.href = "login.html";
        });
    }

    const usernameEl = document.getElementById("username");
    if (usernameEl) usernameEl.textContent = userName || "Guest";

    // Tombol logout
    const btnLogout = document.getElementById("logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", (e) => {
            e.preventDefault();
            Swal.fire({
                title: "Logout?",
                text: "Yakin ingin keluar dari akun?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Ya, Logout",
                cancelButtonText: "Batal",
                confirmButtonColor: "#ccff00",
                background: "rgba(15, 25, 35, 0.95)",
                color: "#fff",
            }).then((r) => {
                if (r.isConfirmed) {
                    localStorage.clear();
                    window.location.href = "login.html";
                }
            });
        });
    }

    // === Inisialisasi QR Scanner ===
    const html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    async function onScanSuccess(decodedText) {
        console.log("✅ QR Detected:", decodedText);

        await html5QrCode.stop();

        // Validasi format QR
        if (!decodedText.startsWith("BOOTH-")) {
            swal("QR Tidak Valid", "Gunakan QR resmi dari booth event.", "warning").then(() => {
                html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess);
            });
            return;
        }

        // Ambil kode booth
        const boothCode = decodedText.split("BOOTH-")[1].trim();
        const boothUrl = `booth-${boothCode}.html`; // ubah sesuai struktur kamu (misal: review-booth.html?code=${boothCode})

        try {
            // kirim data scan ke server
            const res = await fetch(`${API}/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, boothCode: decodedText }),
            });

            const data = await res.json();

            if (res.status === 200) {
                swal("Scan Berhasil 🎉", `Booth ${boothCode} terdeteksi!`, "success").then(() => {
                    window.location.href = boothUrl;
                });
            } else {
                swal("Gagal", data.error || "Tidak dapat menyimpan hasil scan.", "error").then(() => {
                    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess);
                });
            }
        } catch (error) {
            console.error(error);
            swal("Error", "Terjadi kesalahan koneksi ke server.", "error").then(() => {
                html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess);
            });
        }
    }

    // Jalankan kamera
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
        .catch((err) => {
            console.error("❌ Kamera gagal diakses:", err);
            swal("Kamera Tidak Ditemukan", "Izinkan akses kamera di browser Anda.", "error");
        });
}



// ================== WELCOME PAGE ==================
if (page === "page-welcome") {
    const createBtn = document.getElementById("create");
    if (createBtn) {
        createBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = "register.html";
        });
    }
}
