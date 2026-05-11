"use client";

import { AppstoreOutlined } from "@ant-design/icons";
import { Layout, Menu, theme } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

const { Header, Sider, Content } = Layout;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { token } = theme.useToken();

  const selectedKey =
    pathname === "/lianliankan" || pathname.startsWith("/lianliankan/")
      ? "lianliankan"
      : "";

  return (
    <Layout className="min-h-screen">
      <Header
        className="flex items-center"
        style={{ paddingInline: token.paddingLG }}
      >
        <Link
          href="/"
          className="text-white no-underline hover:text-white"
          style={{ fontSize: token.fontSizeLG, fontWeight: 600 }}
        >
          Package Playground
        </Link>
      </Header>
      <Layout>
        <Sider width={200} theme="light">
          <Menu
            mode="inline"
            selectedKeys={selectedKey ? [selectedKey] : []}
            style={{ height: "100%" }}
            items={[
              {
                key: "lianliankan",
                icon: <AppstoreOutlined />,
                label: <Link href="/lianliankan">连连看</Link>,
              },
            ]}
          />
        </Sider>
        <Content
          style={{
            margin: token.marginLG,
            padding: token.paddingLG,
            background: token.colorBgContainer,
            minHeight: 280,
            borderRadius: token.borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
