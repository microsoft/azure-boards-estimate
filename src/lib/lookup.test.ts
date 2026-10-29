import { getLookupValue, toLookup } from "./lookup";

describe("lookup helpers", () => {
    it("indexes values by the selected key", () => {
        const records = [
            { id: "one", name: "First" },
            { id: "two", name: "Second" }
        ];

        expect(toLookup(records, record => record.id)).toEqual({
            one: records[0],
            two: records[1]
        });
    });

    it("uses the last value when keys repeat", () => {
        const records = [{ id: "same", value: 1 }, { id: "same", value: 2 }];

        expect(toLookup(records, record => record.id).same).toBe(records[1]);
    });

    it("returns undefined for missing keys or an absent lookup", () => {
        expect(getLookupValue({ known: "value" }, "missing")).toBeUndefined();
        expect(getLookupValue(undefined as any, "known")).toBeUndefined();
    });
});