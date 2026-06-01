import { SignIn, SignUp } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { LogoWord } from '../components/Logo'

export default function Login({ mode = 'sign-in' }) {
  const isSignUp = mode === 'sign-up'
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center">
          <LogoWord size={30} />
        </Link>
        {isSignUp ? (
          <SignUp
            routing="path"
            path="/signup"
            signInUrl="/login"
            forceRedirectUrl="/dashboard"
          />
        ) : (
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/signup"
            forceRedirectUrl="/dashboard"
          />
        )}
      </div>
    </div>
  )
}
