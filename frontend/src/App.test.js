import { act, render, screen, waitFor } from "@testing-library/react";

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

jest.setTimeout(15000);

test("renders the Cartify app shell", async () => {
  let container;

  await act(async () => {
    const rendered = render(
      <Provider store={Store}>
        <App />
      </Provider>
    );
    container = rendered.container;
  });

  await waitFor(() => {
    expect(mockAxios.get).toHaveBeenCalled();
  });
  await act(async () => {
    await screen.findByRole(
      "heading",
      { name: /Elevate Your Style/i },
      { timeout: 10000 }
    );
  });

  expect(container).toBeInTheDocument();
});
