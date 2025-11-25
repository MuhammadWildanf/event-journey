export const getToday = () => {
    const d = new Date(); // waktu lokal server (WIB jika server di Jakarta)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0"); // bulan 0-based
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`; // format "YYYY-MM-DD"
};
