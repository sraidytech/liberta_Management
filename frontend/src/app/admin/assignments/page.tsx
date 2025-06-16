import AssignmentDashboard from '@/components/admin/assignment-dashboard';
import AdminLayout from '@/components/admin/admin-layout';

export default function AssignmentsPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <AssignmentDashboard />
      </div>
    </AdminLayout>
  );
}