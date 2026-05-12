import { useParams, useNavigate } from "react-router-dom";
import { useBoards } from "@/context/BoardContext";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import KanbanList from "./KanbanList";
import AddListForm from "./AddListForm";
import CardDetailModal from "@/features/cards/CardDetailModal";
import BoardMembersPanel from "@/features/members/BoardMembersPanel";
import InviteMemberModal from "@/features/members/InviteMemberModal";
import {
  ArrowLeft,
  Star,
  MoreHorizontal,
  X,
  Filter,
  Search,
  Calendar,
  Tag,
  Users,
  CheckSquare,
  Clock,
  Image as ImageIcon,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import {
  isPast,
  isToday,
  addDays,
  addWeeks,
  addMonths,
  isWithinInterval,
  subWeeks,
} from "date-fns";

interface SelectedCard {
  listId: string;
  cardId: string;
}

function getMemberIdentityKey(m: { id?: string; name: string }): string {
  const id = (m?.id || "").trim();
  if (id) return id;
  return (m?.name || "").trim().toLowerCase();
}

export default function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const {
    getBoard,
    getBoardRole,
    boardsLoading,
    handleDragEnd,
    updateBoard,
    toggleStarBoard,
    addList,
    deleteList,
    updateListTitle,
    addCard,
    deleteBoard,
  } = useBoards();
  const board = getBoard(boardId!);
  const role = getBoardRole(boardId!);
  const canEdit = role === "owner" || role === "admin" || role === "member";
  const canManageMembers = role === "owner" || role === "admin";

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);

  const [showFilter, setShowFilter] = useState(false);
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterMembers, setFilterMembers] = useState<string[]>([]);
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const [filterDueDate, setFilterDueDate] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterActivity, setFilterActivity] = useState<string[]>([]);

  useEffect(() => {
    if (board) setTitleValue(board.title);
  }, [board]);

  const allLabels = useMemo(() => {
    if (!board) return [];
    const map = new Map<string, { id: string; text: string; color: string }>();
    board.lists.forEach((l) =>
      l.cards.forEach((c) => c.labels?.forEach((lb) => map.set(lb.id, lb))),
    );
    return [...map.values()];
  }, [board]);

  const allMembers = useMemo(() => {
    if (!board) return [];
    const map = new Map<string, { id?: string; name: string; filterKey: string }>();
    board.lists.forEach((l) =>
      l.cards.forEach((c) =>
        (c.members || []).forEach((m) => {
          const memberKey = getMemberIdentityKey(m);
          if (!map.has(memberKey)) {
            map.set(memberKey, { ...m, filterKey: memberKey });
          }
        }),
      ),
    );
    return [...map.values()];
  }, [board]);

  const hasActiveFilters =
    filterKeyword ||
    filterMembers.length ||
    filterLabels.length ||
    filterDueDate.length ||
    filterStatus.length ||
    filterActivity.length;

  const toggleFilter = (_arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) =>
    setArr((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );

  const clearAllFilters = () => {
    setFilterKeyword("");
    setFilterMembers([]);
    setFilterLabels([]);
    setFilterDueDate([]);
    setFilterStatus([]);
    setFilterActivity([]);
  };

  const filteredLists = useMemo(() => {
    if (!board || !hasActiveFilters) return board?.lists || [];
    const now = new Date();
    return board.lists.map((list) => ({
      ...list,
      cards: list.cards.filter((card) => {
        if (filterKeyword) {
          const kw = filterKeyword.toLowerCase();
          const inTitle = card.title?.toLowerCase().includes(kw);
          const inDesc = card.description?.toLowerCase().includes(kw);
          const inLabels = card.labels?.some((l) =>
            l.text.toLowerCase().includes(kw),
          );
          const inMembers = (card.members || []).some((m) =>
            m.name.toLowerCase().includes(kw),
          );
          if (!inTitle && !inDesc && !inLabels && !inMembers) return false;
        }
        if (filterMembers.length) {
          const cardMemberKeys = (card.members || []).map(getMemberIdentityKey);
          if (
            filterMembers.includes("__none__") &&
            cardMemberKeys.length === 0
          ) {
            /* pass */
          } else if (
            filterMembers.some(
              (key) => key !== "__none__" && cardMemberKeys.includes(key),
            )
          ) {
            /* pass */
          } else return false;
        }
        if (filterLabels.length) {
          const cardLabelIds = (card.labels || []).map((l) => l.id);
          if (filterLabels.includes("__none__") && cardLabelIds.length === 0) {
            /* pass */
          } else if (
            filterLabels.some(
              (id) => id !== "__none__" && cardLabelIds.includes(id),
            )
          ) {
            /* pass */
          } else return false;
        }
        if (filterDueDate.length) {
          const due = card.dueDate ? new Date(card.dueDate) : null;
          const match = filterDueDate.some((f) => {
            if (f === "none") return !due;
            if (!due) return false;
            if (f === "overdue") return isPast(due) && !isToday(due);
            if (f === "nextDay")
              return isWithinInterval(due, {
                start: now,
                end: addDays(now, 1),
              });
            if (f === "nextWeek")
              return isWithinInterval(due, {
                start: now,
                end: addWeeks(now, 1),
              });
            if (f === "nextMonth")
              return isWithinInterval(due, {
                start: now,
                end: addMonths(now, 1),
              });
            return true;
          });
          if (!match) return false;
        }
        if (filterStatus.length) {
          const cl = card.checklist || [];
          const allDone = cl.length > 0 && cl.every((i) => i.completed);
          const match = filterStatus.some((f) => {
            if (f === "complete") return allDone;
            if (f === "incomplete") return !allDone;
            return true;
          });
          if (!match) return false;
        }
        if (filterActivity.length) {
          const lastComment = (card.comments || []).reduce((latest, c) => {
            const d = new Date(c.createdAt);
            return d > latest ? d : latest;
          }, new Date(0));
          const match = filterActivity.some((f) => {
            if (f === "1week") return lastComment > subWeeks(now, 1);
            if (f === "2weeks") return lastComment > subWeeks(now, 2);
            if (f === "4weeks") return lastComment > subWeeks(now, 4);
            if (f === "noActivity") return lastComment.getTime() === 0;
            return true;
          });
          if (!match) return false;
        }
        return true;
      }),
    }));
  }, [
    board,
    filterKeyword,
    filterMembers,
    filterLabels,
    filterDueDate,
    filterStatus,
    filterActivity,
    hasActiveFilters,
  ]);

  if (boardsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] gap-4">
        <p className="text-muted-foreground text-lg">Board not found</p>
        <Button onClick={() => navigate("/boards")}>Go home</Button>
      </div>
    );
  }

  const onDragEnd = (result: Parameters<typeof handleDragEnd>[1]) => handleDragEnd(boardId!, result);

  const handleTitleSubmit = () => {
    if (titleValue.trim() && titleValue !== board.title) {
      updateBoard(boardId!, { title: titleValue.trim() });
    } else {
      setTitleValue(board.title);
    }
    setEditingTitle(false);
  };

  const handleArchiveBoard = async () => {
    if (role !== "owner") return;
    const confirmed = globalThis.confirm(
      "Archive this board? You can restore it later from data if needed.",
    );
    if (!confirmed) return;
    try {
      await Promise.resolve(deleteBoard(boardId!));
      setShowMenu(false);
      navigate("/");
    } catch (error) {
      console.error("Failed to archive board:", error);
      globalThis.alert(
        "Unable to archive this board right now. Please try again.",
      );
    }
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col page-enter">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background/50 backdrop-blur-sm shrink-0 relative z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/boards")}
          className="gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Boards
        </Button>
        <div className="w-px h-6 bg-border/50" />

        {editingTitle ? (
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSubmit();
              if (e.key === "Escape") {
                setTitleValue(board.title);
                setEditingTitle(false);
              }
            }}
            className="text-lg font-bold bg-secondary/50 px-2 py-1 rounded-lg border border-primary/30 outline-none"
            autoFocus
          />
        ) : (
          <h1
            className="text-lg font-bold cursor-pointer hover:bg-secondary/30 px-2 py-1 rounded-lg transition-colors"
            onClick={() => canEdit && setEditingTitle(true)}
          >
            {board.title}
          </h1>
        )}

        <button
          onClick={() => toggleStarBoard(boardId!)}
          className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <Star
            className={`w-4 h-4 ${board.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        </button>

        <div className="flex-1" />

        {/* Members + Invite */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMembersPanel(true)}
            className="gap-1.5"
          >
            <Users className="w-4 h-4" />
            Members
          </Button>
          {canManageMembers && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteModal(true)}
              className="gap-1.5 text-xs h-8"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite
            </Button>
          )}
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilter((v) => !v)}
            className={`gap-1.5 ${hasActiveFilters ? "text-primary" : ""}`}
          >
            <Filter className="w-4 h-4" />
            Filter
            {hasActiveFilters ? (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                !
              </span>
            ) : null}
          </Button>
          {showFilter && (
            <>
              <div
                className="fixed inset-0 z-50"
                onClick={() => setShowFilter(false)}
              />
              <div className="absolute top-full right-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto animate-slide-down">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 sticky top-0 bg-card z-10 rounded-t-xl">
                  <span className="text-sm font-semibold">Filter</span>
                  <button
                    onClick={() => setShowFilter(false)}
                    className="p-1 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="p-4 space-y-5">
                  {/* Keyword */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Keyword
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={filterKeyword}
                        onChange={(e) => setFilterKeyword(e.target.value)}
                        placeholder="Enter a keyword..."
                        className="w-full h-8 pl-8 pr-3 text-sm bg-secondary/40 border border-border/50 rounded-lg outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Search cards, members, labels, and more.
                    </p>
                  </div>

                  {/* Members */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Members
                    </label>
                    <div className="space-y-1">
                      <FilterCheckbox
                        checked={filterMembers.includes("__none__")}
                        onChange={() =>
                          toggleFilter(
                            filterMembers,
                            setFilterMembers,
                            "__none__",
                          )
                        }
                        icon={
                          <Users className="w-4 h-4 text-muted-foreground" />
                        }
                        label="No members"
                      />
                      {allMembers.map((m) => (
                        <FilterCheckbox
                          key={m.filterKey}
                          checked={filterMembers.includes(m.filterKey)}
                          onChange={() =>
                            toggleFilter(
                              filterMembers,
                              setFilterMembers,
                              m.filterKey,
                            )
                          }
                          icon={<MemberAvatar name={m.name} />}
                          label={m.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Card Status */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5" />
                      Card status
                    </label>
                    <div className="space-y-1">
                      <FilterCheckbox
                        checked={filterStatus.includes("complete")}
                        onChange={() =>
                          toggleFilter(
                            filterStatus,
                            setFilterStatus,
                            "complete",
                          )
                        }
                        icon={
                          <CheckSquare className="w-4 h-4 text-green-400" />
                        }
                        label="Marked as complete"
                      />
                      <FilterCheckbox
                        checked={filterStatus.includes("incomplete")}
                        onChange={() =>
                          toggleFilter(
                            filterStatus,
                            setFilterStatus,
                            "incomplete",
                          )
                        }
                        icon={
                          <CheckSquare className="w-4 h-4 text-muted-foreground" />
                        }
                        label="Not marked as complete"
                      />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Due date
                    </label>
                    <div className="space-y-1">
                      {[
                        {
                          id: "none",
                          icon: (
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                          ),
                          label: "No dates",
                        },
                        {
                          id: "overdue",
                          icon: <Clock className="w-4 h-4 text-red-400" />,
                          label: "Overdue",
                        },
                        {
                          id: "nextDay",
                          icon: <Clock className="w-4 h-4 text-yellow-400" />,
                          label: "Due in the next day",
                        },
                        {
                          id: "nextWeek",
                          icon: <Clock className="w-4 h-4 text-blue-400" />,
                          label: "Due in the next week",
                        },
                        {
                          id: "nextMonth",
                          icon: <Clock className="w-4 h-4 text-cyan-400" />,
                          label: "Due in the next month",
                        },
                      ].map((item) => (
                        <FilterCheckbox
                          key={item.id}
                          checked={filterDueDate.includes(item.id)}
                          onChange={() =>
                            toggleFilter(
                              filterDueDate,
                              setFilterDueDate,
                              item.id,
                            )
                          }
                          icon={item.icon}
                          label={item.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Labels */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Labels
                    </label>
                    <div className="space-y-1">
                      <FilterCheckbox
                        checked={filterLabels.includes("__none__")}
                        onChange={() =>
                          toggleFilter(
                            filterLabels,
                            setFilterLabels,
                            "__none__",
                          )
                        }
                        icon={<Tag className="w-4 h-4 text-muted-foreground" />}
                        label="No labels"
                      />
                      {allLabels.map((lb) => (
                        <FilterCheckbox
                          key={lb.id}
                          checked={filterLabels.includes(lb.id)}
                          onChange={() =>
                            toggleFilter(filterLabels, setFilterLabels, lb.id)
                          }
                          icon={
                            <span
                              className="w-full h-6 rounded-md text-white text-xs font-medium flex items-center px-2"
                              style={{ backgroundColor: lb.color }}
                            >
                              {lb.text}
                            </span>
                          }
                          isLabel
                        />
                      ))}
                    </div>
                  </div>

                  {/* Activity */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Activity
                    </label>
                    <div className="space-y-1">
                      {[
                        { id: "1week", label: "Active in the last week" },
                        { id: "2weeks", label: "Active in the last two weeks" },
                        {
                          id: "4weeks",
                          label: "Active in the last four weeks",
                        },
                        {
                          id: "noActivity",
                          label: "Without activity in the last four weeks",
                        },
                      ].map((item) => (
                        <FilterCheckbox
                          key={item.id}
                          checked={filterActivity.includes(item.id)}
                          onChange={() =>
                            toggleFilter(
                              filterActivity,
                              setFilterActivity,
                              item.id,
                            )
                          }
                          label={item.label}
                        />
                      ))}
                    </div>
                  </div>

                  {hasActiveFilters ? (
                    <button
                      onClick={clearAllFilters}
                      className="w-full text-xs text-center py-2 text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Clear all filters
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl p-1 z-10 min-w-[220px] animate-slide-down">
              <button
                onClick={() => {
                  setShowMembersPanel(true);
                  setShowMenu(false);
                }}
                className="flex shrink-0 items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60 rounded-md transition-colors"
              >
                <Users className="w-4 h-4" />
                Members
              </button>
              <button
                onClick={() => {
                  setShowBackgroundPicker(true);
                  setShowMenu(false);
                }}
                className="flex shrink-0 items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60 rounded-md transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                Change background
              </button>
              <button
                onClick={handleArchiveBoard}
                className="flex shrink-0 items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Archive board
              </button>
            </div>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="list">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="kanban-board"
            >
              {filteredLists.map((list, index) => (
                <Draggable key={list.id} draggableId={list.id} index={index}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.draggableProps}>
                      <KanbanList
                        list={list}
                        dragHandleProps={provided.dragHandleProps}
                        onDeleteList={(listId) => deleteList(boardId!, listId)}
                        onUpdateListTitle={(listId, title) =>
                          updateListTitle(boardId!, listId, title)
                        }
                        onAddCard={(listId, title) =>
                          addCard(boardId!, listId, title)
                        }
                        onCardClick={(listId, cardId) =>
                          setSelectedCard({ listId, cardId })
                        }
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              <AddListForm onAdd={(title) => addList(boardId!, title)} />
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {selectedCard && (
        <CardDetailModal
          boardId={boardId!}
          listId={selectedCard.listId}
          cardId={selectedCard.cardId}
          onClose={() => setSelectedCard(null)}
        />
      )}

      {showBackgroundPicker && (
        <BoardBackgroundModal
          selected={board.backgroundImage || "/emerson.jpg"}
          onSelect={(imageUrl) =>
            updateBoard(boardId!, { backgroundImage: imageUrl })
          }
          onClose={() => setShowBackgroundPicker(false)}
        />
      )}

      {showMembersPanel && (
        <BoardMembersPanel
          boardId={boardId!}
          ownerId={board.ownerId}
          ownerName={board.ownerName}
          currentUserRole={role ?? undefined}
          onClose={() => setShowMembersPanel(false)}
          onMembersChange={() => {}}
        />
      )}

      {showInviteModal && (
        <InviteMemberModal
          boardId={boardId!}
          existingMemberIds={[board.ownerId!]}
          onClose={() => setShowInviteModal(false)}
          onInvited={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

const BOARD_IMAGE_OPTIONS = [
  { id: "emerson", label: "Emerson", url: "/emerson.jpg" },
  { id: "esperia", label: "Esperia", url: "/esperia.png" },
];

interface BoardBackgroundModalProps {
  selected: string;
  onSelect: (imageUrl: string) => void;
  onClose: () => void;
}

function BoardBackgroundModal({ selected, onSelect, onClose }: BoardBackgroundModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content bg-card border border-border rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Change board background</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {BOARD_IMAGE_OPTIONS.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => {
                onSelect(image.url);
                onClose();
              }}
              className={`rounded-lg overflow-hidden border transition-all ${
                selected === image.url
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-[1.02]"
                  : "hover:scale-[1.01] border-border/50"
              }`}
            >
              <div
                className="h-20 w-full bg-cover bg-center"
                style={{ backgroundImage: `url('${image.url}')` }}
              />
              <div className="px-2 py-1.5 text-xs font-medium text-left">
                {image.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const MEMBER_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
];

function getMemberColorLocal(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
      style={{ backgroundColor: getMemberColorLocal(name) }}
    >
      {initials}
    </div>
  );
}

interface FilterCheckboxProps {
  checked: boolean;
  onChange: () => void;
  icon?: React.ReactNode;
  label?: string;
  isLabel?: boolean;
}

function FilterCheckbox({ checked, onChange, icon, label, isLabel }: FilterCheckboxProps) {
  return (
    <button
      onClick={onChange}
      className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors text-left"
    >
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
          checked
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border"
        }`}
      >
        {checked && (
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
      {isLabel ? (
        <div className="flex-1">{icon}</div>
      ) : (
        <>
          {icon}
          <span className="text-sm">{label}</span>
        </>
      )}
    </button>
  );
}
