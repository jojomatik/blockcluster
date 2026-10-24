import { getVersion } from "../../../common/version";

describe("getVersion", () => {
  const originalRef = process.env.VUE_APP_GIT_REF;
  const originalSha = process.env.VUE_APP_GIT_SHA;

  afterEach(() => {
    if (originalRef === undefined) delete process.env.VUE_APP_GIT_REF;
    else process.env.VUE_APP_GIT_REF = originalRef;
    if (originalSha === undefined) delete process.env.VUE_APP_GIT_SHA;
    else process.env.VUE_APP_GIT_SHA = originalSha;
  });

  it("prefers a tag name over the fallback commit hash", () => {
    process.env.VUE_APP_GIT_REF = "refs/tags/v1.2.3";
    process.env.VUE_APP_GIT_SHA = "abcdef012345";

    expect(getVersion()).toBe("v1.2.3");
  });

  it("returns the short commit hash when no tag is set", () => {
    delete process.env.VUE_APP_GIT_REF;
    process.env.VUE_APP_GIT_SHA = "abcdef012345";

    expect(getVersion()).toBe("abcdef0");
  });

  it("reports missing revision metadata", () => {
    delete process.env.VUE_APP_GIT_REF;
    delete process.env.VUE_APP_GIT_SHA;

    expect(() => getVersion()).toThrow("Error retrieving current revision.");
  });
});
