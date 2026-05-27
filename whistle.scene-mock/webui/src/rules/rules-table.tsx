import { Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { useEffect, useState } from 'react';

export type RuleRow = {
  index: number;
  name: string;
  data?: string;
  selected?: boolean;
};

export type RulesTableProps = {
  /** 变更后递增以重新拉取列表 */
  reloadKey?: number;
};

export default function RulesTable({ reloadKey = 0 }: RulesTableProps) {
  const [data, setData] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const res = await fetch('/cgi-bin/rules/list', {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { ec?: number; list?: RuleRow[] };
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
  }, [reloadKey]);

  const columns: TableProps<RuleRow>['columns'] = [
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
    <Table<RuleRow>
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
