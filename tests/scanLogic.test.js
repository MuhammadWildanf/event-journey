/**
 * scanLogic.test.js
 * Full working Jest test untuk Lunch & Souvenir dengan Firebase dimock
 */

import { handleLunchScan, handleSouvenirScan } from "../controllers/serviceController.js";

// Mock date
jest.mock("../utils/date.js", () => ({
  getToday: () => "2025-11-24"
}));

// Mock Firebase DB (inline, no out-of-scope issue)
const mockDB = {};

const createRef = (path = "") => ({
  get: async () => ({ val: () => mockDB[path] ?? null }),
  set: async (val) => { mockDB[path] = val; },
  update: async (val) => {
    if (!mockDB[path]) mockDB[path] = {};
    Object.assign(mockDB[path], val);
  },
  child: (childPath) => createRef(path + "/" + childPath),
  push: jest.fn(() => ({ key: "mockKey", set: jest.fn() })),
  transaction: async (updateFn, cb) => {
    const current = mockDB[path] || 0;
    const updated = updateFn(current);

    if (updated === undefined) {
      cb && cb(null, false, { val: () => current });
      return { val: () => current };
    } else {
      mockDB[path] = updated;
      cb && cb(null, true, { val: () => updated });
      return { val: () => updated };
    }
  }
});

// Mock firebase-admin
jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  database: () => ({ ref: createRef })
}));

// Fake req/res helper
const fakeReq = (sessionUser, body) => ({ session: { user: sessionUser }, body });
const fakeRes = () => {
  const res = {};
  res.json = (data) => { res.data = data; return res; };
  res.status = (code) => { res.statusCode = code; return res; };
  return res;
};

// Reset DB sebelum setiap test
beforeEach(() => {
  Object.keys(mockDB).forEach(k => delete mockDB[k]);

  // Lunch initial
  mockDB["services/lunch/QUOTA"] = 300;
  mockDB["services/lunch/today_count/2025-11-24"] = 0;

  // Souvenir initial
  mockDB["services/souvenir/QUOTA"] = 150;
  mockDB["services/souvenir/total_count"] = 0;
});

describe("SCAN LOGIC TEST", () => {

  /* ----------------------
     LUNCH TESTS
  ---------------------- */
  test("Lunch – berhasil claim jika masih < quota", async () => {
    const req = fakeReq({ id: "U1" }, { code: "lunch" });
    mockDB["users/U1"] = { checkin_dates: { "2025-11-24": true }, lunch_claimed_dates: {} };
    const res = fakeRes();

    await handleLunchScan(req, res);

    expect(res.data.success).toBe(true);
    expect(mockDB["services/lunch/today_count/2025-11-24"]).toBe(1);
  });

  test("Lunch – gagal claim setelah quota habis", async () => {
    mockDB["services/lunch/today_count/2025-11-24"] = 300;
    const req = fakeReq({ id: "U1" }, { code: "lunch" });
    mockDB["users/U1"] = { checkin_dates: { "2025-11-24": true }, lunch_claimed_dates: {} };
    const res = fakeRes();

    await handleLunchScan(req, res);

    expect(res.data.success).toBe(false);
    expect(res.data.message).toMatch(/sold out/i);
  });

  test("Lunch – gagal claim dua kali pada hari yang sama", async () => {
    const req = fakeReq({ id: "U1" }, { code: "lunch" });
    mockDB["users/U1"] = { checkin_dates: { "2025-11-24": true }, lunch_claimed_dates: { "2025-11-24": true } };
    const res = fakeRes();

    await handleLunchScan(req, res);

    expect(res.data.success).toBe(false);
    expect(res.data.message).toMatch(/already claimed/i);
  });

  /* ----------------------
     SOUVENIR TESTS
  ---------------------- */
  test("Souvenir – berhasil claim jika visited ≥ 5 dan quota tersedia", async () => {
    const req = fakeReq({ id: "U2" }, { code: "souvenir" });
    mockDB["users/U2"] = { checkin_dates: { "2025-11-24": true }, visited_count: 5, souvenir_claimed: false };
    const res = fakeRes();

    await handleSouvenirScan(req, res);

    expect(res.data.success).toBe(true);
    expect(mockDB["services/souvenir/total_count"]).toBe(1);
  });

  test("Souvenir – gagal claim jika visited < 5", async () => {
    const req = fakeReq({ id: "U3" }, { code: "souvenir" });
    mockDB["users/U3"] = { checkin_dates: { "2025-11-24": true }, visited_count: 3, souvenir_claimed: false };
    const res = fakeRes();

    await handleSouvenirScan(req, res);

    expect(res.data.success).toBe(false);
    expect(res.data.message).toMatch(/visit at least 5/i);
  });

  test("Souvenir – quota habis → gagal hari ini tapi bisa coba besok", async () => {
    mockDB["services/souvenir/total_count"] = 150;
    const req = fakeReq({ id: "U4" }, { code: "souvenir" });
    mockDB["users/U4"] = { checkin_dates: { "2025-11-24": true }, visited_count: 5, souvenir_claimed: false };
    const res = fakeRes();

    await handleSouvenirScan(req, res);

    expect(res.data.success).toBe(false);
    expect(res.data.message).toMatch(/try again tomorrow/i);
  });

  test("Souvenir – gagal claim jika sudah pernah claim", async () => {
    const req = fakeReq({ id: "U5" }, { code: "souvenir" });
    mockDB["users/U5"] = { checkin_dates: { "2025-11-24": true }, visited_count: 5, souvenir_claimed: true };
    const res = fakeRes();

    await handleSouvenirScan(req, res);

    expect(res.data.success).toBe(false);
    expect(res.data.message).toMatch(/already claimed/i);
  });

});
