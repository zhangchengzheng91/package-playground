import { createRoot } from "react-dom/client";
import { ConfigProvider, Typography } from "antd";

const DOUBAO_URL = "https://www.doubao.com/";

function App() {
  return (
    <ConfigProvider>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
        }}
      >
        <Typography.Title level={4} style={{ marginBottom: 16, flexShrink: 0 }}>
          React + Ant Design + TypeScript（Rspack）998
        </Typography.Title>
        <iframe
          title="豆包"
          src={DOUBAO_URL}
          style={{
            flex: 1,
            width: "100%",
            minHeight: 0,
            border: "none",
            borderRadius: 8,
          }}
        />
      </div>
    </ConfigProvider>
  );
}

const el = document.getElementById("root");
if (el) {
  createRoot(el).render(<App />);
}
