import React from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult, 
  DroppableProvided, 
  DroppableStateSnapshot,
  DraggableProvided,
  DraggableStateSnapshot,
  DraggableRubric
} from '@hello-pangea/dnd';
import { Activity } from '@/types/trip';

interface DragAndDropContextProps {
  activities: Record<string, Activity>;
  onDragEnd: (result: DropResult) => void;
  children: React.ReactNode;
}

/**
 * Provides drag and drop context for the itinerary
 */
export function DragAndDropContextWrapper({ activities, onDragEnd, children }: DragAndDropContextProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {children}
    </DragDropContext>
  );
}

interface DroppableContainerProps {
  droppableId: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A container that can have draggable items dropped into it
 */
export function DroppableContainer({ droppableId, children, className = '' }: DroppableContainerProps) {
  return (
    <Droppable droppableId={droppableId}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={className}
        >
          {children}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

interface DraggableItemProps {
  draggableId: string;
  index: number;
  children: React.ReactNode;
  className?: string;
  isDragDisabled?: boolean;
}

/**
 * An item that can be dragged within a droppable container
 */
export function DraggableItem({ 
  draggableId, 
  index, 
  children, 
  className = '',
  isDragDisabled = false 
}: DraggableItemProps) {
  return (
    <Draggable 
      draggableId={draggableId} 
      index={index}
      isDragDisabled={isDragDisabled}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`${className} ${snapshot.isDragging ? 'shadow-lg' : ''}`}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.8 : 1,
            transform: snapshot.isDragging
              ? `${provided.draggableProps.style?.transform} rotate(1deg)`
              : 'none',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <div className="flex items-start">
            <div 
              {...provided.dragHandleProps}
              className="h-8 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-move"
              aria-label="Drag to reorder"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="12" r="1" />
                <circle cx="9" cy="5" r="1" />
                <circle cx="9" cy="19" r="1" />
                <circle cx="15" cy="12" r="1" />
                <circle cx="15" cy="5" r="1" />
                <circle cx="15" cy="19" r="1" />
              </svg>
            </div>
            <div className="flex-1">
              {children}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

/**
 * Reorders an array of items based on drag and drop
 */
export function reorder<T>(
  list: T[],
  startIndex: number,
  endIndex: number
): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

/**
 * Moves an item from one list to another
 */
export function move<T>(
  source: T[],
  destination: T[],
  droppableSource: { index: number; droppableId: string },
  droppableDestination: { index: number; droppableId: string },
  getKey: (item: T) => string = (item: any) => item.id
): { [key: string]: T[] } {
  const sourceClone = Array.from(source);
  const destClone = Array.from(destination);
  
  // If source and destination are the same, handle reordering within the same list
  if (droppableSource.droppableId === droppableDestination.droppableId) {
    const reordered = reorder(sourceClone, droppableSource.index, droppableDestination.index);
    return {
      [droppableSource.droppableId]: reordered
    };
  }
  
  // Move between different lists
  const [removed] = sourceClone.splice(droppableSource.index, 1);
  if (removed) {
    destClone.splice(droppableDestination.index, 0, removed);
  }

  return {
    [droppableSource.droppableId]: sourceClone,
    [droppableDestination.droppableId]: destClone
  };
}
