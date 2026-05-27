import { App } from 'antd';

/**
 * Ant Design 根级 App，为 Drawer / Modal 等提供一致的弹层上下文。
 */
export default function AntdAppProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <App>{children}</App>;
}
