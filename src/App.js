import React, { useState } from "react";
import Header from "./components/Header";
import MainContent from "./components/MainContent";

const App = () => {
    const [isMenuVisible, setIsMenuVisible] = useState(false); // 控制選單顯示

    const [selectedBuildId, setSelectedBuildId] = useState(0);
    const [selectedBuild, setSelectedBuild] = useState("輕型艦建造");

    const toggleMenu = () => setIsMenuVisible((prev) => !prev);

    return (
        <div>
            <Header toggleMenu={toggleMenu} />
            <MainContent
                isMenuVisible={isMenuVisible}
                setIsMenuVisible={setIsMenuVisible}
                selectedBuildId={selectedBuildId}
                setSelectedBuildId={setSelectedBuildId}
                selectedBuild={selectedBuild}
                setSelectedBuild={setSelectedBuild}
            />
        </div>
    );
};

export default App;
