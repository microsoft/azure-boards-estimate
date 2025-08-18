import * as AzureDevOpsAPI from "azure-devops-extension-api";
import * as DevOps from "azure-devops-extension-sdk";
import { Surface, SurfaceBackground } from "azure-devops-ui/Surface";
import { initializeIcons } from "office-ui-fabric-react/lib/Icons";
import * as React from "react";
import { Route, HashRouter as Router, Routes, useNavigate, useParams } from "react-router-dom";
import history from "./lib/history";
import HomePage from "./pages/home/home";
import Session from "./pages/session/session";

// Wrapper component to provide router props to HomePage
const HomePageWrapper: React.FC = () => {
    const navigate = useNavigate();
    const params = useParams();
    const mockHistory = { push: (path: string) => navigate(path) };
    const mockMatch = { params };
    
    return <HomePage navigate={navigate} params={params} history={mockHistory} match={mockMatch} />;
};

// Wrapper component to provide router props to Session  
const SessionWrapper: React.FC = () => {
    const navigate = useNavigate();
    const params = useParams();
    
    return <Session />;
};


DevOps.getService<AzureDevOpsAPI.IHostNavigationService>(
    "ms.vss-features.host-navigation-service"
).then(navService => {
    
    const navigate = (hash: string) => {
        history.replace(hash.replace("#", ""));
    };

    // Listen to initial navigation update from host frame
    navService.getHash().then(navigate, () => {
        /* ignore */
    });

    navService.onHashChanged(navigate);

    // Send navigation updates to host frame
    history.listen(x => {
  
   navService.replaceHash(x.location.pathname);

    });
});

initializeIcons();

class App extends React.Component {
    public render() {
        return (
            <Surface background={SurfaceBackground.neutral}>
                <Router>
                    <Routes>
                        <Route
                            path="/create/:ids?"
                            element={<HomePageWrapper />}
                        />
                        <Route
                            path="/settings"
                            element={<HomePageWrapper />}
                        />
                        <Route path="/" element={<HomePageWrapper />} />
                        <Route
                            path="/session/:id/:name?"
                            element={<SessionWrapper />}
                        />
                    </Routes>
                </Router>
            </Surface>
        );
    }
}

export default App;
