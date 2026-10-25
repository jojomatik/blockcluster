import { vi } from "vitest";

export const nuxtMocks = {
  route: { params: {} as Record<string, string> },
  runtimeConfig: { public: { gitRef: "", gitSha: "abcdef012345" } },
  socket: { on: vi.fn(), off: vi.fn() },
};
