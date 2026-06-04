import { OrgChart, RawOrgNode } from '@/components/ui/org-chart';

const mockHierarchyData: RawOrgNode[] = [
  { id: '1', label: 'College of Science', type: 'unit' },
  { id: 'm1', parentId: '1', label: 'Dr. Alice Smith', title: 'Dean of Science', type: 'member' },
  { id: '2', parentId: '1', label: 'Mathematics Department', type: 'unit' },
  { id: 'm2', parentId: '2', label: 'Dr. Bob Jones', title: 'Department Head', type: 'member' },
  { id: 'm3', parentId: '2', label: 'Charlie Brown', title: 'Instructor', type: 'member' },
  { id: '3', parentId: '1', label: 'Physics Department', type: 'unit' },
  { id: 'm4', parentId: '3', label: 'Dr. Diana Prince', title: 'Department Head', type: 'member' },
  { id: 'm5', parentId: '3', label: 'Evan Wright', title: 'Instructor', type: 'member' },
  
  { id: '4', label: 'College of Arts', type: 'unit' },
  { id: 'm6', parentId: '4', label: 'Dr. Fiona Gallagher', title: 'Dean of Arts', type: 'member' },
  { id: '5', parentId: '4', label: 'History Department', type: 'unit' },
  { id: 'm7', parentId: '5', label: 'George Harrison', title: 'Instructor', type: 'member' }
];

export default function HierarchyPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organizational Hierarchy</h1>
        <p className="text-muted-foreground mt-2">
          Interactive organization chart displaying Colleges, Departments, and Staff. Click the +/- buttons to expand nodes.
        </p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <OrgChart data={mockHierarchyData} />
      </div>
    </div>
  );
}
