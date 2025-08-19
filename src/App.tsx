import * as AzureDevOpsAPI from "azure-devops-extension-api";
import * as DevOps from "azure-devops-extension-sdk";
import { Surface, SurfaceBackground } from "azure-devops-ui/Surface";
import { initializeIcons } from "office-ui-fabric-react/lib/Icons";
import * as React from "react";
import { Route, HashRouter as Router, Routes, useNavigate, useParams, useLocation } from "react-router-dom";
import history from "./lib/history";
import HomePage from "./pages/home/home";
import Session from "./pages/session/session";

// Wrapper component to provide router props to HomePage
const HomePageWrapper: React.FC = () => {
    const navigate = useNavigate();
    const params = useParams();
    const location = useLocation();
    
    // Create match object that matches React Router v5 format
    const match = { 
        params, 
        path: location.pathname,
        url: location.pathname,
        isExact: true
    };
    
    // Create history object that uses the external history service
    const routerHistory = {
        push: (path: string) => {
            history.push(path);
            // Force re-navigation to trigger React Router update
            navigate(path);
        },
        replace: (path: string) => {
            history.replace(path);
            navigate(path, { replace: true });
        },
        go: (delta: number) => window.history.go(delta),
        goBack: () => window.history.back(),
        goForward: () => window.history.forward(),
        listen: (listener: any) => history.listen(listener),
        location: history.location,
        length: window.history.length
    };
    
    return <HomePage history={routerHistory} match={match} />;
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
        const path = hash.replace("#", "") || "/";
        if (history.location.pathname !== path) {
            history.replace(path);
        }
    };

    // Listen to initial navigation update from host frame
    navService.getHash().then(navigate, () => {
        /* ignore */
    });

    navService.onHashChanged(navigate);

    // Send navigation updates to host frame when history changes
    history.listen((location) => {
        navService.replaceHash(location.location.pathname);
    });
});

initializeIcons();

class App extends React.Component {
    public render() {
        return (
            <Surface background={SurfaceBackground.neutral}>
                <Router future={{ v7_relativeSplatPath: true }}>
                    <Routes>
                        <Route path="/create/:ids?" element={<HomePageWrapper />} />
                        <Route path="/settings" element={<HomePageWrapper />} />
                        <Route path="/" element={<HomePageWrapper />} />
                        <Route path="/session/:id/:name?" element={<SessionWrapper />} />
                    </Routes>
                </Router>
            </Surface>
        );
    }
}

export default App;
