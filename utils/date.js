export const getToday = () => {
    const d = new Date();
    return d.toISOString().split("T")[0]; // "2025-11-17"
};
