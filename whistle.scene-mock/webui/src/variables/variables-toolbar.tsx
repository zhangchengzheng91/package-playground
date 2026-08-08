import { Button, Drawer } from 'antd';
import { useState } from 'react';

export default function VariablesToolbar() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      <Button type="primary" onClick={() => setOpen(true)}>
        新增变量
      </Button>
      <Drawer
        title="新增变量"
        placement="right"
        size="50%"
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose
      />
    </div>
  );
}
