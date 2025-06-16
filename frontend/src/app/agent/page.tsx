import AgentDashboard from '@/components/agent/agent-dashboard';
import AgentLayout from '@/components/agent/agent-layout';

export default function AgentPage() {
  return (
    <AgentLayout>
      <AgentDashboard />
    </AgentLayout>
  );
}