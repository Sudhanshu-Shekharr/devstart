'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

export type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';

export interface ApplicationItem {
  id: string;
  userId: string;
  internshipId: string;
  status: ApplicationStatus;
  updatedAt: string;
  internship: {
    id: string;
    title: string;
    company: string;
    location?: string | null;
    stipend?: string | null;
    domain?: string[];
    skills?: string[];
    applyUrl?: string | null;
  };
}

export const COLUMNS: { id: ApplicationStatus; title: string; badgeStyle: string }[] = [
  { id: 'saved', title: 'Saved', badgeStyle: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
  { id: 'applied', title: 'Applied', badgeStyle: 'border-purple-500/30 text-purple-400 bg-purple-500/10' },
  { id: 'interview', title: 'Interview', badgeStyle: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
  { id: 'offer', title: 'Offer', badgeStyle: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
  { id: 'rejected', title: 'Rejected', badgeStyle: 'border-rose-500/30 text-rose-400 bg-rose-500/10' },
];

interface KanbanBoardProps {
  applications: ApplicationItem[];
  isLoading?: boolean;
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
}

// ─── Card Component ──────────────────────────────────────────────────────────

function ApplicationCard({ item, isOverlay = false }: { item: ApplicationItem; isOverlay?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { status: item.status, item },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const formattedDate = new Date(item.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-xl border border-[#1c1c1c] bg-black p-4 space-y-2.5 cursor-grab active:cursor-grabbing hover:border-[#333] transition-colors select-none group relative",
        isDragging && "opacity-30 border-foreground/40 shadow-xl",
        isOverlay && "opacity-90 border-foreground/60 shadow-2xl scale-105 bg-[#0f0f0f] cursor-grabbing"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-foreground text-sm font-semibold truncate leading-tight group-hover:text-foreground/90">
            {item.internship.title}
          </h4>
          <p className="text-muted/80 text-xs mt-0.5 truncate">
            {item.internship.company}
          </p>
        </div>
        <span className="text-[10px] text-foreground/30 shrink-0 font-mono">
          {formattedDate}
        </span>
      </div>

      {(item.internship.location || item.internship.stipend) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {item.internship.location && (
            <span className="text-[10px] text-muted border border-[#1c1c1c] rounded-md px-2 py-0.5 bg-foreground/[0.03]">
              📍 {item.internship.location}
            </span>
          )}
          {item.internship.stipend && (
            <span className="text-[10px] text-emerald-400/80 border border-emerald-500/20 rounded-md px-2 py-0.5 bg-emerald-500/5">
              💰 {item.internship.stipend}
            </span>
          )}
        </div>
      )}

      {item.internship.skills && item.internship.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {item.internship.skills.slice(0, 3).map((skill, i) => (
            <span
              key={i}
              className="text-[9px] text-muted/70 border border-[#1a1a1a] rounded px-1.5 py-0.5"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Droppable Column Component ─────────────────────────────────────────────

function KanbanColumn({
  column,
  items,
  isLoading,
}: {
  column: (typeof COLUMNS)[number];
  items: ApplicationItem[];
  isLoading?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-2xl border border-[#1c1c1c] bg-[#090909] p-4 min-h-[380px] transition-colors",
        isOver && "border-foreground/40 bg-foreground/[0.02]"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c] mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
            {column.title}
          </h3>
          <span
            className={cn(
              "text-[10px] font-semibold border rounded-full px-2 py-0.5",
              column.badgeStyle
            )}
          >
            {items.length}
          </span>
        </div>
      </div>

      {/* Column Items */}
      <div className="flex-1 space-y-3">
        {isLoading ? (
          // Skeleton Cards
          <div className="space-y-3 animate-pulse">
            <div className="h-24 rounded-xl border border-foreground/5 bg-foreground/5" />
            <div className="h-24 rounded-xl border border-foreground/5 bg-foreground/5 opacity-60" />
          </div>
        ) : items.length > 0 ? (
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item) => (
              <ApplicationCard key={item.id} item={item} />
            ))}
          </SortableContext>
        ) : (
          // Empty State per column
          <div className="h-32 flex flex-col items-center justify-center border border-dashed border-[#1c1c1c] rounded-xl text-center p-3">
            <p className="text-muted/40 text-xs font-light">
              No {column.title.toLowerCase()} applications
            </p>
            <p className="text-foreground/15 text-[10px] mt-1">
              Drag cards here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Kanban Board ───────────────────────────────────────────────────────

export function KanbanBoard({
  applications,
  isLoading = false,
  onStatusChange,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const activeItem = applications.find((app) => app.id === activeId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Optional intermediate drag handling if needed
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeAppId = String(active.id);
    const activeApp = applications.find((app) => app.id === activeAppId);
    if (!activeApp) return;

    let targetStatus: ApplicationStatus | null = null;

    // Check if dragged over a column container directly
    const overIdStr = String(over.id);
    const isColumn = COLUMNS.some((col) => col.id === overIdStr);

    if (isColumn) {
      targetStatus = overIdStr as ApplicationStatus;
    } else {
      // Dragged over another card, find its status
      const overApp = applications.find((app) => app.id === overIdStr);
      if (overApp) {
        targetStatus = overApp.status;
      }
    }

    if (targetStatus && targetStatus !== activeApp.status) {
      onStatusChange(activeAppId, targetStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Zero applications overall state banner */}
      {!isLoading && applications.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#1c1c1c] bg-[#090909] p-6 text-center mb-6 space-y-2">
          <p className="text-muted text-sm font-medium">
            Your application pipeline is currently empty.
          </p>
          <p className="text-muted/70 text-xs">
            Browse listings and click &quot;Save&quot; or &quot;Apply&quot; to add cards to your board!
          </p>
        </div>
      )}

      {/* 5 Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {COLUMNS.map((column) => {
          const columnItems = applications.filter((app) => app.status === column.id);
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              items={columnItems}
              isLoading={isLoading}
            />
          );
        })}
      </div>

      {/* Drag Overlay Ghost */}
      <DragOverlay>
        {activeItem ? <ApplicationCard item={activeItem} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
