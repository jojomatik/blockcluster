import router from "../../src/router";

describe("application routes", () => {
  it("maps home, server details, and about paths to the expected routes", async () => {
    const home = router.match("/");
    const server = router.match("/server/my%20world");
    const about = router.match("/about");

    expect(home.name).toBe("Home");
    expect(home.path).toBe("/");
    expect(server.name).toBe("Server");
    expect(server.params.server).toBe("my world");
    expect(about.name).toBe("About");
    const aboutLoader = about.matched[0].components.default;
    expect(typeof aboutLoader).toBe("function");
  });
});
