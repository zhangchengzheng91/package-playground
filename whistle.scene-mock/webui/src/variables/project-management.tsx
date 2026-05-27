import { Button, Card, Drawer, Form, Input, Space, Table } from 'antd';
import type { TableProps } from 'antd';
import { useCallback, useState } from 'react';

type ProjectRow = {
  key: string;
  name: string;
  variableCount: number;
};

export default function ProjectManagement() {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [data, setData] = useState<ProjectRow[]>([]);

  const columns: TableProps<ProjectRow>['columns'] = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '变量数量',
      dataIndex: 'variableCount',
      key: 'variableCount',
      width: 120,
    },
  ];

  const handleClose = useCallback(() => {
    setOpen(false);
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(() => {
    form
      .validateFields()
      .then((values: { name: string }) => {
        setData((prev) => [
          ...prev,
          {
            key:
              globalThis.crypto?.randomUUID?.() ??
              `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: values.name.trim(),
            variableCount: 0,
          },
        ]);
        form.resetFields();
        setOpen(false);
      })
      .catch(() => {});
  }, [form]);

  return (
    <>
      <Card
        bordered={false}
        title="项目管理"
        id="test-set-open"
        extra={
          <Button
            type="primary"
            htmlType="button"
            onClick={() => {
              console.log('click 998');
              setOpen(true);
            }}
          >
            998新增项目xxxx
          </Button>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<ProjectRow>
          rowKey="key"
          columns={columns}
          dataSource={data}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
          locale={{ emptyText: '暂无项目' }}
        />
      </Card>
      <Drawer
        title="新增项目"
        placement="right"
        size="50%"
        open={open}
        onClose={handleClose}
        destroyOnHidden
        zIndex={1200}
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleClose}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              确定
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="项目名称"
            name="name"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
