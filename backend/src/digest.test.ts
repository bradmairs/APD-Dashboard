import { describe, expect, it } from "vitest";
import { digestItemsForUser } from "./digest";

describe("digestItemsForUser", () => {
  const items = [
    { key: "mine", projectId: "p1", projectManagerId: "u1" },
    { key: "theirs", projectId: "p2", projectManagerId: "u2" },
    { key: "unlinked", projectId: "p3", projectManagerId: null },
    { key: "portfolio", projectId: null, projectManagerId: null },
  ];

  it("keeps only the user's own projects plus portfolio-wide tasks", () => {
    expect(digestItemsForUser(items, "u1").map((i) => i.key)).toEqual(["mine", "portfolio"]);
  });

  it("gives a user who manages nothing only portfolio-wide tasks", () => {
    expect(digestItemsForUser(items, "u9").map((i) => i.key)).toEqual(["portfolio"]);
  });
});
