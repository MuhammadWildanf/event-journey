export const registrationEmailTemplate = (name) => {
    return {
        subject: "Konfirmasi Registrasi – SCM Digital Day 2025",
        html: `
            <p>Yth. Bapak/Ibu <strong>${name}</strong>,</p>

            <p>
                Terima kasih telah melakukan registrasi untuk hadir di 
                <strong>SCM Digital Day 2025</strong>.<br>
                Registrasi Anda telah kami terima dengan baik.
            </p>

            <hr>

            <h3>📅 Jadwal Acara</h3>

            <p>
                SCM Digital Day 2025 akan berlangsung pada:<br><br>
                • <strong>25–26 November 2025</strong> — pukul 08.00 s/d 16.00 WIB<br>
                • <strong>Lokasi:</strong> Multifunction Room, PHE Tower lt. 2, Jakarta
            </p>

            <h3>🎫 Penting untuk Masuk Acara</h3>

            <p>
                Untuk dapat memasuki area acara pada hari H, mohon melakukan langkah berikut:
            </p>

            <ol>
                <li>Login ke sistem event</li>
                <li>Pada hari acara, scan QR Code di pintu masuk untuk menyelesaikan proses check-in</li>
            </ol>

            <p>
                Silakan login melalui tautan berikut:<br>
                👉 <a href="https://scmdigitalday2025.com/login" target="_blank">
                    <strong>Login SCM Digital Day 2025</strong>
                </a>
            </p>

            <br>

            <p>
                Sampai bertemu di <strong>SCM Digital Day 2025</strong>!<br><br>
                Hormat kami,<br>
                <strong>Panitia SCM Digital Day 2025</strong>
            </p>
        `
    };
};
