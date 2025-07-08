'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/lib/language-context';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface NoteType {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function NoteTypesSettings() {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [noteTypes, setNoteTypes] = useState<NoteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newNoteName, setNewNoteName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch note types
  const fetchNoteTypes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/note-types?includeInactive=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNoteTypes(data.data.noteTypes || []);
      } else {
        showToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to fetch note types'
        });
      }
    } catch (error) {
      console.error('Error fetching note types:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch note types'
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new note type
  const createNoteType = async () => {
    if (!newNoteName.trim()) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Note type name is required'
      });
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/note-types`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newNoteName.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNoteTypes(prev => [...prev, data.data]);
        setNewNoteName('');
        setShowAddForm(false);
        showToast({
          type: 'success',
          title: 'Success',
          message: 'Note type created successfully'
        });
      } else {
        const error = await response.json();
        showToast({
          type: 'error',
          title: 'Error',
          message: error.error?.message || 'Failed to create note type'
        });
      }
    } catch (error) {
      console.error('Error creating note type:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create note type'
      });
    } finally {
      setSaving(false);
    }
  };

  // Update note type
  const updateNoteType = async (id: string) => {
    if (!editingName.trim()) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Note type name is required'
      });
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/note-types/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingName.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNoteTypes(prev => prev.map(nt => nt.id === id ? data.data : nt));
        setEditingId(null);
        setEditingName('');
        showToast({
          type: 'success',
          title: 'Success',
          message: 'Note type updated successfully'
        });
      } else {
        const error = await response.json();
        showToast({
          type: 'error',
          title: 'Error',
          message: error.error?.message || 'Failed to update note type'
        });
      }
    } catch (error) {
      console.error('Error updating note type:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update note type'
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle note type status
  const toggleNoteTypeStatus = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/note-types/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNoteTypes(prev => prev.map(nt => nt.id === id ? data.data : nt));
        showToast({
          type: 'success',
          title: 'Success',
          message: data.message
        });
      } else {
        const error = await response.json();
        showToast({
          type: 'error',
          title: 'Error',
          message: error.error?.message || 'Failed to toggle note type status'
        });
      }
    } catch (error) {
      console.error('Error toggling note type status:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to toggle note type status'
      });
    }
  };

  // Delete note type
  const deleteNoteType = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the note type "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/note-types/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNoteTypes(prev => prev.filter(nt => nt.id !== id));
        showToast({
          type: 'success',
          title: 'Success',
          message: 'Note type deleted successfully'
        });
      } else {
        const error = await response.json();
        showToast({
          type: 'error',
          title: 'Error',
          message: error.error?.message || 'Failed to delete note type'
        });
      }
    } catch (error) {
      console.error('Error deleting note type:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete note type'
      });
    }
  };

  // Start editing
  const startEditing = (noteType: NoteType) => {
    setEditingId(noteType.id);
    setEditingName(noteType.name);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  useEffect(() => {
    fetchNoteTypes();
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">{t('loadingNoteTypes')}</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('noteTypesManagement')}</h2>
            <p className="text-gray-600 mt-1">
              {t('manageNoteTypesDescription')}
            </p>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2"
            disabled={showAddForm}
          >
            <Plus className="h-4 w-4" />
            {t('addNoteType')}
          </Button>
        </div>

        {/* Add New Note Type Form */}
        {showAddForm && (
          <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <Input
                placeholder={t('enterNoteTypeName')}
                value={newNoteName}
                onChange={(e) => setNewNoteName(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    createNoteType();
                  }
                }}
              />
              <Button
                onClick={createNoteType}
                disabled={saving || !newNoteName.trim()}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? t('savingChanges') : t('save')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewNoteName('');
                }}
                disabled={saving}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Note Types List */}
        <div className="space-y-3">
          {noteTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No note types found</p>
            </div>
          ) : (
            noteTypes.map((noteType) => (
              <Card key={noteType.id} className={`p-4 ${!noteType.isActive ? 'bg-gray-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {noteType.isActive ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                    
                    {editingId === noteType.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 max-w-md"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            updateNoteType(noteType.id);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <div>
                        <h3 className={`font-medium ${!noteType.isActive ? 'text-gray-500' : 'text-gray-900'}`}>
                          {noteType.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(noteType.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {editingId === noteType.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateNoteType(noteType.id)}
                          disabled={saving || !editingName.trim()}
                          className="flex items-center gap-1"
                        >
                          <Save className="h-3 w-3" />
                          {saving ? t('savingChanges') : t('save')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={saving}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleNoteTypeStatus(noteType.id)}
                          className="flex items-center gap-1"
                        >
                          {noteType.isActive ? (
                            <>
                              <ToggleRight className="h-4 w-4 text-green-500" />
                              Active
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                              Inactive
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(noteType)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteNoteType(noteType.id, noteType.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Statistics */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{noteTypes.length}</div>
              <div className="text-sm text-gray-600">{t('totalNoteTypes')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {noteTypes.filter(nt => nt.isActive).length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {noteTypes.filter(nt => !nt.isActive).length}
              </div>
              <div className="text-sm text-gray-600">Inactive</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}