import React, { useState } from 'react';
import { StorageBlock } from '../../types';

interface BlockGridProps {
  blocks: StorageBlock[];
  highlightedFileId?: number | null;
  onSelectBlock?: (block: StorageBlock) => void;
  selectedBlockId?: number | null;
  compact?: boolean;
}

export const BlockGrid: React.FC<BlockGridProps> = ({
  blocks,
  highlightedFileId,
  onSelectBlock,
  selectedBlockId,
  compact = false
}) => {
  const [hoveredBlock, setHoveredBlock] = useState<StorageBlock | null>(null);

  return (
    <div className="relative">
      {/* Grid container */}
      <div
        className={`grid gap-1.5 p-3 bg-canvas-light/60 rounded-2xl border border-subtle-border ${
          compact
            ? 'grid-cols-10 sm:grid-cols-20'
            : 'grid-cols-5 sm:grid-cols-10 md:grid-cols-20'
        }`}
      >
        {blocks.map((b) => {
          const isFree = b.status === 'free';
          const isIndexNode = b.status === 'index_node';
          const isHighlighted = highlightedFileId && b.file_id === highlightedFileId;
          const isSelected = selectedBlockId && b.id === selectedBlockId;

          let bgStyle: React.CSSProperties = {};
          if (isFree) {
            bgStyle = { backgroundColor: '#FFFFFF' };
          } else if (isIndexNode) {
            bgStyle = { backgroundColor: '#181818', color: '#FFFFFF' };
          } else if (b.file_color) {
            bgStyle = { backgroundColor: b.file_color };
          } else {
            bgStyle = { backgroundColor: '#3B82F6' };
          }

          return (
            <button
              key={b.id || b.block_index}
              onClick={() => onSelectBlock && onSelectBlock(b)}
              onMouseEnter={() => setHoveredBlock(b)}
              onMouseLeave={() => setHoveredBlock(null)}
              style={bgStyle}
              className={`relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all duration-150 select-none group border ${
                isFree ? 'border-subtle-border text-ink-secondary/70' : 'border-black/10 text-white'
              } ${
                isHighlighted ? 'ring-2 ring-lime scale-105 z-10' : ''
              } ${
                isSelected ? 'ring-2 ring-ink-primary scale-110 z-20' : ''
              } hover:scale-110 hover:shadow-md hover:z-30`}
            >
              <span className={`text-[10px] font-mono leading-none ${isFree ? 'text-ink-secondary' : 'text-white/90 font-medium'}`}>
                {b.block_index}
              </span>
              {b.logical_block_index !== null && !isFree && (
                <span className="text-[8px] text-white/70 leading-none mt-0.5">
                  L:{b.logical_block_index}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Floating detail tooltip */}
      {hoveredBlock && (
        <div className="absolute top-2 right-2 pointer-events-none z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-subtle-border p-3 shadow-lg text-xs space-y-1 min-w-[180px] animate-fade-in">
          <div className="flex items-center justify-between font-mono font-bold text-ink-primary">
            <span>Block #{hoveredBlock.block_index}</span>
            <span
              className={`px-1.5 py-0.5 text-[9px] rounded-full uppercase ${
                hoveredBlock.status === 'free'
                  ? 'bg-canvas-light text-ink-secondary'
                  : hoveredBlock.status === 'index_node'
                  ? 'bg-black text-white'
                  : 'bg-lime/20 text-ink-primary'
              }`}
            >
              {hoveredBlock.status}
            </span>
          </div>
          {hoveredBlock.file_name ? (
            <>
              <div className="text-ink-primary font-medium truncate max-w-[200px]">
                {hoveredBlock.file_name}
              </div>
              <div className="text-[11px] text-ink-secondary">
                Logical Block: {hoveredBlock.logical_block_index ?? 'N/A'}
              </div>
              {hoveredBlock.next_block_index !== null && (
                <div className="text-[11px] text-ink-secondary">
                  Next Pointer: Block #{hoveredBlock.next_block_index}
                </div>
              )}
            </>
          ) : (
            <div className="text-ink-secondary italic">Available for allocation</div>
          )}
        </div>
      )}
    </div>
  );
};

