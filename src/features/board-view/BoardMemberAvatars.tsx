import type { BoardMember } from '@/types/board'
import { getAvatarColor, getUserInitials } from '@/utils/user'

interface BoardMemberAvatarsProps {
  members: BoardMember[]
}

export default function BoardMemberAvatars({ members }: BoardMemberAvatarsProps) {
  if (members.length === 0) return null

  return (
    <div className="flex items-center -space-x-1.5 mr-2">
      {members.slice(0, 5).map((m) => (
        <div
          key={m.userId}
          title={m.display_name || m.email || m.userId}
          className="w-8 h-8 rounded-full border-2 border-[#1e1e1e] flex items-center justify-center text-white shrink-0 shadow-md overflow-hidden bg-background"
        >
          {m.avatar_url ? (
            <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: getAvatarColor(m.userId) }}
            >
              {getUserInitials(m.display_name, m.email)}
            </div>
          )}
        </div>
      ))}
      {members.length > 5 && (
        <div className="w-8 h-8 rounded-full border-2 border-[#1e1e1e] bg-white/10 backdrop-blur flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-md">
          +{members.length - 5}
        </div>
      )}
    </div>
  )
}
