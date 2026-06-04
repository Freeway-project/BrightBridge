import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OrgNodeData = {
  label: string;
  type: 'unit' | 'member';
  title?: string;
  avatarUrl?: string;
  isExpanded?: boolean;
  hasChildren?: boolean;
};

export function OrgChartNode({ data, selected }: { data: OrgNodeData; selected?: boolean }) {
  const isUnit = data.type === 'unit';

  return (
    <div className="relative group">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-muted-foreground border-none"
      />
      
      <Card 
        className={cn(
          "w-[250px] shadow-sm transition-all duration-200",
          selected ? "ring-2 ring-primary border-primary shadow-md" : "hover:border-primary/50",
          isUnit ? "bg-muted/30" : "bg-card"
        )}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <Avatar className="h-10 w-10 border bg-background flex-shrink-0">
            {data.avatarUrl ? (
              <AvatarImage src={data.avatarUrl} alt={data.label} />
            ) : null}
            <AvatarFallback className={isUnit ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
              {isUnit ? <Folder className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold truncate" title={data.label}>
              {data.label}
            </span>
            {data.title && (
              <span className="text-xs text-muted-foreground truncate" title={data.title}>
                {data.title}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {data.hasChildren && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          <div 
            className={cn(
              "h-6 w-6 rounded-full border bg-background flex items-center justify-center shadow-sm text-xs cursor-pointer hover:bg-muted transition-colors text-muted-foreground",
              data.isExpanded && "bg-primary/10 text-primary border-primary/20"
            )}
            title={data.isExpanded ? "Collapse" : "Expand"}
          >
            {data.isExpanded ? "-" : "+"}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-muted-foreground border-none"
      />
    </div>
  );
}
