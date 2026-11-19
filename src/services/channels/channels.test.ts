import { defineIncomingOperation, defineOperation } from "./channels";

describe("channel operation contracts", () => {
    it("invokes outgoing work and dispatches incoming payloads to attached handlers", async () => {
        const sent: number[] = [];
        const operation = defineOperation<number>(async payload => {
            sent.push(payload);
        });
        const handler = jest.fn();
        operation.attachHandler(handler);

        await operation(12);
        operation.incoming(34);

        expect(sent).toEqual([12]);
        expect(handler).toHaveBeenCalledWith(34);
    });

    it("detaches handlers and supports incoming-only events", () => {
        const event = defineIncomingOperation<string>();
        const firstHandler = jest.fn();
        const secondHandler = jest.fn();
        event.attachHandler(firstHandler);
        event.attachHandler(secondHandler);

        event.incoming("before");
        event.detachHandler(firstHandler);
        event.incoming("after");

        expect(firstHandler.mock.calls).toEqual([["before"]]);
        expect(secondHandler.mock.calls).toEqual([["before"], ["after"]]);
        event.detachHandler(firstHandler);
    });
});