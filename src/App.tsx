import { IHostNavigationService } from "azure-devops-extension-api";
import * as DevOps from "azure-devops-extension-sdk";
import * as SDK from "azure-devops-extension-sdk";
import { Surface, SurfaceBackground } from "azure-devops-ui/Surface";
import { initializeIcons } from "office-ui-fabric-react/lib/Icons";
import * as React from "react";
import { Route, Router, Switch } from "react-router-dom";
import history from "./lib/history";
import HomePage from "./pages/home/home";
import Session from "./pages/session/session";


DevOps.getService<IHostNavigationService>(
    "ms.vss-features.host-navigation-service"
).then(navService => {
    
    const navigate = (hash: string) => {
        const path = hash ? hash.replace("#", "") : "";
        history.replace(path || "/");
    };

    // Listen to initial navigation update from host frame
    navService.getHash().then(navigate, () => {
        // If getHash fails, default to home route
        history.replace("/");
    });

    navService.onHashChanged(navigate);

    // Send navigation updates to host frame
    history.listen((location: any) => {
        navService.replaceHash(location.pathname || "/");
    });
});

initializeIcons();

class App extends React.Component {
    public render() {
        return (
            <Surface background={SurfaceBackground.neutral}>
                <Router history={history as any}>
                    <>
                        <Switch>
                            <Route
                                exact={true}
                                path="/create/:ids?"
                                component={HomePage}
                            />

                            <Route
                                exact={true}
                                path="/settings"
                                component={HomePage}
                            />
                            <Route exact={true} path="/" component={HomePage} />
                        </Switch>

                        <Route
                            exact={true}
                            path="/session/:id/:name?"
                            component={Session}
                        />
                    </>
                </Router>
            </Surface>
        );
    }
}

export default App;
