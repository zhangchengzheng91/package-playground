import type { MenuProps } from 'antd';
import { Layout, Menu } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';

const { Sider, Content } = Layout;

const menuItems: MenuProps['items'] = [
  {
    key: 'variables',
    label: '变量管理',
    children: [
      {
        key: '/variables/projects',
        label: <Link to="/variables/projects">项目管理</Link>,
      },
      {
        key: '/variables/search',
        label: <Link to="/variables/search">变量查询</Link>,
      },
    ],
  },
  {
    key: '/rules',
    label: <Link to="/rules">规则列表</Link>,
  },
];

export default function AppShell() {
  const { pathname } = useLocation();

  const selectedKeys = useMemo(() => {
    if (pathname.startsWith('/variables/projects')) {
      return ['/variables/projects'];
    }
    if (pathname.startsWith('/variables/search')) {
      return ['/variables/search'];
    }
    if (pathname.startsWith('/rules')) {
      return ['/rules'];
    }
    return [];
  }, [pathname]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
        <Sider width={220} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            defaultOpenKeys={['variables']}
            style={{ borderInlineEnd: 0 }}
            items={menuItems}
          />
        </Sider>
        <Content
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            margin: 24,
            padding: 24,
            minHeight: 280,
            background: '#fff',
            borderRadius: 8,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
