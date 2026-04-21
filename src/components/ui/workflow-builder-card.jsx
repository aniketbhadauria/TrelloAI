import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const detailVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    marginTop: "1rem",
    transition: { duration: 0.3, ease: "easeInOut" },
  },
};

export const WorkflowBuilderCard = ({
  imageUrl,
  gradientClass,
  status,
  lastUpdated,
  title,
  description,
  tags,
  users,
  actions,
  className,
  onMoreClick,
  menuContent,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
      className={cn("w-full cursor-pointer", className)}
    >
      <Card className="overflow-hidden rounded-lg shadow-md transition-shadow duration-300 hover:shadow-xl">
        <div className="relative h-24 w-full sm:h-28">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className={cn("h-full w-full", gradientClass)} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        <div className="p-2.5 sm:p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <span>{lastUpdated}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      status === "Active" ? "bg-green-500" : "bg-red-500"
                    )}
                  />
                  <span>{status}</span>
                </div>
              </div>
              <h3 className="mt-0.5 text-sm sm:text-base font-semibold text-card-foreground leading-snug line-clamp-2">
                {title}
              </h3>
            </div>
            {onMoreClick && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoreClick(e); }}
                className="text-muted-foreground transition-colors hover:text-foreground shrink-0 p-0.5"
              >
                <MoreHorizontal className="size-4" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {isHovered && (
              <motion.div
                key="details"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={detailVariants}
                className="overflow-hidden"
              >
                <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
                {tags && tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5 h-5">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-border px-2.5 py-2 sm:px-3 sm:py-2.5">
          <div className="flex -space-x-1.5">
            {users && users.map((user, index) => (
              <Avatar key={index} className="h-6 w-6 border-2 border-card text-[9px]">
                <AvatarImage src={user.src} />
                <AvatarFallback>{user.fallback}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="flex items-center -space-x-1.5">
            {actions && actions.map(({ Icon, bgColor }, index) => (
              <div
                key={index}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-white",
                  bgColor
                )}
              >
                <Icon className="size-3" />
              </div>
            ))}
          </div>
        </div>
      </Card>
      {menuContent}
    </motion.div>
  );
};
