import { Button, Form, Input, Modal, Space, message } from 'antd';
import { useState } from 'react';
import RulesTable from './rules-table';

export default function RulesListPage() {
  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [form] = Form.useForm();

  const bumpReload = () => setReloadKey((k) => k + 1);

  const handleOk = async () => {
    try {
      const v = await form.validateFields();
      const name = String(v.name).trim();
      if (!name) {
        message.error('请输入规则名称');
        return;
      }
      if (name === 'Default') {
        message.error('不能使用名称 Default');
        return;
      }
      const listRes = await fetch('/cgi-bin/rules/list', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!listRes.ok) {
        message.error('无法校验规则列表');
        return;
      }
      const listJson = (await listRes.json()) as { list?: { name: string }[] };
      const exists =
        Array.isArray(listJson.list) &&
        listJson.list.some((r) => r.name === name);
      if (exists) {
        message.error(`规则「${name}」已存在`);
        return;
      }
      setConfirmLoading(true);
      const res = await fetch('/cgi-bin/rules/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          value: String(v.content ?? ''),
          clientId: '',
        }),
      });
      const json = (await res.json()) as { ec?: number };
      if (!res.ok || json.ec !== 0) {
        message.error('创建失败');
        return;
      }
      message.success('已创建');
      setOpen(false);
      form.resetFields();
      bumpReload();
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) {
        return;
      }
      message.error('创建失败');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <div>
        <Button type="primary" onClick={() => setOpen(true)}>
          新建规则
        </Button>
      </div>
      <RulesTable reloadKey={reloadKey} />
      <Modal
        title="新建规则"
        open={open}
        onOk={handleOk}
        confirmLoading={confirmLoading}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如 my-rule" autoComplete="off" />
          </Form.Item>
          <Form.Item name="content" label="规则内容">
            <Input.TextArea rows={8} placeholder="可选，创建后可继续编辑" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
