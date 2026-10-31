import React, { useEffect, useState } from 'react'
import { resolveAssetUrl } from '../services/api'

function ProfileModal({ user, open, saving, onClose, onSave, onPrepareDefaultAvatar, onResolveDefaultAvatar }) {
  const [name, setName] = useState(user?.name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(resolveAssetUrl(user?.avatar))
  const [avatarAction, setAvatarAction] = useState('keep')
  const [defaultAvatarUrl, setDefaultAvatarUrl] = useState(user?.defaultAvatar || '')
  const [avatarPreviewFailed, setAvatarPreviewFailed] = useState(false)
  const [resolvingDefault, setResolvingDefault] = useState(false)
  const [preparingDefault, setPreparingDefault] = useState(false)
  const [error, setError] = useState('')
  const defaultAvatarPreview = resolveAssetUrl(defaultAvatarUrl || user?.defaultAvatar)
  const hasCustomAvatar = Boolean(avatarPreview)
  const isShowingDefaultAvatar = defaultAvatarPreview
    ? avatarPreview === defaultAvatarPreview && avatarAction !== 'remove'
    : !avatarPreview && avatarAction !== 'upload'
  const canResetToDefault = defaultAvatarPreview
    ? !isShowingDefaultAvatar
    : hasCustomAvatar || user?.hasGoogleAccount

  const clearBlobPreview = () => {
    if (avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }
  }

  useEffect(() => {
    if (open) {
      setName(user?.name || '')
      setUsername(user?.username || '')
      setAvatarFile(null)
      setAvatarPreview(resolveAssetUrl(user?.avatar))
      setAvatarAction('keep')
      setDefaultAvatarUrl(user?.defaultAvatar || '')
      setAvatarPreviewFailed(false)
      setResolvingDefault(false)
      setPreparingDefault(false)
      setError('')
    }
  }, [user, open])

  useEffect(() => {
    let isMounted = true

    if (!open || !user?.hasGoogleAccount || user?.defaultAvatar || !onPrepareDefaultAvatar) {
      return undefined
    }

    const prepareDefaultAvatar = async () => {
      try {
        setPreparingDefault(true)
        await onPrepareDefaultAvatar()
      } catch (prepareError) {
        if (isMounted) {
          setError(prepareError.message || 'Failed to prepare Google profile access')
        }
      } finally {
        if (isMounted) {
          setPreparingDefault(false)
        }
      }
    }

    prepareDefaultAvatar()

    return () => {
      isMounted = false
    }
  }, [open, user?.hasGoogleAccount, user?.defaultAvatar, onPrepareDefaultAvatar])

  useEffect(() => {
    const currentPreview = avatarPreview

    return () => {
      if (currentPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview)
      }
    }
  }, [avatarPreview])

  if (!open) {
    return null
  }

  const initials = (name || user?.name || 'DocMind User')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!name.trim() || !username.trim()) {
      setError('Display name and username are required')
      return
    }

    try {
      setError('')
      await onSave({ name, username, avatar: avatarFile, avatarAction, defaultAvatarUrl })
      onClose()
    } catch (saveError) {
      setError(saveError.message || 'Failed to update profile')
    }
  }

  const handleDefaultAvatar = async () => {
    if (!canResetToDefault || resolvingDefault || preparingDefault) {
      return
    }

    try {
      setError('')

      let nextDefaultAvatarUrl = defaultAvatarUrl || user?.defaultAvatar || ''

      if (!nextDefaultAvatarUrl && user?.hasGoogleAccount && onResolveDefaultAvatar) {
        setResolvingDefault(true)
        nextDefaultAvatarUrl = await onResolveDefaultAvatar()
      }

      clearBlobPreview()

      setAvatarFile(null)
      setDefaultAvatarUrl(nextDefaultAvatarUrl || '')
      setAvatarPreview(resolveAssetUrl(nextDefaultAvatarUrl) || null)
      setAvatarAction('default')
      setAvatarPreviewFailed(false)
    } catch (resolveError) {
      setError(resolveError.message || 'Failed to load your Google profile image')
    } finally {
      setResolvingDefault(false)
    }
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(event) => event.stopPropagation()}>
        <h2>Edit profile</h2>

        <form onSubmit={handleSubmit} className="profile-modal-form">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {avatarPreview && !avatarPreviewFailed ? (
                <img
                  src={avatarPreview}
                  alt={`${name || user?.name || 'DocMind User'} avatar`}
                  onError={() => setAvatarPreviewFailed(true)}
                />
              ) : (
                initials
              )}
            </div>
            <label className="profile-avatar-edit" aria-label="Edit avatar">
              <span>Edit</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/bmp,image/tiff,image/svg+xml,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tif,.tiff,.svg"
                className="profile-avatar-upload-input"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] || null

                  if (!nextFile) {
                    return
                  }

                  clearBlobPreview()

                  setAvatarFile(nextFile)
                  setAvatarPreview(URL.createObjectURL(nextFile))
                  setAvatarAction('upload')
                  setDefaultAvatarUrl(user?.defaultAvatar || defaultAvatarUrl || '')
                  setAvatarPreviewFailed(false)
                  setError('')
                }}
                disabled={saving || resolvingDefault || preparingDefault}
              />
            </label>
          </div>

          <div className="profile-avatar-actions">
            <button
              type="button"
              className="profile-avatar-action"
              onClick={() => {
                clearBlobPreview()

                setAvatarFile(null)
                setAvatarPreview(null)
                setAvatarAction('remove')
                setDefaultAvatarUrl(user?.defaultAvatar || defaultAvatarUrl || '')
                setAvatarPreviewFailed(false)
                setError('')
              }}
              disabled={saving || resolvingDefault || preparingDefault || !avatarPreview}
            >
              Remove
            </button>
            <button
              type="button"
              className="profile-avatar-action"
              onClick={handleDefaultAvatar}
              disabled={saving || resolvingDefault || preparingDefault || !canResetToDefault}
            >
              {resolvingDefault || preparingDefault ? 'Loading...' : 'Default'}
            </button>
          </div>

          <label className="profile-field">
            <span>Display name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError('')
              }}
              disabled={saving || resolvingDefault || preparingDefault}
            />
          </label>

          <label className="profile-field">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                setError('')
              }}
              disabled={saving || resolvingDefault || preparingDefault}
            />
          </label>

          {error && <div className="error-message">{error}</div>}

          <p className="profile-modal-note">
            Your profile helps people recognize you. Your display name and username
            shape how your DocMind workspace feels across the app.
          </p>

          <div className="profile-modal-actions">
            <button
              type="button"
              className="profile-btn-secondary"
              onClick={onClose}
              disabled={saving || resolvingDefault || preparingDefault}
            >
              Cancel
            </button>
            <button type="submit" className="profile-btn-primary" disabled={saving || resolvingDefault || preparingDefault}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfileModal
