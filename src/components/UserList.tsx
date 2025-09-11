import React from 'react'
import { Users } from 'lucide-react'
import { usePostsAndUsers } from '@/services/optimizedApi'
import { StandardizedAvatar } from './common/StandardizedAvatar'

const UserList: React.FC = () => {
  const { data, isLoading } = usePostsAndUsers()
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Active Users
        </h2>
      </div>
      <div className="p-4 space-y-3">
        {data?.users?.slice(0, 5).map(user => (
          <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <StandardizedAvatar
              user={{
                id: user.id,
                name: user.name,
                email: user.email,
                avatar_seed: user.avatar_seed,
                avatar_saturation: user.avatar_saturation,
                avatar_lightness: user.avatar_lightness
              }}
              size={40}
              showName={true}
              showEmail={true}
              nameClassName="font-medium"
              emailClassName="text-sm text-gray-600"
            />
            <span className={`text-xs px-2 py-1 rounded ${
              user.role === 'admin' ? 'bg-red-100 text-red-800' :
              user.role === 'moderator' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {user.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UserList