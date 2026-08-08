import { Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { useEffect, useState } from 'react';

export type ValueRow = {
  index: number;
  name: string;
  data?: string;
  selected?: boolean;
};

export default function VariablesTable() {
  const [data, setData] = useState<ValueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/cgi-bin/values/list', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { ec?: number; list?: ValueRow[] };
        if (cancelled) return;
        if (json.ec === 0 && Array.isArray(json.list)) {
          setData(json.list);
        } else {
          setData([]);
        }
      } catch {
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: TableProps<ValueRow>['columns'] = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      ellipsis: true,
    },
    {
      title: '内容',
      dataIndex: 'data',
      key: 'data',
      ellipsis: true,
    },
    {
      title: '选中',
      dataIndex: 'selected',
      key: 'selected',
      width: 88,
      render: (v: boolean | undefined) =>
        v ? <Tag color="success">是</Tag> : <Tag>否</Tag>,
    },
  ];

  return (
    <Table<ValueRow>
      rowKey={(row) => `${row.index}:${row.name}`}
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
      }}
    />
  );
}
