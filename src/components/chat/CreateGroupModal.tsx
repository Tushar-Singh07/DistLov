import React, { useState } from 'react';
import { Users, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { useChat } from '../../context/ChatContext';

export const CreateGroupModal: React.FC = () => {
  const { isCreateGroupOpen, setIsCreateGroupOpen, allUsers, createGroup } = useChat();
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedIds.length === 0) return;
    setIsLoading(true);
    await createGroup(groupName, selectedIds);
    setIsLoading(false);
    setGroupName('');
    setSelectedIds([]);
    setIsCreateGroupOpen(false);
  };

  const otherUsers = allUsers.filter(u => u.id !== 'usr_me');

  return (
    <Modal
      isOpen={isCreateGroupOpen}
      onClose={() => setIsCreateGroupOpen(false)}
      title="Create New Group Chat"
      maxWidth="md"
    >
      <form onSubmit={handleCreate} className="space-y-4">
        <Input
          label="Group Name"
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          placeholder="e.g. Architecture Team 🛡️"
          required
        />

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Select Group Members ({selectedIds.length} selected)
          </label>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {otherUsers.map(user => {
              const isSelected = selectedIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleSelect(user.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-colors ${
                    isSelected
                      ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-300 dark:border-brand-700'
                      : 'bg-gray-50 dark:bg-dark-panel border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatarUrl} name={user.name} size="sm" />
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">{user.name}</h4>
                      <p className="text-[11px] text-gray-400">@{user.username}</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" size="sm" onClick={() => setIsCreateGroupOpen(false)} type="button">
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={isLoading}
            disabled={!groupName.trim() || selectedIds.length === 0}
            icon={<Users className="w-4 h-4" />}
          >
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
};
