import { MiniMap } from '@xyflow/react';

function nodeColor(node: { type?: string }): string {
  switch (node.type) {
    case 'systemNode': return '#1a1d27';
    case 'groupNode': return '#2a2d3e';
    case 'connectionNode': return '#374151';
    default: return '#1a1d27';
  }
}

export function MiniMapStyled() {
  return (
    <MiniMap
      nodeColor={nodeColor}
      maskColor="rgba(15,17,23,0.8)"
      style={{
        backgroundColor: '#0f1117',
        border: '1px solid #2a2d3e',
        borderRadius: 8,
      }}
    />
  );
}
