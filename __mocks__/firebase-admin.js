const apps = [];

const credential = {
  cert: jest.fn(() => ({}))
};

const initializeApp = jest.fn((config) => {
  apps.push(config);
});

const database = jest.fn(() => ({
  ref: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    push: jest.fn(() => ({
      key: "mockKey",
      set: jest.fn()
    })),
    child: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn()
    }))
  }))
}));

export default {
  apps,
  initializeApp,
  credential,
  database
};
