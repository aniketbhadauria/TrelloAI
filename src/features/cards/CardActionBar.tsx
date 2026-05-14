import { useState } from 'react'
import {
  Tag,
  Calendar,
  CheckSquare,
  Plus,
  Paperclip,
  X,
  Users,
  Zap,
  Flag,
  Shapes,
} from 'lucide-react'
import { useCardContext } from '@/context/CardContext'
import { getPriority, getCardType } from '@/utils/cardMeta'

export default function CardActionBar() {
  const { card, board, activeSection, setActiveSection } = useCardContext()
  const cardMembers = card.members ?? []
  const cardLabels = card.labels
  const checklist = card.checklist ?? []
  const attachments = card.attachments ?? []
  const activeSprint = (board.sprints ?? []).find((s) => s.id === card.sprintId)
  const priority = getPriority(card.priority)
  const cardType = getCardType(card.cardType)

  const toggleSection = (section: string) =>
    setActiveSection(activeSection === section ? null : section)

  const [showAddMenu, setShowAddMenu] = useState(false)

  const completedCount = checklist.filter((i) => i.completed).length

  const actionBtnClass = (section: string | null) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
      activeSection === section
        ? 'bg-primary/15 border-primary/40 text-primary'
        : 'bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
    }`

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      <div className="relative">
        <button
          className={actionBtnClass(showAddMenu ? '_addmenu' : null)}
          onClick={() => setShowAddMenu((v) => !v)}
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
        {showAddMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
            <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border/60 rounded-xl shadow-xl z-50 py-2 animate-slide-down">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 mb-1">
                <span className="text-sm font-semibold">Add to card</span>
                <button
                  onClick={() => setShowAddMenu(false)}
                  className="p-0.5 rounded hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              {[
                {
                  id: 'members',
                  icon: Users,
                  title: 'Assignee',
                  desc: 'Assign members to this card',
                },
                {
                  id: 'labels',
                  icon: Tag,
                  title: 'Labels',
                  desc: 'Organize, categorize, and prioritize',
                },
                {
                  id: 'priority',
                  icon: Flag,
                  title: 'Priority',
                  desc: 'Set urgency: urgent, high, medium, low',
                },
                {
                  id: 'type',
                  icon: Shapes,
                  title: 'Type',
                  desc: 'Feature, bug, improvement, task, chore',
                },
                {
                  id: 'sprint',
                  icon: Zap,
                  title: 'Sprint',
                  desc: 'Assign this card to a sprint',
                },
                {
                  id: 'dates',
                  icon: Calendar,
                  title: 'Dates',
                  desc: 'Start dates, due dates, and reminders',
                },
                { id: 'checklist', icon: CheckSquare, title: 'Checklist', desc: 'Add subtasks' },
                {
                  id: 'attachment',
                  icon: Paperclip,
                  title: 'Attachment',
                  desc: 'Add links, pages, and more',
                },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id)
                    setShowAddMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary/40 transition-colors"
                >
                  <item.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      {item.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button className={actionBtnClass('members')} onClick={() => toggleSection('members')}>
        <Users className="w-3.5 h-3.5" />
        Assignee
        {cardMembers.length > 0 && (
          <span className="w-4.5 h-4.5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">
            {cardMembers.length}
          </span>
        )}
      </button>

      <button className={actionBtnClass('labels')} onClick={() => toggleSection('labels')}>
        <Tag className="w-3.5 h-3.5" />
        Labels
        {cardLabels.length > 0 && (
          <span className="w-4.5 h-4.5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">
            {cardLabels.length}
          </span>
        )}
      </button>

      <button className={actionBtnClass('dates')} onClick={() => toggleSection('dates')}>
        <Calendar className="w-3.5 h-3.5" />
        Dates
      </button>

      <button className={actionBtnClass('checklist')} onClick={() => toggleSection('checklist')}>
        <CheckSquare className="w-3.5 h-3.5" />
        Checklist
        {checklist.length > 0 && (
          <span className="w-4.5 h-4.5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">
            {completedCount}/{checklist.length}
          </span>
        )}
      </button>

      <button className={actionBtnClass('priority')} onClick={() => toggleSection('priority')}>
        {priority ? (
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${priority.dot}`} />
        ) : (
          <Flag className="w-3.5 h-3.5" />
        )}
        {priority ? priority.label : 'Priority'}
      </button>

      <button className={actionBtnClass('type')} onClick={() => toggleSection('type')}>
        {cardType ? (
          <span className={`text-[10px] font-semibold ${cardType.color}`}>{cardType.label}</span>
        ) : (
          <>
            <Shapes className="w-3.5 h-3.5" />
            Type
          </>
        )}
      </button>

      <button className={actionBtnClass('sprint')} onClick={() => toggleSection('sprint')}>
        <Zap className="w-3.5 h-3.5" />
        {activeSprint ? (
          <span className="max-w-[80px] truncate">{activeSprint.name}</span>
        ) : (
          'Sprint'
        )}
      </button>

      <button className={actionBtnClass('attachment')} onClick={() => toggleSection('attachment')}>
        <Paperclip className="w-3.5 h-3.5" />
        Attachment
        {attachments.length > 0 && (
          <span className="w-4.5 h-4.5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">
            {attachments.length}
          </span>
        )}
      </button>
    </div>
  )
}
