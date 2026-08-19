import React from 'react';

interface Vertex {
  id: string;
  x: number;
  y: number;
  label?: string;
}

interface Edge {
  from: string;
  to: string;
  label?: string;
}

export interface DiagramData {
  type: string;
  vertices?: Vertex[];
  edges?: Edge[];
  labels?: boolean;
}

interface GeometryDiagramProps {
  data?: DiagramData | null;
}

export const GeometryDiagram: React.FC<GeometryDiagramProps> = ({ data }) => {
  if (!data || !data.vertices || !data.edges) return null;

  // Auto-calculate bounding box to scale SVG correctly
  const xs = data.vertices.map((v) => v.x);
  const ys = data.vertices.map((v) => v.y);
  const minX = Math.min(...xs) - 40;
  const maxX = Math.max(...xs) + 40;
  const minY = Math.min(...ys) - 40;
  const maxY = Math.max(...ys) + 40;
  const width = maxX - minX;
  const height = maxY - minY;

  const getVertex = (id: string) => data.vertices!.find((v) => v.id === id);

  return (
    <div className="flex justify-center my-4 overflow-x-auto p-4 bg-gray-50 rounded-lg shadow-inner">
      <svg
        viewBox={`${minX} ${minY} ${width} ${height}`}
        style={{ width: '100%', maxWidth: '300px', height: 'auto', direction: 'ltr' }}
      >
        {/* Edges */}
        {data.edges.map((edge, idx) => {
          const from = getVertex(edge.from);
          const to = getVertex(edge.to);
          if (!from || !to) return null;

          return (
            <g key={`edge-${idx}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="black"
                strokeWidth="2"
              />
              {edge.label && (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 5} // offset slightly above the line
                  textAnchor="middle"
                  fill="blue"
                  fontSize="12"
                  className="select-none"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Vertices */}
        {data.vertices.map((v, idx) => (
          <g key={`vertex-${idx}`}>
            <circle cx={v.x} cy={v.y} r="3" fill="black" />
            <text
              x={v.x}
              y={v.y - 10} // offset above the point
              textAnchor="middle"
              fill="black"
              fontSize="14"
              fontWeight="bold"
              className="select-none"
            >
              {v.label || v.id}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
