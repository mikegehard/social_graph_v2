import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, TrendingUp, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";

interface SwipeableRecordingCardProps {
  conversation: {
    id: string;
    title: string | null;
    recordedAt: Date;
  };
  displayTitle: string;
  stats: {
    introsOffered: number;
    introsMade: number;
  };
  onClick: () => void;
  onDelete: () => void;
}

export default function SwipeableRecordingCard({
  conversation,
  displayTitle,
  stats,
  onClick,
  onDelete,
}: SwipeableRecordingCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);
  const MAX_DRAG = 400; // Full width swipe allowed
  
  // Delete button smoothly appears and grows as you drag
  const deleteButtonOpacity = useTransform(x, [0, -80, -200], [0, 0.4, 1]);
  const _deleteButtonScale = useTransform(x, [0, -80, -200], [0.3, 0.7, 1]);
  
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const deleteThreshold = -MAX_DRAG * 0.6; // Delete when dragged 60% across
    
    if (info.offset.x < deleteThreshold) {
      // User dragged far enough - delete!
      setIsDeleting(true);
      x.set(-MAX_DRAG);
      onDelete();
    } else if (info.velocity.x < -500) {
      // Or if flicked quickly to the left
      setIsDeleting(true);
      x.set(-MAX_DRAG);
      onDelete();
    } else {
      // Snap back to start
      x.set(0);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    x.set(-MAX_DRAG);
    onDelete();
  };

  const handleCardClick = () => {
    if (x.get() < -10) {
      x.set(0);
    } else {
      onClick();
    }
  };

  return (
    <div 
      ref={constraintsRef}
      className="relative overflow-hidden rounded-lg"
      data-testid={`swipeable-card-${conversation.id}`}
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-end bg-destructive px-6"
        style={{ 
          opacity: deleteButtonOpacity,
        }}
      >
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center justify-center text-destructive-foreground p-2"
          data-testid={`button-delete-conversation-${conversation.id}`}
        >
          <Trash2 className="h-6 w-6" />
        </button>
      </motion.div>
      
      <motion.div
        drag="x"
        dragConstraints={{ left: -MAX_DRAG, right: 0 }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10"
      >
        <Card
          className="p-4 hover-elevate cursor-pointer bg-card"
          onClick={handleCardClick}
          data-testid={`card-conversation-${conversation.id}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold mb-2 truncate">
                {displayTitle}
              </h4>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className={`h-3.5 w-3.5 ${stats.introsOffered > 0 ? 'text-sky-400' : 'text-muted-foreground'}`} />
                  <span className={stats.introsOffered > 0 ? 'text-sky-400' : 'text-muted-foreground'}>
                    {stats.introsOffered} intro{stats.introsOffered !== 1 ? 's' : ''} offered
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1.5">
                  <TrendingUp className={`h-3.5 w-3.5 ${stats.introsMade > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                  <span className={stats.introsMade > 0 ? 'text-emerald-400' : 'text-muted-foreground'}>
                    {stats.introsMade} intro{stats.introsMade !== 1 ? 's' : ''} made
                  </span>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {format(conversation.recordedAt, 'h:mm a')}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
