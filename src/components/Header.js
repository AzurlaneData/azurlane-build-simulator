import React from "react";

const Header = (props) => {
    return (
        <header style={styles.header}>
            <div style={styles.homeIcon} onClick={() => window.location.reload()}>
                <img src={`/resource/wisdomCube.png`} alt="" style={{ height: "50px" }} />
                <div style={{ marginLeft: "8px" }}>碧藍建造模擬</div>
            </div>
            <button style={styles.menuButton} onClick={props.toggleMenu}>
                選取建造池
            </button>
        </header>
    );
};

const styles = {
    header: {
        display: "flex",
        alignItems: "center",
        padding: "10px 20px",
        backgroundColor: "#222222",
        color: "white",
        height: "70px",
        boxSizing: "border-box",
        left: "0", // 確保占滿整個寬度
        width: "100%", // 占滿整個寬度
        zIndex: "1000", // 確保在其他內容之上
    },
    menuButton: {
        fontSize: "clamp(16px, 2vw, 20px)",
        fontWeight: "bold",
        marginLeft: "16px",
        padding: "8px",
        backgroundColor: "#555555",
        borderRadius: "8px",
        outline: "none",
        border: "none",
        color: "white",
        cursor: "pointer",
    },
    homeIcon: {
        fontSize: "clamp(16px, 2vw, 20px)",
        fontWeight: "bold",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
    },
};

export default Header;
