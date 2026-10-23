/*
blockcluster - An in-browser manager for your minecraft servers.
Copyright (C) 2021 jojomatik

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import Notice from "../../../common/components/software_notice";

describe("Notice", () => {
  it("normalizes GitHub repository links and infers a missing author", () => {
    const notice = new Notice(
      "Example",
      "1.0.0",
      "",
      "https://github.com/example/project.git",
      "License text"
    );

    expect(notice.name).toBe("Example");
    expect(notice.version).toBe("1.0.0");
    expect(notice.author).toBe("example");
    expect(notice.repositoryLink).toBe("https://github.com/example/project");
    expect(notice.notice).toBe("License text");
  });

  it("keeps an explicit author when a repository is provided", () => {
    const notice = new Notice(
      "Example",
      "2.0.0",
      "Example Author",
      "https://github.com/owner/repository",
      ""
    );

    expect(notice.author).toBe("Example Author");
    expect(notice.repositoryLink).toBe("https://github.com/owner/repository");
  });
});
