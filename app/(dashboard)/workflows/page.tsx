import PageHeader from '@/components/layout/PageHeader'
import WorkflowList from '@/components/workflows/WorkflowList'

export default function WorkflowsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Automations" />
      <div className="flex-1 p-6">
        <WorkflowList />
      </div>
    </div>
  )
}
