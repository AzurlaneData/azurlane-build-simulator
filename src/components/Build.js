import React, { useEffect, useState } from "react";

const Build = (props) => {
    const [mappingData, setMappingData] = useState({}); // 儲存從 JSON 檔案載入的資料
    const [buildListData, setBuildListData] = useState({}); //

    const [allResults, setAllResults] = useState([]); // 儲存所有抽取結果，每次抽取為一個子陣列
    const [currentResult, setCurrentResult] = useState([]); // 儲存最新一次的抽取結果

    const rarityMapping = { N: 1, R: 2, SR: 3, SSR: 4, UR: 5, ALL: 6 };

    // 讀取 mapping.json
    useEffect(() => {
        fetch("/resource/mapping.json")
            .then((response) => response.json())
            .then((data) => setMappingData(data))
            .catch((error) => console.error("Error loading mapping.json:", error));
        fetch("/resource/buildList.json")
            .then((response) => response.json())
            .then((data) => setBuildListData(data))
            .catch((error) => console.error("Error loading buildList.json:", error));
    }, []);

    useEffect(() => {
        setAllResults([]);
        setCurrentResult([]);
    }, [props.selectedBuildId]);

    const generateProbabilities = () => {
        // 創建 percentages 和 pickupPercentages 的副本以避免修改原始資料
        const pickups = [...buildListData[props.selectedBuildId].pickups];
        const pickupPercentages = [...buildListData[props.selectedBuildId].pickupPercentages];
        const percentages = [...buildListData[props.selectedBuildId].percentages];
        const combinedBid = buildListData[props.selectedBuildId].combinedBid;

        const lists =
            combinedBid && buildListData[combinedBid]?.lists
                ? [...buildListData[combinedBid].lists] // 使用副本以避免意外修改原始資料
                : [...buildListData[props.selectedBuildId]?.lists];

        const probabilities = [];

        // 處理 pickups
        pickups.forEach((pickupCid, i) => {
            const result = Object.values(mappingData).find((item) => item.cid === pickupCid);
            if (result) {
                const rarityLevel = rarityMapping[result.rarity];

                lists.forEach((list) => {
                    const index = list.indexOf(pickupCid);
                    if (index !== -1) {
                        list.splice(index, 1); // 移除該項目
                    }
                });
                probabilities.push({
                    id: result.id,
                    cid: result.cid,
                    rarityLevel,
                    chance: pickupPercentages[i],
                });
                // 減少該稀有度的機率
                percentages[rarityLevel - 1] -= pickupPercentages[i];

                // 檢查是否有負數
                if (percentages[rarityLevel - 1] < 0) {
                    console.warn(`Warning: Negative percentage for rarity ${rarityLevel}`);
                    percentages[rarityLevel - 1] = 0; // 防止後續運算出錯
                }
            }
        });

        // 處理 lists
        lists.forEach((list, rarityIndex) => {
            if (list.length > 0) {
                const chancePerItem = percentages[rarityIndex] / list.length;
                list.forEach((cid) => {
                    const result = Object.values(mappingData).find((item) => item.cid === cid);
                    if (result) {
                        probabilities.push({
                            id: result.id,
                            cid: result.cid,
                            rarityLevel: rarityIndex + 1,
                            chance: chancePerItem,
                        });
                    }
                });
            }
        });

        console.log(probabilities);

        return probabilities;
    };

    const draw = (probabilities, times) => {
        if (probabilities.length === 0) return []; // 檢查是否有機率資料

        const cumulativeRanges = [];
        let cumulative = 0;

        // 建立累積範圍
        probabilities.forEach(({ id, cid, rarityLevel, chance }) => {
            cumulative += chance;
            cumulativeRanges.push({ id, cid, rarityLevel, range: cumulative });
        });

        // 確保累積範圍的總和為 100（處理誤差）
        const totalChance = cumulativeRanges[cumulativeRanges.length - 1]?.range || 0;
        if (totalChance < 100) {
            const adjustment = 100 - totalChance;
            cumulativeRanges[cumulativeRanges.length - 1].range += adjustment;
        }

        const results = [];
        for (let i = 0; i < times; i++) {
            const random = Math.random() * 100; // 生成 0~100 的隨機數
            const drawn = cumulativeRanges.find((item) => random <= item.range) || cumulativeRanges[cumulativeRanges.length - 1]; // 找不到範圍時回傳最後一個項目
            results.push(drawn);
        }

        return results;
    };

    const handleDraw = (times) => {
        const probabilities = generateProbabilities();
        const results = draw(probabilities, times);

        setCurrentResult(results);

        setAllResults((prev) => {
            if (prev.length === 0) {
                // 初始化第一個子陣列
                return [results];
            } else {
                // 更新最後一個子陣列
                const updatedResults = [...prev];
                updatedResults[updatedResults.length - 1] = [...updatedResults[updatedResults.length - 1], ...results];
                return updatedResults;
            }
        });
    };

    const getRarityBackground = (rarity) => {
        const rarityLevel = rarityMapping[rarity] || 1; // 預設為 1 (N)
        return `/resource/rarity/star_level_card_${rarityLevel}.png`;
    };

    const getRarityBackgroundIcon = (rarity) => {
        const rarityLevel = rarityMapping[rarity] || 1; // 預設為 1 (N)
        return `/resource/rarity/rarity_bg_${rarityLevel}.png`;
    };

    const renderPickupItem = () => {
        const pickups = buildListData[props.selectedBuildId]?.pickups || [];
        const pickupPercentages = buildListData[props.selectedBuildId]?.pickupPercentages || [];
        if (!pickups) return null;

        const results = [];

        pickups.forEach((cid, i) => {
            const result = Object.values(mappingData).find((data) => data.cid === cid);
            results.push(result);
        });

        const allCids = allResults.flatMap((allResult) => allResult.map((item) => item.cid));

        return results.map((result, i) => {
            // 若某個結果為 null，則顯示一個替代項目
            if (!result) {
                return (
                    <div key={`empty-${i}`} style={styles.resultItemIcon}>
                        <div style={styles.imageContainerIconN}>
                            <p style={{ color: "red", textAlign: "center" }}>找不到資料</p>
                        </div>
                    </div>
                );
            }

            const isInAllResults = allCids.includes(result.cid);

            // 正常渲染項目
            return (
                <div
                    key={result.cid || i}
                    style={{
                        ...styles.resultItemIcon,
                        width: "11vw", // 使用相對寬度，使其隨螢幕縮小
                    }}
                >
                    <div
                        style={
                            rarityMapping[result.rarity] === 1
                                ? styles.imageContainerIconN
                                : rarityMapping[result.rarity] === 2
                                ? styles.imageContainerIconR
                                : rarityMapping[result.rarity] === 3
                                ? styles.imageContainerIconSR
                                : rarityMapping[result.rarity] === 4
                                ? styles.imageContainerIconSSR
                                : rarityMapping[result.rarity] === 5
                                ? styles.imageContainerIconUR
                                : styles.imageContainerIconN
                        }
                    >
                        {/* 背景圖片 */}
                        <img src={getRarityBackgroundIcon(result.rarity)} alt="Background" style={{ ...styles.backgroundImageIcon, filter: isInAllResults ? "none" : "brightness(0.5)" }} />
                        {/* 前景圖片 */}
                        <img
                            src={`https://github.com/Fernando2603/AzurLane/blob/main/images/skins/${result.id}/icon.png`}
                            alt={result.name}
                            style={{
                                ...styles.foregroundImageIcon,
                                filter: isInAllResults ? "none" : "brightness(0.5)", // 如果在 allResults 中，則設置為黑白
                            }}
                            onError={(e) => (e.target.style.display = "none")} // 當圖片載入失敗時隱藏
                            title={`${result.twName}`}
                        />
                    </div>
                    {/* 顯示文字內容 */}
                    <p style={{ ...styles.textIcon, fontSize: "clamp(14px, 2vw, 16px)" }}>{result.twName}</p>
                    <p style={{ ...styles.textIcon, fontSize: "clamp(14px, 2vw, 16px)" }}>{pickupPercentages[i]}%</p>
                </div>
            );
        });
    };

    const renderResultItem = (item, index) => {
        const result = Object.values(mappingData).find((data) => data.cid === item.cid);
        if (!result) return null;

        return (
            <div
                key={`${result.id}-${index}`}
                style={
                    rarityMapping[result.rarity] === 1
                        ? styles.resultItemN
                        : rarityMapping[result.rarity] === 2
                        ? styles.resultItemR
                        : rarityMapping[result.rarity] === 3
                        ? styles.resultItemSR
                        : rarityMapping[result.rarity] === 4
                        ? styles.resultItemSSR
                        : rarityMapping[result.rarity] === 5
                        ? styles.resultItemUR
                        : styles.resultItemN
                }
            >
                <div style={styles.imageContainer}>
                    <img src={getRarityBackground(result.rarity)} alt="Background" style={styles.backgroundImage} />
                    <img
                        src={`https://github.com/Fernando2603/AzurLane/blob/main/images/skins/${result.id}/shipyard.png`}
                        alt={result.name}
                        style={styles.foregroundImage}
                        onError={(e) => (e.target.style.display = "none")}
                        title={`${result.twName}`}
                    />
                </div>
                <p style={styles.text}>{result.twName}</p>
            </div>
        );
    };

    const renderResultItemIcon = (item, index) => {
        const result = Object.values(mappingData).find((data) => data.cid === item.cid);
        if (!result) return null;

        return (
            <div key={`${result.id}-${index}`} style={styles.resultItemIcon}>
                <div
                    style={
                        rarityMapping[result.rarity] === 1
                            ? styles.imageContainerIconN
                            : rarityMapping[result.rarity] === 2
                            ? styles.imageContainerIconR
                            : rarityMapping[result.rarity] === 3
                            ? styles.imageContainerIconSR
                            : rarityMapping[result.rarity] === 4
                            ? styles.imageContainerIconSSR
                            : rarityMapping[result.rarity] === 5
                            ? styles.imageContainerIconUR
                            : styles.imageContainerIconN
                    }
                >
                    <img src={getRarityBackgroundIcon(result.rarity)} alt="Background" style={styles.backgroundImageIcon} />
                    <img
                        src={`https://github.com/Fernando2603/AzurLane/blob/main/images/skins/${result.id}/icon.png`}
                        alt={result.name}
                        style={styles.foregroundImageIcon}
                        onError={(e) => (e.target.style.display = "none")}
                        title={`${result.twName}`}
                    />
                </div>
                <p
                    style={{
                        ...styles.textIcon,
                        whiteSpace: "nowrap", // 禁止換行
                        fontSize: "clamp(10px, 2vw, 16px)",
                    }}
                >
                    {result.twName}
                </p>
            </div>
        );
    };

    const countResult = () => {
        // 將 allResults 中的所有 cid 和 rarityLevel 提取出來
        const allCids = allResults.flatMap((allResult) => allResult.map((item) => item.cid));
        const allRarities = allResults.flatMap((allResult) => allResult.map((item) => item.rarityLevel));

        // 從 buildListData 中取得 pickups
        const pickups = buildListData[props.selectedBuildId]?.pickups || [];

        // 計算每個 pickup 出現的次數
        const pickupCounts = pickups.map((pickup) => {
            return allCids.filter((cid) => cid === pickup).length; // 返回該 pickup 出現的次數
        });

        const rarityCounts = [1, 2, 3, 4, 5].map((rarity) => {
            return allRarities.filter((rarityLevel) => rarityLevel === rarity).length; // 計算每個稀有度的次數
        });

        return (
            <div>
                <table>
                    <tr>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                <img src={getRarityBackgroundIcon("ALL")} alt="" style={{ width: "6vw", maxWidth: "40px" }} />
                            </div>
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                <img src={getRarityBackgroundIcon("N")} alt="" style={{ width: "6vw", maxWidth: "40px" }} />
                            </div>
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                <img src={getRarityBackgroundIcon("R")} alt="" style={{ width: "6vw", maxWidth: "40px" }} />
                            </div>
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                <img src={getRarityBackgroundIcon("SR")} alt="" style={{ width: "6vw", maxWidth: "40px" }} />
                            </div>
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                <img src={getRarityBackgroundIcon("SSR")} alt="" style={{ width: "6vw", maxWidth: "40px" }} />
                            </div>
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                <img src={getRarityBackgroundIcon("UR")} alt="" style={{ width: "6vw", maxWidth: "40px" }} />
                            </div>
                        </td>
                        {pickups.map((pickup, index) => {
                            const count = pickupCounts[index]; // 獲取該角色的出現次數
                            const result = Object.values(mappingData).find((data) => data.cid === pickup);
                            if (result) {
                                return (
                                    <td key={pickup} style={{ width: "6vw", maxWidth: "40px", textAlign: "center", verticalAlign: "middle" }}>
                                        <div
                                            style={{
                                                position: "relative",
                                                width: "100%", // 確保容器寬度正確
                                                height: "6vw", // 給定具體的高度
                                                maxHeight: "40px",
                                                backgroundColor: "#f0f0f0", // 設置背景色檢查容器大小
                                                display: "flex",
                                                justifyContent: "center", // 水平居中
                                                alignItems: "center", // 垂直居中
                                            }}
                                        >
                                            {/* 背景圖片 */}
                                            <img
                                                src={`/resource/rarity/rarity_bg_${rarityMapping[result.rarity]}.png`}
                                                alt={result.name}
                                                style={{
                                                    position: "absolute",
                                                    top: 0,
                                                    left: 0,
                                                    width: "100%",
                                                    height: "100%",
                                                    zIndex: 1,
                                                }}
                                                onError={(e) => (e.target.style.display = "none")} // 處理圖片加載錯誤
                                            />
                                            {/* 角色圖標 */}
                                            <img
                                                src={`https://github.com/Fernando2603/AzurLane/blob/main/images/skins/${result.id}/icon.png`}
                                                alt={result.name}
                                                style={{
                                                    position: "absolute",
                                                    top: 0,
                                                    left: 0,
                                                    width: "100%",
                                                    height: "100%",
                                                    zIndex: 2,
                                                }}
                                                onError={(e) => (e.target.style.display = "none")} // 處理圖片加載錯誤
                                            />
                                        </div>
                                    </td>
                                );
                            }
                            return null; // 若該角色無效或出現次數為 0，則不顯示
                        })}
                    </tr>

                    <tr>
                        <td style={{ textAlign: "center", verticalAlign: "middle", fontSize: "clamp(14px, 2vw, 16px)" }}>{rarityCounts.reduce((a, b) => a + b)}</td>

                        {/* 顯示 rarityCounts */}
                        {rarityCounts.map((count, index) => (
                            <td key={`rarity-${index}`} style={{ textAlign: "center", verticalAlign: "middle", fontSize: "clamp(14px, 2vw, 16px)" }}>
                                {count}
                            </td>
                        ))}

                        {/* 顯示 pickupCounts */}
                        {pickupCounts.map((pickupCount, index) => (
                            <td key={`pickup-${index}`} style={{ textAlign: "center", verticalAlign: "middle", fontSize: "clamp(14px, 2vw, 16px)" }}>
                                {pickupCount}
                            </td>
                        ))}
                    </tr>
                </table>
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <div style={{ marginTop: "16px", fontSize: "clamp(16px, 2vw, 20px)", fontWeight: "bold" }}>{props.selectedBuild}</div>
            <div style={{ display: "flex", gap: "1vw", marginTop: "16px" }}>{renderPickupItem()}</div>
            <div style={{ marginTop: "24px" }}>{countResult()}</div>

            <div style={{ display: "flex", gap: "1vw" }}>
                <button style={{ ...styles.button, backgroundColor: "#FFF200FF", color: "#000000" }} onClick={() => handleDraw(1)}>
                    單次建造
                </button>
                <button style={{ ...styles.button, backgroundColor: "#FFA200FF", color: "#000000" }} onClick={() => handleDraw(10)}>
                    十連建造
                </button>
                <button style={{ ...styles.button, backgroundColor: "#FF5E00FF", color: "#000000" }} onClick={() => handleDraw(100)}>
                    百連建造
                </button>
                <button
                    style={styles.button}
                    onClick={() => {
                        setAllResults([]);
                        setCurrentResult([]);
                    }}
                >
                    重置結果
                </button>
            </div>

            {currentResult.length > 0 ? (
                <div>
                    <div style={{ marginTop: "10px", textAlign: "center", marginBottom: "10px", fontWeight: "bold", fontSize: "clamp(16px, 2vw, 20px)" }}>本次建造</div>
                    <div style={styles.section}>
                        <div style={styles.resultsGrid}>{currentResult.map(renderResultItem)}</div>
                    </div>
                </div>
            ) : (
                <p></p>
            )}

            {allResults.length > 0 ? (
                <div>
                    <div style={{ marginTop: "40px", textAlign: "center", marginBottom: "15px", fontWeight: "bold", fontSize: "clamp(16px, 2vw, 20px)" }}>建造列表</div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1vw", marginTop: "1%", marginBottom: "1vw" }}>
                        {allResults.map((results, index) => (
                            <div
                                key={index}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(10, 1fr)",
                                    gap: "1vw",
                                    justifyItems: "center",
                                }}
                            >
                                {results.map(renderResultItemIcon)}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{ height: "30vw" }}></div>
            )}
        </div>
    );
};

const resultItem = {
    backgroundColor: "#FFFFFF",
    borderRadius: "8px",
    overflow: "hidden",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    width: "17vw", // 使用相對寬度，使其隨螢幕縮小
    maxWidth: "150px", // 最大寬度設定，避免過於放大
};

const imageContainerIcon = {
    position: "relative",
    width: "100%",
    paddingBottom: "100%", // 維持方形比例
    backgroundColor: "#FFFFFF", // 預設背景顏色
    boxSizing: "border-box", // 確保邊框不會影響到容器的大小
};

const styles = {
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100%", // 設置初始高度
        minHeight: "100vh", // 確保容器至少與視窗同高
        boxSizing: "border-box",
        alignItems: "center",
        overflowY: "auto", // 啟用垂直滾動
    },
    button: {
        padding: "10px 10px",
        marginTop: "1vw",
        marginBottom: "20px",
        backgroundColor: "#007BFF",
        color: "#FFFFFF",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        fontSize: "clamp(14px, 2vw, 16px)",
        fontWeight: "bold",
        alignSelf: "center",
    },
    section: {
        padding: "2vw",
        backgroundColor: "#555555",
        borderRadius: "8px",
        textAlign: "center",
        marginTop: "1vw",
    },
    sectionIcon: {
        backgroundColor: "#EEEEEE",
        borderRadius: "8px",
        textAlign: "center",
        marginTop: "1vw",
    },
    resultsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)", // 每行5個元素
        gap: "2vw", // 每個項目之間的間距
        justifyContent: "center",
        alignItems: "center",
    },
    resultsGridIcon: {
        display: "grid",
        gridTemplateColumns: "repeat(10, 0fr)", // 每行10個元素
        gap: "1vw", // 每個項目之間的間距
        justifyContent: "center",
        alignItems: "center",
    },
    resultItemN: {
        ...resultItem,
        filter: "drop-shadow(0 0 2px #AAAAAA)", // 增加灰色發光
    },
    resultItemR: {
        ...resultItem,
        filter: "drop-shadow(0 0 2px #33CCFF)", // 增加藍色發光
    },
    resultItemSR: {
        ...resultItem,
        filter: "drop-shadow(0 0 4px #9900FF)", // 增加紫色發光
    },
    resultItemSSR: {
        ...resultItem,
        filter: "drop-shadow(0 0 15px #FFFF66)", // 增加黃色發光
    },
    resultItemUR: {
        ...resultItem,
        filter: "drop-shadow(0 0 15px #FF5900)", // 增加紅色發光
    },
    resultItemIcon: {
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "8.5vw", // 使用相對寬度，使其隨螢幕縮小
        maxWidth: "80px", // 最大寬度設定，避免過於放大
    },
    imageContainer: {
        position: "relative",
        width: "100%",
        paddingBottom: "133%", // 保持圖片比例為4:3
        backgroundColor: "#FFFFFF", // 預設背景顏色
    },
    imageContainerIconN: {
        ...imageContainerIcon,
        border: "2px solid #AAAAAA", // 設定邊框顏色為黑色，寬度為2px
    },
    imageContainerIconR: {
        ...imageContainerIcon,
        border: "2px solid #33CCFF", // 設定邊框顏色為黑色，寬度為2px
    },
    imageContainerIconSR: {
        ...imageContainerIcon,
        border: "2px solid #9900FF", // 設定邊框顏色為黑色，寬度為2px
    },
    imageContainerIconSSR: {
        ...imageContainerIcon,
        border: "2px solid #FFFF66", // 設定邊框顏色為黑色，寬度為2px
    },
    imageContainerIconUR: {
        ...imageContainerIcon,
        border: "2px solid #FF0000", // 設定邊框顏色為黑色，寬度為2px
    },
    backgroundImage: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
    },
    foregroundImage: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 2,
    },
    backgroundImageIcon: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
    },
    foregroundImageIcon: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 2,
    },
    text: {
        margin: ".5vw",
        fontSize: "clamp(14px, 2vw, 18px)",
        color: "#333333",
        fontWeight: "bold",
        overflow: "hidden", // 防止文字溢出
        textOverflow: "ellipsis", // 當文字過長時顯示省略號
    },
    textIcon: {
        marginTop: ".3vw",
        fontSize: "16px",
        color: "#333333",
        fontWeight: "bold",
        overflow: "hidden", // 防止文字溢出
        textOverflow: "ellipsis", // 當文字過長時顯示省略號
        margin: 2, // 去除外邊距
        padding: 0, // 去除內邊距
    },
};

export default Build;
