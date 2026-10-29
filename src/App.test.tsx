import * as React from "react";
import * as ReactDOM from "react-dom";

jest.mock("azure-devops-extension-sdk", () => ({
    getService: jest.fn(() =>
        Promise.resolve({
            getHash: jest.fn(() => Promise.resolve("")),
            onHashChanged: jest.fn(),
            replaceHash: jest.fn()
        })
    )
}));

jest.mock("office-ui-fabric-react/lib/Icons", () => ({
    initializeIcons: jest.fn()
}));

jest.mock("azure-devops-ui/Surface", () => ({
    Surface: () => null,
    SurfaceBackground: { neutral: 0 }
}));

jest.mock("./pages/home/home", () => () => null);
jest.mock("./pages/session/session", () => () => null);

import App from "./App";

it("renders without crashing", () => {
    const div = document.createElement("div");
    ReactDOM.render(<App />, div);
    ReactDOM.unmountComponentAtNode(div);
});
