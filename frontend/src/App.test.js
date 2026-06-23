import { render } from "@testing-library/react";

const mockAxios = {
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  get: jest.fn(() =>
    Promise.resolve({
      data: {
        events: [],
        products: [],
        seller: null,
        user: null,
      },
    })
  ),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
};

jest.mock("axios", () => ({
  __esModule: true,
  default: mockAxios,
  ...mockAxios,
}));

jest.mock("react-lottie", () => function MockLottie() {
  return null;
});

beforeAll(() => {
  window.scrollTo = jest.fn();
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
});

const App = require("./App").default;
const { Provider } = require("react-redux");
const Store = require("./redux/store").default;

test("renders the Cartify app shell", () => {
  const { container } = render(
    <Provider store={Store}>
      <App />
    </Provider>
  );
  expect(container).toBeInTheDocument();
});
