import React from 'react'
import { FileText } from 'lucide-react'
import { usePostsAndUsers } from '@/services/optimizedApi'

const PostList: React.FC = () => {
  const { data, isLoading } = usePostsAndUsers()
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
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
          <FileText className="w-5 h-5" />
          Recent Posts
        </h2>
      </div>
      <div className="p-4 space-y-3">
        {data?.posts?.slice(0, 5).map(post => (
          <div key={post.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <h3 className="font-medium">{post.title}</h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.content}</p>
            <div className="flex justify-between items-center mt-2">
              <span className={`text-xs px-2 py-1 rounded ${
                post.status === 'published' ? 'bg-green-100 text-green-800' :
                post.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {post.status}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PostList