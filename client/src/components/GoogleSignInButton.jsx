import React, { useEffect, useRef, useState } from 'react'

const GOOGLE_GSI_SCRIPT_ID = 'google-identity-services'
const GOOGLE_GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

const loadGoogleScript = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  const existingScript = document.getElementById(GOOGLE_GSI_SCRIPT_ID)
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener('error', reject, { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = GOOGLE_GSI_SCRIPT_ID
    script.src = GOOGLE_GSI_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google sign-in'))
    document.head.appendChild(script)
  })
}

function GoogleSignInButton({ clientId, text = 'signin_with', onCredential, disabled = false }) {
  const buttonRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    if (!clientId || disabled) {
      return undefined
    }

    const renderButton = async () => {
      try {
        await loadGoogleScript()

        if (!isMounted || !buttonRef.current || !window.google?.accounts?.id) {
          return
        }

        buttonRef.current.innerHTML = ''
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (credential) {
              onCredential(credential)
            }
          },
          auto_select: false
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'left',
          width: buttonRef.current.offsetWidth || 360
        })
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Failed to load Google sign-in')
        }
      }
    }

    renderButton()

    return () => {
      isMounted = false
    }
  }, [clientId, text, onCredential, disabled])

  if (!clientId) {
    return null
  }

  return (
    <div className="google-signin">
      <div ref={buttonRef} className="google-signin-button"></div>
      {error && <div className="error-message google-signin-error">{error}</div>}
    </div>
  )
}

export default GoogleSignInButton
