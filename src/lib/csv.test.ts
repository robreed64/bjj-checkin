import { describe, it, expect } from "vitest";
import { toCSV, csvResponse } from "./csv";

describe("toCSV", () => {
  it("joins headers and rows with CRLF", () => {
    expect(toCSV(["a", "b"], [[1, 2], [3, 4]])).toBe("a,b\r\n1,2\r\n3,4");
  });

  it("quotes cells containing commas", () => {
    expect(toCSV(["name"], [["Doe, Jane"]])).toBe('name\r\n"Doe, Jane"');
  });

  it("escapes embedded quotes by doubling them", () => {
    expect(toCSV(["q"], [['say "hi"']])).toBe('q\r\n"say ""hi"""');
  });

  it("quotes cells containing newlines", () => {
    expect(toCSV(["note"], [["line1\nline2"]])).toBe('note\r\n"line1\nline2"');
  });

  it("renders null and undefined as empty cells", () => {
    expect(toCSV(["a", "b", "c"], [[null, undefined, "x"]])).toBe("a,b,c\r\n,,x");
  });

  it("passes booleans and numbers through", () => {
    expect(toCSV(["a", "b"], [[true, 0]])).toBe("a,b\r\ntrue,0");
  });
});

describe("csvResponse", () => {
  it("sets csv content type and attachment filename", async () => {
    const res = csvResponse("members.csv", "a,b\r\n1,2");
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="members.csv"');
    expect(await res.text()).toBe("a,b\r\n1,2");
  });
});
