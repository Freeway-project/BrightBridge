'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  Position,
  BackgroundVariant,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { OrgChartNode, OrgNodeData } from './org-chart-node';

export type RawOrgNode = {
  id: string;
  parentId?: string | null;
  label: string;
  type: 'unit' | 'member';
  title?: string;
  avatarUrl?: string;
};

const nodeTypes = {
  orgNode: OrgChartNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 260;
const nodeHeight = 100;

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'TB') {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

interface OrgChartProps {
  data: RawOrgNode[];
  initialExpandedLevel?: number;
}

export function OrgChart({ data, initialExpandedLevel = 1 }: OrgChartProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Initialize tree
  useEffect(() => {
    // Find levels to auto-expand
    const expanded = new Set<string>();
    
    const rootNodes = data.filter(n => !n.parentId);
    rootNodes.forEach(rn => expanded.add(rn.id));

    // Simple level expansion (just roots for now)
    setExpandedNodes(expanded);
  }, [data]);

  // Compute graph based on expanded set
  useEffect(() => {
    const visibleNodeIds = new Set<string>();
    
    // Always show root nodes
    const rootNodes = data.filter(n => !n.parentId);
    rootNodes.forEach(rn => visibleNodeIds.add(rn.id));

    // Iteratively add children of expanded nodes
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of data) {
        if (node.parentId && expandedNodes.has(node.parentId) && !visibleNodeIds.has(node.id)) {
          visibleNodeIds.add(node.id);
          changed = true;
        }
      }
    }

    const newNodes: Node[] = data
      .filter(n => visibleNodeIds.has(n.id))
      .map(n => {
        const hasChildren = data.some(child => child.parentId === n.id);
        const isExpanded = expandedNodes.has(n.id);
        
        return {
          id: n.id,
          type: 'orgNode',
          position: { x: 0, y: 0 },
          data: {
            label: n.label,
            type: n.type,
            title: n.title,
            avatarUrl: n.avatarUrl,
            hasChildren,
            isExpanded
          } as OrgNodeData
        };
      });

    const newEdges: Edge[] = [];
    newNodes.forEach(node => {
      const rawNode = data.find(r => r.id === node.id);
      if (rawNode?.parentId && visibleNodeIds.has(rawNode.parentId)) {
        newEdges.push({
          id: `e-${rawNode.parentId}-${node.id}`,
          source: rawNode.parentId,
          target: node.id,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'hsl(var(--primary))', strokeWidth: 1.5, opacity: 0.6 }
        });
      }
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      newNodes,
      newEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [data, expandedNodes, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setExpandedNodes(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
        return next;
      });
    },
    []
  );

  return (
    <div className="w-full h-full min-h-[600px] border rounded-md bg-muted/10 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
        <Controls />
        <Panel position="top-left" className="bg-background/80 p-2 text-sm rounded-md shadow-sm border backdrop-blur-sm">
          <strong>Interactive Hierarchy</strong>
          <p className="text-muted-foreground text-xs">Click the + / - icons to expand or collapse</p>
        </Panel>
      </ReactFlow>
    </div>
  );
}
