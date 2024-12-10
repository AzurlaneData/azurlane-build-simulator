import React, { useEffect, useState } from "react";
import Build from "./Build";

const MainContent = (props) => {
    const [builds, setBuilds] = useState([]);
    const [buildIds, setBuildIds] = useState([]);
    const [pickups, setPickups] = useState([]);

    const [mappingData, setMappingData] = useState({}); // 儲存從 JSON 檔案載入的資料

    const rarityMapping = { N: 1, R: 2, SR: 3, SSR: 4, UR: 5, ALL: 6 };

    // 讀取 JSON 文件並解析
    useEffect(() => {
        fetch("/resource/buildList.json")
            .then((response) => response.json())
            .then((data) => {
                const buildNames = data.map((item) => item["bName"]);
                const buildIds = data.map((item) => item["bid"]);
                const pickups = data.map((item) => item["pickups"]);
                setBuilds(buildNames);
                setBuildIds(buildIds);
                setPickups(pickups);
                if (buildNames.length > 0) props.setSelectedBuild(buildNames[0]); // 預設選中第一頁
            })
            .catch((error) => console.error("Error loading JSON:", error));

        fetch("/resource/mapping.json")
            .then((response) => response.json())
            .then((data) => setMappingData(data))
            .catch((error) => console.error("Error loading mapping.json:", error));
    }, []);

    const renderMenuItem = (build, index) => {
        const firstPickup = pickups[index]?.[0]; // 獲取該 index 的第一個 pickup
        const result = Object.values(mappingData).find((data) => data.cid === firstPickup);

        return (
            <div
                key={index}
                style={{
                    ...styles.menuItem,
                    backgroundColor: props.selectedBuild === build ? "#888888" : "#444444",
                    color: props.selectedBuild === build ? "#FFFFFF" : "#EEEEEE",
                }}
                onClick={() => {
                    props.setSelectedBuild(build);
                    props.setSelectedBuildId(index);
                    props.setIsMenuVisible(false);
                }}
            >
                {result ? (
                    <div style={styles.imageContainer}>
                        {/* 角色圖片 */}
                        <img
                            src={`https://github.com/Fernando2603/AzurLane/blob/main/images/skins/${result.id}/qicon.png`}
                            alt={result.name}
                            style={styles.foregroundImageIcon}
                            onError={(e) => (e.target.style.display = "none")}
                        />
                    </div>
                ) : (
                    <div style={styles.imageContainer}>
                        {/* 角色圖片 */}
                        <img
                            src={`https://github.com/Fernando2603/AzurLane/blob/main/images/skins/100000/qicon.png`}
                            alt=""
                            style={styles.foregroundImageIcon}
                            onError={(e) => (e.target.style.display = "none")}
                        />
                    </div>
                )}
                <p style={styles.menuText}>{build}</p>
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <main style={styles.main}>
                {/* 上方選單 */}
                {props.isMenuVisible && <div style={styles.menu}>{builds.map((build, index) => renderMenuItem(build, index))}</div>}

                {/* 下方內容區域 */}
                <div style={styles.content}>{props.selectedBuild ? <Build selectedBuild={props.selectedBuild} selectedBuildId={props.selectedBuildId} /> : <p>加載中...</p>}</div>
            </main>
        </div>
    );
};

const styles = {
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#222222",
    },
    main: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: "100%",
        backgroundColor: "#222222",
    },
    menu: {
        width: "100%",
        backgroundColor: "#DDDDDD",
        boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
        display: "flex",
        flexWrap: "wrap", // 允許換行
        justifyContent: "space-around", // 均勻分佈項目
    },
    menuItem: {
        flexBasis: "11%", // 預設寬度（每行約9個）
        minWidth: "110px",
        padding: "6px",
        color: "#FFFFFF",
        margin: "6px",
        borderRadius: "8px",
        textAlign: "center",
        cursor: "pointer",
        transition: "background-color 0.3s",
        boxSizing: "border-box", // 使padding和margin不會影響寬度
    },
    content: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
    },
    foregroundImageIcon: {
        position: "relative",
        top: 0,
        left: 0,
        width: "60%",
        height: "50%",
        zIndex: 2,
    },
    menuText: {
        marginTop: "0",
        marginBottom: "0",
        fontSize: "clamp(14px, 2vw, 16px)",
        fontWeight: "bold",
    },
};

export default MainContent;
