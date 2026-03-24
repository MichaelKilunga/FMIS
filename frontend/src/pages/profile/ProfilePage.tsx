import { useState } from 'react'
import { PlusCircle, Search, Edit2, Key, Loader2, Save } from 'lucide-react'
import { useAuthStore } from '../../store'
import { authApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const [isLoading, setIsLoading] = useState(false)
  
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
  })
  const [avatar, setAvatar] = useState<File | null>(null)
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const fd = new FormData()
      fd.append('name', profileData.name)
      if (profileData.phone) fd.append('phone', profileData.phone)
      if (profileData.department) fd.append('department', profileData.department)
      if (avatar) fd.append('avatar', avatar)

      const res = await authApi.updateProfile(fd)
      setUser(res.data.user) // Update user without clearing token
      toast.success('Profile updated successfully')
      setAvatar(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await authApi.changePassword(passwordData)
      toast.success('Password changed successfully')
      setPasswordData({ current_password: '', password: '', password_confirmation: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0])
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 relative z-10">
        <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">My Profile</h1>
        <p className="text-slate-400">Manage your personal information and security settings</p>
      </div>

      <div className="flex gap-4 border-b border-slate-700/50 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'profile' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            General Info
          </div>
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'password' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Security
          </div>
        </button>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl shadow-xl backdrop-blur-sm">
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-24 h-24 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center shrink-0 overflow-hidden relative group">
                {avatar ? (
                  <img src={URL.createObjectURL(avatar)} alt="Avatar" className="w-full h-full object-cover" />
                ) : user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-slate-400">{user?.name?.charAt(0)}</span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <span className="text-xs font-medium text-white">Change</span>
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleAvatarChange} />
                </div>
              </div>
              
              <div className="space-y-4 flex-1 w-full">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileData.name}
                    onChange={(e) => setProfileData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Email <span className="text-slate-500 text-xs">(Read Only)</span></label>
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={user?.email || ''}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                    <input
                      type="text"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Department</label>
                    <input
                      type="text"
                      value={profileData.department}
                      onChange={(e) => setProfileData(p => ({ ...p, department: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-700/50">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 py-2 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passwordData.current_password}
                onChange={(e) => setPasswordData(p => ({ ...p, current_password: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordData.password}
                onChange={(e) => setPasswordData(p => ({ ...p, password: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordData.password_confirmation}
                onChange={(e) => setPasswordData(p => ({ ...p, password_confirmation: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="pt-4 border-t border-slate-700/50 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 py-2 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                Change Password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
