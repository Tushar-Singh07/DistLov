import React, { useState, useEffect } from 'react';
import { Camera, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';

export const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || user?.avatarUrl || '');
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setProfilePhoto(user.profilePhoto || user.avatarUrl || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSaved(false);

    try {
      const updated = await userService.updateProfile({
        name,
        username,
        bio,
        profilePhoto: profilePhoto || null,
      });
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Public Profile</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Manage how you appear to other SecureConnect contacts.</p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex items-center gap-6">
        <div className="relative group">
          <Avatar src={profilePhoto || user?.avatarUrl} name={name || 'User'} size="xl" />
          <button
            type="button"
            onClick={() => alert('Photo URL reference can be updated in bio or future media upload phase.')}
            className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>
        <div>
          <Button variant="outline" size="sm" type="button" onClick={() => alert('Photo URL reference can be updated in bio or future media upload phase.')}>
            Change Avatar
          </Button>
          <p className="text-[11px] text-gray-400 mt-1">JPG, GIF or PNG. Reference URL.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} required />
        <Input label="Username" value={username} onChange={e => setUsername(e.target.value)} required />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">About Bio</label>
        <textarea
          rows={3}
          value={bio}
          onChange={e => setBio(e.target.value)}
          maxLength={500}
          className="w-full bg-white dark:bg-dark-panel text-gray-900 dark:text-gray-100 rounded-xl border border-gray-300 dark:border-gray-700 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          placeholder="Tell others a bit about yourself..."
        />
        <div className="text-[11px] text-gray-400 text-right mt-1">{bio.length}/500</div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
        {saved ? (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Changes saved successfully</span>
        ) : (
          <span />
        )}
        <Button variant="primary" type="submit" isLoading={isLoading} icon={<Save className="w-4 h-4" />}>
          Save Changes
        </Button>
      </div>
    </form>
  );
};

