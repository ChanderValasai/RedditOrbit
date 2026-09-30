import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SubredditStream, RedditPost, SortOption, TimeRange, StreamDensity } from '../types/orbit';
import { StreamLane } from './StreamLane';

interface SortableStreamLaneProps {
  stream: SubredditStream;
  density: StreamDensity;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onRefresh: () => void;
  onChangeSort: (sort: SortOption) => void;
  onChangeTimeRange?: (timeRange: TimeRange) => void;
  onToggleCollapse: () => void;
  onSelectPost: (post: RedditPost) => void;
  onSimulateState?: (type: 'normal' | 'empty' | 'error') => void;
  streamIndex?: number;
  isMobileVisible?: boolean;
}

export const SortableStreamLane: React.FC<SortableStreamLaneProps> = ({
  isMobileVisible = true,
  ...props
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.stream.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    height: '100%',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`stream-lane-${props.stream.id}`}
      className={`h-[calc(100vh-120px)] transition-all duration-150 ${
        isMobileVisible ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'
      } ${isDragging ? 'pointer-events-none' : ''}`}
    >
      <StreamLane
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};
